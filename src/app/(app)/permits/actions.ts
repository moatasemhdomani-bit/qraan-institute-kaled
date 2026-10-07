"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { today } from "@/lib/daily";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: boolean };
export type DeleteState = { error?: string; ok?: boolean };

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;
const KIND_LABELS: Record<string, string> = { ENTRY: "إذن دخول", EXIT: "إذن خروج" };
const KINDS = ["ENTRY", "EXIT"] as const;

/** إضافة الإذن وتعديله وحذفه للإدارة وحدها — المدرّس يشاهد أذونات طلابه فقط. */
function canManage(session: { userId: string; role: string }) {
  return session.role === "ADMIN" || session.role === "DIRECTOR";
}

/**
 * يحفظ أذونات الطالب: دخول أو خروج أو كلاهما معًا — لكل نوع وقته، والأيام والسبب مشتركة بينهما.
 * في التعديل: النوع الذي أُلغي اختياره يُحذف إذنه.
 */
export async function savePermit(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || !canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const editing = String(formData.get("editing") || "") === "1";
  const studentId = String(formData.get("studentId") || "");
  const kinds = KINDS.filter((k) => formData.get(`kind_${k}`) === "1");
  const times: Record<string, string> = {
    ENTRY: String(formData.get("entryTime") || "").trim(),
    EXIT: String(formData.get("exitTime") || "").trim(),
  };
  const note = String(formData.get("note") || "").trim() || null;

  if (!studentId) return { error: "اختاروا الطالب أولًا." };
  if (kinds.length === 0) return { error: "اختاروا نوع الإذن: دخول أو خروج أو كليهما." };

  // أيام الإذن: من أيام الدوام الرسمية وحدها، يوم واحد على الأقل
  let days: string[] = [];
  try {
    days = JSON.parse(String(formData.get("daysJson") || "[]"));
  } catch {
    days = [];
  }
  const workRow = await prisma.workingDays.findUnique({ where: { id: 1 } });
  let workDays: string[] = [];
  try {
    workDays = workRow ? JSON.parse(workRow.days) : [];
  } catch {
    workDays = [];
  }
  days = workDays.filter((d) => days.includes(d));
  if (days.length === 0) return { error: "اختاروا يومًا واحدًا على الأقل من أيام الإذن." };
  for (const k of kinds) {
    if (!TIME_RE.test(times[k])) return { error: k === "ENTRY" ? "حدّدوا الوقت الذي يدخل فيه الطالب." : "حدّدوا الوقت الذي يخرج فيه الطالب." };
  }
  if (kinds.length === 2 && times.EXIT <= times.ENTRY) {
    return { error: "وقت الخروج يجب أن يكون بعد وقت الدخول." };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { permits: true } });
  if (!student) return { error: "الطالب غير موجود." };
  const current = student.permits;

  if (!editing) {
    const dup = current.find((p) => kinds.includes(p.kind));
    if (dup) return { error: `لدى هذا الطالب ${KIND_LABELS[dup.kind]} مسجَّل بالفعل — عدّلوه من القائمة بدل إضافة إذن جديد.` };
  }

  await prisma.$transaction([
    ...kinds.map((kind) =>
      prisma.permit.upsert({
        where: { studentId_kind: { studentId, kind } },
        update: { time: times[kind], note, days, setById: session.userId },
        create: { studentId, kind, time: times[kind], note, days, since: today(), setById: session.userId },
      })
    ),
    // في التعديل: النوع الملغى يُحذف
    ...(editing ? current.filter((p) => !kinds.includes(p.kind)).map((p) => prisma.permit.delete({ where: { id: p.id } })) : []),
  ]);

  const label = kinds.map((k) => KIND_LABELS[k]).join(" و");
  await logAction(session.userId, `${editing ? "عدّل" : "أضاف"} ${label} للطالب «${student.name}»`);

  revalidatePath("/permits");
  return { ok: true };
}

/** يحذف كل أذونات الطالب (الدخول والخروج معًا). */
export async function deleteStudentPermits(studentId: string): Promise<DeleteState> {
  const session = await getSession();
  if (!session || !canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { permits: true } });
  if (!student || student.permits.length === 0) return { error: "الإذن غير موجود." };

  await prisma.permit.deleteMany({ where: { studentId } });
  await logAction(session.userId, `حذف ${student.permits.map((p) => KIND_LABELS[p.kind]).join(" و")} للطالب «${student.name}»`);

  revalidatePath("/permits");
  return { ok: true };
}
