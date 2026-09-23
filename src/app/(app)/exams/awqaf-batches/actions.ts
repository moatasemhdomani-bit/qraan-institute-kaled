"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { isValidDate } from "@/lib/daily";
import { awqafPassed, certStepLocked, type CertStep } from "@/lib/awqaf";
import crypto from "crypto";
import { uploadFile, mimeFromExt } from "@/lib/storage";

export type FormState = { error?: string; ok?: boolean; batchId?: string };

function canManage(session: { role: string } | null): session is { userId: string; role: string } {
  return !!session && (session.role === "ADMIN" || session.role === "DIRECTOR");
}

function revalidateAwqafPaths() {
  revalidatePath("/exams/awqaf-batches");
  revalidatePath("/exams/awqaf");
  revalidatePath("/parent");
}

export async function createAwqafBatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const date = String(formData.get("date") || "");
  if (!isValidDate(date)) return { error: "اختاروا تاريخ الدفعة." };

  let studentIds: string[] = [];
  try {
    studentIds = JSON.parse(String(formData.get("studentIdsJson") || "[]"));
  } catch {
    studentIds = [];
  }
  studentIds = Array.from(new Set(studentIds.filter(Boolean)));
  if (studentIds.length === 0) return { error: "اختاروا طالبًا واحدًا على الأقل." };

  const students = await prisma.student.findMany({ where: { id: { in: studentIds } } });

  // مسار كل طالب (حاضرًا/غيبًا) يُؤخذ من آخر ترشيح أوقاف ناجح له، ويُلقَط هنا لتثبيت حدّ نجاحه في هذه الدفعة
  const nominations = await prisma.exam.findMany({
    where: { type: "WAQF_NOMINATION", studentId: { in: studentIds } },
    orderBy: { date: "desc" },
    select: { studentId: true, nominationPresent: true },
  });
  const presentByStudent = new Map<string, boolean>();
  for (const n of nominations) if (!presentByStudent.has(n.studentId)) presentByStudent.set(n.studentId, n.nominationPresent ?? false);

  const batch = await prisma.awqafBatch.create({
    data: {
      date,
      createdById: session.userId,
      results: {
        create: studentIds.map((studentId) => ({ studentId, nominationPresent: presentByStudent.get(studentId) ?? false })),
      },
    },
  });

  await logAction(session.userId, `فتح دفعة سبر أوقاف بتاريخ ${date} — ${students.length} طالبًا`);
  revalidateAwqafPaths();
  return { ok: true, batchId: batch.id };
}

export async function saveAwqafScore(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const id = String(formData.get("id") || "");
  const scoreRaw = String(formData.get("score") || "");
  const score = scoreRaw === "" ? null : parseInt(scoreRaw, 10);
  if (score != null && (!Number.isFinite(score) || score < 0 || score > 100)) {
    return { error: "العلامة رقم من 0 إلى 100." };
  }

  const result = await prisma.awqafResult.findUnique({ where: { id }, include: { student: true, batch: true } });
  if (!result) return { error: "السجل غير موجود." };

  await prisma.awqafResult.update({ where: { id }, data: { score } });

  const passed = awqafPassed(score, result.nominationPresent);
  const passNote = passed == null ? "" : passed ? " — ناجح" : " — راسب";
  await logAction(session.userId, `أدخل علامة سبر الأوقاف للطالب «${result.student.name}»: ${score ?? "—"}${passNote}`);

  revalidateAwqafPaths();
  return { ok: true };
}

async function saveCertFile(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `cert-${crypto.randomUUID()}.${ext}`;
  return uploadFile(filename, bytes, mimeFromExt(ext));
}

const STEP_LABELS: Record<CertStep, string> = { arrived: "وصول الشهادة", archived: "أرشفة الشهادة", delivered: "تسليم الشهادة" };

export async function setCertStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const id = String(formData.get("id") || "");
  const step = String(formData.get("step") || "") as CertStep;
  const value = String(formData.get("value") || "") === "1";
  const file = formData.get("file");

  const result = await prisma.awqafResult.findUnique({ where: { id }, include: { student: true } });
  if (!result) return { error: "السجل غير موجود." };

  if (value && certStepLocked(step, result)) {
    return { error: `${STEP_LABELS[step]} مقفلة حتى تتحقق الخطوة السابقة.` };
  }
  if (step === "archived" && value && !(file instanceof File && file.size > 0) && !result.certFileUrl) {
    return { error: "ارفعوا ملف الشهادة الممسوحة لإتمام الأرشفة." };
  }

  const data: { certArrived?: boolean; certArchived?: boolean; certDelivered?: boolean; certFileUrl?: string } = {};
  if (step === "arrived") {
    data.certArrived = value;
    if (!value) { data.certArchived = false; data.certDelivered = false; }
  } else if (step === "archived") {
    data.certArchived = value;
    if (!value) data.certDelivered = false;
    if (file instanceof File && file.size > 0) data.certFileUrl = await saveCertFile(file);
  } else if (step === "delivered") {
    data.certDelivered = value;
  }

  await prisma.awqafResult.update({ where: { id }, data });
  await logAction(session.userId, `${value ? "أثبت" : "ألغى"} ${STEP_LABELS[step]} لشهادة الطالب «${result.student.name}»`);

  revalidateAwqafPaths();
  return { ok: true };
}

export async function bulkSetCertStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const batchId = String(formData.get("batchId") || "");
  const step = String(formData.get("step") || "") as CertStep;

  const results = await prisma.awqafResult.findMany({ where: { batchId } });
  const eligible = results.filter((r) => {
    if (awqafPassed(r.score, r.nominationPresent) !== true) return false;
    if (step === "arrived") return !r.certArrived;
    if (step === "archived") return r.certArrived && !r.certArchived;
    return r.certArchived && !r.certDelivered;
  });

  if (eligible.length === 0) return { error: "لا يوجد أحد مؤهَّل لهذه الخطوة الآن." };
  if (step === "archived" && eligible.some((r) => !r.certFileUrl)) {
    return { error: "بعض الطلاب بلا ملف شهادة مرفوع — ارفعوا الملف لكل طالب أولًا." };
  }

  const ids = eligible.map((r) => r.id);
  if (step === "arrived") await prisma.awqafResult.updateMany({ where: { id: { in: ids } }, data: { certArrived: true } });
  else if (step === "archived") await prisma.awqafResult.updateMany({ where: { id: { in: ids } }, data: { certArchived: true } });
  else await prisma.awqafResult.updateMany({ where: { id: { in: ids } }, data: { certDelivered: true } });

  await logAction(session.userId, `طبّق ${STEP_LABELS[step]} جماعيًا على ${eligible.length} طالبًا`);
  revalidateAwqafPaths();
  return { ok: true };
}
