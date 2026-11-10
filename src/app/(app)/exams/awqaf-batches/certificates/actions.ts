"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { today } from "@/lib/daily";
import { logAction, studentRef } from "@/lib/audit";
import { CERTIFICATE_KINDS, CERTIFICATE_LABELS, type CertificateKindId } from "@/lib/certificate";
import { buildCertificateData } from "@/lib/certificateServer";

export type IssueResult = { error?: string; ids?: string[]; created?: number };

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
    const cert = await prisma.issuedCertificate.upsert({
      where: { kind_studentId: { kind, studentId } },
      create: { kind, studentId, examId: built.examId, dataJson: JSON.stringify(built.data), issuedById: session.userId },
      update: {},
    });
    byStudent.set(studentId, cert.id);
    created++;
    await logAction(session.userId, `أصدر «${CERTIFICATE_LABELS[kind]}» رقم ${cert.number} للطالب ${await studentRef(studentId)}`);
  }

  if (created) revalidatePath("/exams/awqaf-batches");
  return { ids: ids.map((s) => byStudent.get(s)!), created };
}
