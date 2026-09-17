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

function canManage(session: { userId: string; role: string }) {
  return session.role === "TEACHER" || session.role === "ADMIN" || session.role === "DIRECTOR";
}

/** يمنع المدرّس من إضافة/تعديل/حذف إذن لطالب خارج حلقاته. */
async function studentInScope(studentId: string, session: { userId: string; role: string }): Promise<boolean> {
  if (session.role !== "TEACHER") return true;
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { halqa: true } });
  return !!student?.halqa && student.halqa.teacherId === session.userId;
}

export async function savePermit(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || !canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const id = String(formData.get("id") || "") || null;
  const studentId = String(formData.get("studentId") || "") || null;
  const kind = String(formData.get("kind") || "");
  const time = String(formData.get("time") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;

  if (kind !== "ENTRY" && kind !== "EXIT") return { error: "اختاروا نوع الإذن: دخول أو خروج." };
  if (!TIME_RE.test(time)) return { error: "اكتبوا وقت الإذن بصيغة 24 ساعة، مثل 09:15 أو 11:30." };

  let existing = null;
  if (id) {
    existing = await prisma.permit.findUnique({ where: { id } });
    if (!existing) return { error: "الإذن غير موجود." };
    if (!(await studentInScope(existing.studentId, session))) {
      return { error: "غير مصرَّح لك بتعديل إذن لطالب خارج حلقاتك." };
    }
  } else {
    if (!studentId) return { error: "اختاروا الطالب أولًا." };
    if (!(await studentInScope(studentId, session))) {
      return { error: "غير مصرَّح لك بإضافة إذن لطالب خارج حلقاتك." };
    }
  }

  const finalStudentId = existing?.studentId ?? studentId!;

  const conflict = await prisma.permit.findUnique({
    where: { studentId_kind: { studentId: finalStudentId, kind } },
  });
  if (conflict && conflict.id !== id) {
    return { error: `لدى هذا الطالب ${KIND_LABELS[kind]} مسجَّل بالفعل — عدّلوه من القائمة بدل إضافة إذن جديد.` };
  }

  const student = await prisma.student.findUnique({ where: { id: finalStudentId } });

  if (id) {
    await prisma.permit.update({ where: { id }, data: { kind, time, note, setById: session.userId } });
    await logAction(session.userId, `عدّل ${KIND_LABELS[kind]} للطالب «${student?.name ?? ""}»`);
  } else {
    await prisma.permit.create({
      data: { studentId: finalStudentId, kind, time, note, since: today(), setById: session.userId },
    });
    await logAction(session.userId, `أضاف ${KIND_LABELS[kind]} للطالب «${student?.name ?? ""}»`);
  }

  revalidatePath("/permits");
  return { ok: true };
}

export async function deletePermit(id: string): Promise<DeleteState> {
  const session = await getSession();
  if (!session || !canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const existing = await prisma.permit.findUnique({ where: { id }, include: { student: true } });
  if (!existing) return { error: "الإذن غير موجود." };
  if (!(await studentInScope(existing.studentId, session))) {
    return { error: "غير مصرَّح لك بحذف إذن لطالب خارج حلقاتك." };
  }

  await prisma.permit.delete({ where: { id } });
  await logAction(session.userId, `حذف ${KIND_LABELS[existing.kind]} للطالب «${existing.student.name}»`);

  revalidatePath("/permits");
  return { ok: true };
}
