"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { STAR_MAX, starKindLabel, type StarKind } from "@/lib/stars";

export type StarResult = { error?: string; ok?: boolean };

const isAdmin = (role: string) => role === "DIRECTOR" || role === "ADMIN";

function checkInput(kind: string, amount: number): string | null {
  if (kind !== "CHARGE" && kind !== "WITHDRAW") return "اختاروا العملية: شحن أو سحب.";
  if (!Number.isInteger(amount) || amount < 1) return "اكتبوا عدد النجوم (نجمة واحدة على الأقل).";
  if (amount > STAR_MAX) return `أكبر عدد في العملية الواحدة ${STAR_MAX} نجمة.`;
  return null;
}

/** خطأ داخل المعاملة يُعاد للمستخدم كما هو */
class StarError extends Error {}

function done() {
  revalidatePath("/stars");
  revalidatePath("/my-stars");
}

/** الإدارة: شحن رصيد طالب أو سحبه مباشرة — لا يمسّ رصيد حلقته. */
export async function adminStudentStars(input: { studentId: string; kind: StarKind; amount: number }): Promise<StarResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) return { error: "إدارة النجوم من صلاحية الإدارة." };
  const bad = checkInput(input.kind, input.amount);
  if (bad) return { error: bad };

  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { name: true, halqaId: true } });
  if (!student) return { error: "الطالب غير موجود." };

  try {
    await prisma.$transaction(async (tx) => {
      if (input.kind === "WITHDRAW") {
        const r = await tx.student.updateMany({ where: { id: input.studentId, stars: { gte: input.amount } }, data: { stars: { decrement: input.amount } } });
        if (r.count === 0) throw new StarError("رصيد الطالب لا يكفي لهذا السحب.");
      } else {
        await tx.student.update({ where: { id: input.studentId }, data: { stars: { increment: input.amount } } });
      }
      await tx.starTxn.create({
        data: {
          kind: input.kind,
          amount: input.amount,
          studentId: input.studentId,
          halqaId: student.halqaId,
          byId: session.userId,
          byRole: session.role,
        },
      });
    });
  } catch (e) {
    if (e instanceof StarError) return { error: e.message };
    throw e;
  }
  await logAction(session.userId, `${starKindLabel(input.kind)} ${input.amount} نجمة للطالب ${await studentRef(input.studentId)}`);
  done();
  return { ok: true };
}

/** الإدارة: «نجوم الحلقات» — شحن رصيد حلقة أو أكثر أو سحبه (العدد نفسه لكل حلقة مختارة). */
export async function adminHalqaStars(input: { halqaIds: string[]; kind: StarKind; amount: number }): Promise<StarResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) return { error: "إدارة النجوم من صلاحية الإدارة." };
  const bad = checkInput(input.kind, input.amount);
  if (bad) return { error: bad };

  const ids = [...new Set(input.halqaIds)];
  if (ids.length === 0) return { error: "اختاروا حلقة واحدة على الأقل." };
  const halaqat = await prisma.halqa.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, stars: true } });
  if (halaqat.length !== ids.length) return { error: "إحدى الحلقات المختارة غير موجودة." };
  const all = halaqat.length === (await prisma.halqa.count());

  if (input.kind === "WITHDRAW") {
    const short = halaqat.filter((h) => h.stars < input.amount);
    if (short.length) {
      return { error: `رصيد ${short.length === 1 ? "الحلقة" : "هذه الحلقات"} لا يكفي لسحب ${input.amount}: ${short.map((h) => `${h.name} (${h.stars})`).join("، ")}.` };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const h of halaqat) {
        if (input.kind === "WITHDRAW") {
          const r = await tx.halqa.updateMany({ where: { id: h.id, stars: { gte: input.amount } }, data: { stars: { decrement: input.amount } } });
          if (r.count === 0) throw new StarError(`رصيد الحلقة «${h.name}» لا يكفي لهذا السحب.`);
        } else {
          await tx.halqa.update({ where: { id: h.id }, data: { stars: { increment: input.amount } } });
        }
      }
      await tx.starTxn.createMany({
        data: halaqat.map((h) => ({
          kind: input.kind,
          amount: input.amount,
          halqaId: h.id,
          byId: session.userId,
          byRole: session.role,
        })),
      });
    });
  } catch (e) {
    if (e instanceof StarError) return { error: e.message };
    throw e;
  }
  await logAction(
    session.userId,
    `${starKindLabel(input.kind)} ${input.amount} نجمة ${all ? `لكل الحلقات (${halaqat.length})` : halaqat.length === 1 ? `لرصيد الحلقة ${halaqat[0].name}` : `لكل من الحلقات: ${halaqat.map((h) => h.name).join("، ")}`}`
  );
  done();
  return { ok: true };
}

/**
 * المدرّس: يصرف من رصيد حلقته على أحد طلابها (شحن)، أو يسحب من الطالب فتعود النجوم إلى رصيد الحلقة.
 * رصيد كل حلقة لا يُصرف إلا لطلابها.
 */
export async function teacherStudentStars(input: { studentId: string; kind: StarKind; amount: number }): Promise<StarResult> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "متابعة النجوم من صلاحية المدرّس." };
  const bad = checkInput(input.kind, input.amount);
  if (bad) return { error: bad };

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { name: true, halqa: { select: { id: true, teacherId: true, cohortId: true } } },
  });
  const halqa = student?.halqa;
  if (!student || !halqa || halqa.teacherId !== session.userId || !session.cohortIds.includes(halqa.cohortId)) {
    return { error: "هذا الطالب ليس في إحدى حلقاتك." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (input.kind === "CHARGE") {
        const r = await tx.halqa.updateMany({ where: { id: halqa.id, stars: { gte: input.amount } }, data: { stars: { decrement: input.amount } } });
        if (r.count === 0) throw new StarError("رصيد نجوم الحلقة لا يكفي — تشحنه الإدارة.");
        await tx.student.update({ where: { id: input.studentId }, data: { stars: { increment: input.amount } } });
      } else {
        const r = await tx.student.updateMany({ where: { id: input.studentId, stars: { gte: input.amount } }, data: { stars: { decrement: input.amount } } });
        if (r.count === 0) throw new StarError("رصيد الطالب لا يكفي لهذا السحب.");
        await tx.halqa.update({ where: { id: halqa.id }, data: { stars: { increment: input.amount } } });
      }
      await tx.starTxn.create({
        data: {
          kind: input.kind,
          amount: input.amount,
          studentId: input.studentId,
          halqaId: halqa.id,
          fromPool: true,
          byId: session.userId,
          byRole: session.role,
        },
      });
    });
  } catch (e) {
    if (e instanceof StarError) return { error: e.message };
    throw e;
  }
  await logAction(session.userId, `${starKindLabel(input.kind)} ${input.amount} نجمة للطالب ${await studentRef(input.studentId)} من رصيد الحلقة`);
  done();
  return { ok: true };
}

/** مسؤول النشاط: يسحب النجوم من أي طالب في المعهد مقابل دخوله النشاط — لا تعود إلى رصيد الحلقة. */
export async function activityWithdrawStars(input: { studentId: string; amount: number }): Promise<StarResult> {
  const session = await getSession();
  if (!session || session.role !== "ACTIVITY_OFFICER") return { error: "سحب نجوم النشاط من صلاحية مسؤول النشاط." };
  const bad = checkInput("WITHDRAW", input.amount);
  if (bad) return { error: bad };

  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { name: true, halqaId: true, active: true } });
  if (!student) return { error: "الطالب غير موجود." };
  if (!student.active) return { error: "الطالب منقطع." };

  try {
    await prisma.$transaction(async (tx) => {
      const r = await tx.student.updateMany({ where: { id: input.studentId, stars: { gte: input.amount } }, data: { stars: { decrement: input.amount } } });
      if (r.count === 0) throw new StarError("رصيد الطالب لا يكفي.");
      await tx.starTxn.create({
        data: {
          kind: "WITHDRAW",
          amount: input.amount,
          studentId: input.studentId,
          halqaId: student.halqaId,
          byId: session.userId,
          byRole: session.role,
        },
      });
    });
  } catch (e) {
    if (e instanceof StarError) return { error: e.message };
    throw e;
  }
  await logAction(session.userId, `سحب ${input.amount} نجمة من الطالب ${await studentRef(input.studentId)} للنشاط`);
  done();
  revalidatePath("/activity-stars");
  return { ok: true };
}

/** مسؤول النشاط: إعادة نجوم سحبها بالغلط — لعملية سحب من عملياته هو، مرة واحدة، بالعدد نفسه. */
export async function activityReturnStars(txnId: string): Promise<StarResult> {
  const session = await getSession();
  if (!session || session.role !== "ACTIVITY_OFFICER") return { error: "إعادة نجوم النشاط من صلاحية مسؤول النشاط." };

  const txn = await prisma.starTxn.findUnique({
    where: { id: txnId },
    include: { reversedBy: { select: { id: true } }, student: { select: { name: true, halqaId: true } } },
  });
  if (!txn || txn.byId !== session.userId || txn.byRole !== "ACTIVITY_OFFICER" || txn.kind !== "WITHDRAW" || !txn.studentId || !txn.student) {
    return { error: "لا يمكن إعادة هذه العملية." };
  }
  if (txn.reversedBy) return { error: "أُعيدت نجوم هذه العملية من قبل." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id: txn.studentId as string }, data: { stars: { increment: txn.amount } } });
      await tx.starTxn.create({
        data: {
          kind: "CHARGE",
          amount: txn.amount,
          studentId: txn.studentId,
          halqaId: txn.student?.halqaId ?? null,
          byId: session.userId,
          byRole: session.role,
          reason: "إعادة نجوم سُحبت بالغلط",
          reversesId: txn.id,
        },
      });
    });
  } catch (e) {
    // سباق نادر: أُعيدت العملية نفسها مرتين في اللحظة ذاتها (القيد الفريد على reversesId)
    if ((e as { code?: string }).code === "P2002") return { error: "أُعيدت نجوم هذه العملية من قبل." };
    throw e;
  }
  await logAction(session.userId, `أعاد ${txn.amount} نجمة سُحبت بالغلط من الطالب ${await studentRef(txn.studentId as string)}`);
  done();
  revalidatePath("/activity-stars");
  return { ok: true };
}
