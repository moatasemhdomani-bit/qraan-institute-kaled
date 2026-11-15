"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { today } from "@/lib/daily";
import { logAction, studentRef } from "@/lib/audit";
import { CERTIFICATE_KINDS, CERTIFICATE_LABELS, type CertificateKindId } from "@/lib/certificate";
import { buildCertificateData, studentCertificateFields } from "@/lib/certificateServer";
import type { CertificateData } from "@/lib/certificate";

export type IssueResult = { error?: string; ids?: string[]; created?: number };

/**
 * ينشئ شهادة برقم التالي في تسلسل نوعها (لكل نوع تسلسله) — ويعيد المحاولة إن سبقه إصدار آخر إلى الرقم نفسه.
 */
async function createNumbered(data: { kind: CertificateKindId; studentId: string; examId?: string | null; prior?: boolean; dataJson: string; issuedById: string }) {
  for (let attempt = 0; ; attempt++) {
    const last = await prisma.issuedCertificate.aggregate({ where: { kind: data.kind }, _max: { number: true } });
    try {
      return await prisma.issuedCertificate.create({ data: { ...data, number: (last._max.number ?? 0) + 1 } });
    } catch (e) {
      const code = (e as { code?: string }).code;
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
      // تعارض على الرقم وحده يُعاد — أمّا شهادة الطالب نفسها (kind + studentId) فتُرمى
      if (code !== "P2002" || target.includes("studentId") || attempt >= 4) throw e;
    }
  }
}

/**
 * يُصدر شهادات النوع المختار للطلاب المحدَّدين: من صدرت شهادته سابقًا تُعاد شهادته نفسها (برقمها وتاريخ إصدارها،
 * وبياناته الحالية)، ومن لم تصدر له تُنشأ له شهادة برقم جديد. يُرجع معرّفات الشهادات بترتيب الطلاب.
 */
export async function issueCertificates(kind: CertificateKindId, studentIds: string[]): Promise<IssueResult> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!CERTIFICATE_KINDS.includes(kind)) return { error: "نوع شهادة غير معروف." };
  const ids = [...new Set(studentIds)];
  if (ids.length === 0) return { error: "اختاروا طالبًا واحدًا على الأقل." };

  const existing = await prisma.issuedCertificate.findMany({ where: { kind, studentId: { in: ids } }, select: { id: true, studentId: true } });
  const byStudent = new Map(existing.map((c) => [c.studentId, c.id]));
  const issueDate = today();
  let created = 0;

  for (const studentId of ids) {
    if (byStudent.has(studentId)) continue;
    const built = await buildCertificateData(kind, studentId, issueDate);
    if (!built) return { error: "أحد الطلاب المحدَّدين لم يعد مستحقًا لهذه الشهادة — حدّثوا الصفحة." };
    const cert =
      (await prisma.issuedCertificate.findUnique({ where: { kind_studentId: { kind, studentId } } })) ??
      (await createNumbered({ kind, studentId, examId: built.examId, dataJson: JSON.stringify(built.data), issuedById: session.userId }));
    byStudent.set(studentId, cert.id);
    created++;
    await logAction(session.userId, `أصدر «${CERTIFICATE_LABELS[kind]}» رقم ${cert.number} للطالب ${await studentRef(studentId)}`);
  }

  if (created) revalidatePath("/exams/awqaf-batches");
  return { ids: ids.map((s) => byStudent.get(s)!), created };
}

/**
 * «شهادة سابقة»: شهادة صدرت ورقيًا قبل الموقع — لطالب مسجّل (بياناته تُملأ تلقائيًا من سجله)، ومعها علامتها
 * لشهادة القراءة العربية، بلا تاريخ يُدخل (تُسجَّل بتاريخ إضافتها). رقمها التالي في تسلسل نوعها، وتُحفظ مع الشهادات فتُنزَّل ضمن الملف.
 */
export async function addPriorCertificate(kind: CertificateKindId, studentId: string, mark: number | null): Promise<IssueResult> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!CERTIFICATE_KINDS.includes(kind)) return { error: "نوع شهادة غير معروف." };
  // لا يُطلب تاريخ: تُسجَّل بتاريخ إضافتها
  const issueDate = today();
  if (kind === "ARABIC") {
    if (mark == null || !Number.isFinite(mark) || mark < 0 || mark > 100) return { error: "اكتبوا العلامة (من 100)." };
  }
  const fields = await studentCertificateFields(kind, studentId);
  if (!fields) return { error: "اختاروا طالبًا مسجّلًا في المعهد." };
  const existing = await prisma.issuedCertificate.findUnique({ where: { kind_studentId: { kind, studentId } }, select: { number: true } });
  if (existing) return { error: `للطالب «${CERTIFICATE_LABELS[kind]}» رقم ${existing.number} — لا تُضاف له شهادة ثانية من النوع نفسه.` };

  const data: CertificateData = { ...fields, mark: kind === "ARABIC" ? mark : null, examDate: issueDate, issueDate };
  const cert = await createNumbered({ kind, studentId, prior: true, dataJson: JSON.stringify(data), issuedById: session.userId });
  await logAction(session.userId, `أضاف «${CERTIFICATE_LABELS[kind]}» سابقة رقم ${cert.number} للطالب ${await studentRef(studentId)}`);
  revalidatePath("/exams/awqaf-batches");
  return { ids: [cert.id], created: 1 };
}

/** حذف «شهادة سابقة» أُضيفت بالغلط — الشهادات الصادرة من الموقع لا تُحذف */
export async function deletePriorCertificate(id: string): Promise<IssueResult> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const cert = await prisma.issuedCertificate.findUnique({ where: { id } });
  if (!cert) return { error: "لم يُعثر على الشهادة." };
  if (!cert.prior) return { error: "تُحذف الشهادات السابقة وحدها." };
  await prisma.issuedCertificate.delete({ where: { id } });
  await logAction(session.userId, `حذف «${CERTIFICATE_LABELS[cert.kind]}» السابقة رقم ${cert.number} للطالب ${await studentRef(cert.studentId)}`);
  revalidatePath("/exams/awqaf-batches");
  return { ids: [] };
}
