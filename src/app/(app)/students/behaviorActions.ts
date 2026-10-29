"use server";

import { prisma, nameWithNasab } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { dateOnly, formatDateAr } from "@/lib/daily";

export type BehaviorLogEntry = { id: string; previousValue: string; newValue: string; note: string; by: string; date: string };
export type BehaviorState = { error?: string; ok?: boolean; behavior?: string; logEntry?: BehaviorLogEntry };

export async function saveBehavior(_prev: BehaviorState, formData: FormData): Promise<BehaviorState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const studentId = String(formData.get("studentId") || "");
  const newValue = String(formData.get("value") || "");
  const note = String(formData.get("note") || "").trim();

  if (!studentId) return { error: "لم يُعثر على الطالب." };
  if (!newValue) return { error: "اختاروا درجة السلوك." };
  if (!note) return { error: "أي تغيير في سلوك الطالب — حتى العودة إلى «ممتاز» — يستوجب ملاحظة توضّح سببه." };

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return { error: "لم يُعثر على الطالب." };

  const previousValue = student.behavior;
  const [, log] = await prisma.$transaction([
    prisma.student.update({ where: { id: studentId }, data: { behavior: newValue } }),
    prisma.studentBehaviorLog.create({
      data: { studentId, previousValue, newValue, note, actorId: session.userId },
    }),
  ]);
  await logAction(session.userId, `غيّر سلوك الطالب ${await studentRef(studentId)} من «${previousValue}» إلى «${newValue}»: ${note}`);

  revalidatePath("/students");
  return {
    ok: true,
    behavior: newValue,
    logEntry: { id: log.id, previousValue, newValue, note, by: session.name, date: formatDateAr(dateOnly(log.createdAt)) },
  };
}

export type BehaviorEditResult = { error?: string; ok?: boolean; behavior?: string; log?: BehaviorLogEntry[] };

/** سجل سلوك الطالب كاملًا (الأحدث أولًا) وسلوكه الحالي — بعد تعديل تغيير سابق أو حذفه */
async function behaviorState(studentId: string): Promise<BehaviorEditResult> {
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: { behavior: true, behaviorLog: { include: { actor: { select: { name: true, familyName: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!s) return { error: "لم يُعثر على الطالب." };
  return {
    ok: true,
    behavior: s.behavior,
    log: s.behaviorLog.map((l) => ({
      id: l.id,
      previousValue: l.previousValue,
      newValue: l.newValue,
      note: l.note,
      by: nameWithNasab(l.actor.name, l.actor.familyName),
      date: formatDateAr(dateOnly(l.createdAt)),
    })),
  };
}

/**
 * تعديل تغيير سابق في سلوك الطالب: الدرجة والملاحظة. يبقى السجل متّسقًا — التغيير الذي يليه يبدأ من الدرجة الجديدة،
 * وإن كان هو الأحدث صار سلوك الطالب الحالي هو الدرجة الجديدة.
 */
export async function editBehaviorLog(id: string, newValue: string, rawNote: string): Promise<BehaviorEditResult> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const note = rawNote.trim();
  if (!newValue) return { error: "اختاروا درجة السلوك." };
  if (!note) return { error: "الملاحظة إلزامية — توضّح سبب التغيير." };
  const entry = await prisma.studentBehaviorLog.findUnique({ where: { id } });
  if (!entry) return { error: "لم يُعثر على هذا التغيير." };

  const next = await prisma.studentBehaviorLog.findFirst({ where: { studentId: entry.studentId, createdAt: { gt: entry.createdAt } }, orderBy: { createdAt: "asc" } });
  await prisma.$transaction(async (tx) => {
    await tx.studentBehaviorLog.update({ where: { id }, data: { newValue, note } });
    if (next) await tx.studentBehaviorLog.update({ where: { id: next.id }, data: { previousValue: newValue } });
    else await tx.student.update({ where: { id: entry.studentId }, data: { behavior: newValue } });
  });
  await logAction(
    session.userId,
    `عدّل تغيير سلوك الطالب ${await studentRef(entry.studentId)} (${formatDateAr(dateOnly(entry.createdAt))}): من «${entry.newValue}» إلى «${newValue}» — ${note}`
  );
  revalidatePath("/students");
  return behaviorState(entry.studentId);
}

/**
 * حذف تغيير سابق في سلوك الطالب: التغيير الذي يليه يبدأ من حيث بدأ المحذوف،
 * وإن كان المحذوف هو الأحدث عاد سلوك الطالب إلى ما كان قبله.
 */
export async function deleteBehaviorLog(id: string): Promise<BehaviorEditResult> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const entry = await prisma.studentBehaviorLog.findUnique({ where: { id } });
  if (!entry) return { error: "لم يُعثر على هذا التغيير." };

  const next = await prisma.studentBehaviorLog.findFirst({ where: { studentId: entry.studentId, createdAt: { gt: entry.createdAt } }, orderBy: { createdAt: "asc" } });
  await prisma.$transaction(async (tx) => {
    await tx.studentBehaviorLog.delete({ where: { id } });
    if (next) await tx.studentBehaviorLog.update({ where: { id: next.id }, data: { previousValue: entry.previousValue } });
    else await tx.student.update({ where: { id: entry.studentId }, data: { behavior: entry.previousValue } });
  });
  await logAction(
    session.userId,
    `حذف تغيير سلوك الطالب ${await studentRef(entry.studentId)} (${formatDateAr(dateOnly(entry.createdAt))}): «${entry.previousValue}» ← «${entry.newValue}» — ${entry.note}`
  );
  revalidatePath("/students");
  return behaviorState(entry.studentId);
}
