"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { today, isValidDate, formatDateAr } from "@/lib/daily";
import { revalidatePath } from "next/cache";
import { cohortWindows, withinCohort, cohortWindowsLabel } from "@/lib/cohortTime";

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

  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { permits: true, halqa: { include: { cohort: true } } } });
  if (!student) return { error: "الطالب غير موجود." };
  const current = student.permits;

  // وقت الإذن ضمن دوام فوج الطالب
  const windows = cohortWindows(student.halqa?.cohort);
  for (const k of kinds) {
    if (!withinCohort(times[k], windows)) {
      return { error: `وقت ${KIND_LABELS[k]} خارج دوام فوج الطالب (${student.halqa?.cohort.name ?? ""}): ${cohortWindowsLabel(windows)}.` };
    }
  }

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
  await logAction(session.userId, `${editing ? "عدّل" : "أضاف"} ${label} للطالب ${await studentRef(studentId)}`);

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
  await logAction(session.userId, `حذف ${student.permits.map((p) => KIND_LABELS[p.kind]).join(" و")} للطالب ${await studentRef(studentId)}`);

  revalidatePath("/permits");
  return { ok: true };
}

/** إذن غياب «يوم» أو «فترة»: حضور الطالب فيها «إذن» لازم عند المدرّس */
export async function saveAbsencePermit(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || !canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const studentId = String(formData.get("studentId") || "");
  // تعديل إذن غياب قائم
  const absenceId = String(formData.get("absenceId") || "") || null;
  const mode = String(formData.get("mode") || "");
  const from = String(formData.get("from") || "");
  const to = mode === "day" ? from : String(formData.get("to") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500) || null;
  if (!studentId) return { error: "اختاروا الطالب أولًا." };
  if (mode !== "day" && mode !== "range") return { error: "اختاروا نوع الإذن." };
  if (!isValidDate(from) || !isValidDate(to)) return { error: mode === "day" ? "حدّدوا يوم الإذن." : "حدّدوا بداية الفترة ونهايتها." };
  if (to < from) return { error: "نهاية الفترة قبل بدايتها." };
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) return { error: "الطالب غير موجود." };
  if (absenceId) {
    const cur = await prisma.absencePermit.findUnique({ where: { id: absenceId } });
    if (!cur || cur.studentId !== studentId) return { error: "الإذن غير موجود." };
  }
  const overlap = await prisma.absencePermit.findFirst({ where: { studentId, from: { lte: to }, to: { gte: from }, ...(absenceId ? { NOT: { id: absenceId } } : {}) } });
  if (overlap) return { error: `لدى الطالب إذن غياب يتداخل مع هذه الأيام (${formatDateAr(overlap.from)}${overlap.to !== overlap.from ? ` — ${formatDateAr(overlap.to)}` : ""}).` };
  if (absenceId) await prisma.absencePermit.update({ where: { id: absenceId }, data: { from, to, note, setById: session.userId } });
  else await prisma.absencePermit.create({ data: { studentId, from, to, note, setById: session.userId } });
  await logAction(
    session.userId,
    `${absenceId ? "عدّل" : "أضاف"} إذن غياب للطالب ${await studentRef(studentId)}: ${from === to ? `يوم ${formatDateAr(from)}` : `من ${formatDateAr(from)} إلى ${formatDateAr(to)}`}`
  );
  revalidatePath("/permits");
  revalidatePath("/attendance");
  return { ok: true };
}

export async function deleteAbsencePermit(id: string): Promise<DeleteState> {
  const session = await getSession();
  if (!session || !canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const p = await prisma.absencePermit.findUnique({ where: { id } });
  if (!p) return { error: "الإذن غير موجود." };
  await prisma.absencePermit.delete({ where: { id } });
  await logAction(session.userId, `حذف إذن غياب الطالب ${await studentRef(p.studentId)} (${p.from === p.to ? formatDateAr(p.from) : `${formatDateAr(p.from)} — ${formatDateAr(p.to)}`})`);
  revalidatePath("/permits");
  revalidatePath("/attendance");
  return { ok: true };
}
