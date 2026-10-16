import { prisma } from "./db";
import type { Role } from "@prisma/client";
import { formatDateTimeAr } from "./daily";
import { ROLE_LABELS } from "./ui";
import type { StarKind, StarTxnRow } from "./stars";

/** ما يُقرأ مع كل عملية نجوم لعرضها في الأرشيف */
export const STAR_TXN_INCLUDE = {
  student: { select: { name: true, studentNo: true } },
  halqa: { select: { name: true } },
  by: { select: { name: true } },
  officer: { select: { name: true } },
  reversedBy: { select: { id: true } },
} as const;

type TxnWithInclude = {
  id: string;
  createdAt: Date;
  kind: string;
  amount: number;
  halqaId: string | null;
  studentId: string | null;
  byId: string;
  officerId: string | null;
  officer: { name: string } | null;
  fromPool: boolean;
  byRole: string;
  reason: string | null;
  reversesId: string | null;
  student: { name: string; studentNo: number } | null;
  halqa: { name: string } | null;
  by: { name: string };
  reversedBy: { id: string } | null;
};

/** «الجهة المانحة» في الأرشيف */
export function starActorLabel(role: string): string {
  if (role === "TEACHER") return "المدرّس";
  return ROLE_LABELS[role] ?? "الإدارة";
}

export function starTxnRow(t: TxnWithInclude): StarTxnRow {
  return {
    id: t.id,
    at: formatDateTimeAr(t.createdAt),
    kind: t.kind as StarKind,
    amount: t.amount,
    studentId: t.studentId,
    studentName: t.student?.name ?? null,
    studentNo: t.student?.studentNo ?? null,
    halqaId: t.halqaId,
    halqaName: t.halqa?.name ?? null,
    byId: t.byId,
    byName: t.by.name,
    officerId: t.officerId,
    officerName: t.officer?.name ?? null,
    byLabel: starActorLabel(t.byRole),
    fromPool: t.fromPool,
    reason: t.reason,
    isReturn: t.reversesId != null,
    returned: t.reversedBy != null,
  };
}

/** الطالب المنقطع يصبح رصيد نجومه صفرًا — ويُسجَّل ذلك سحبًا في الأرشيف. */
export async function zeroStudentStars(studentId: string, byId: string, byRole: Role): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.student.findUnique({ where: { id: studentId }, select: { stars: true, halqaId: true } });
    if (!s || s.stars <= 0) return;
    await tx.student.update({ where: { id: studentId }, data: { stars: 0 } });
    await tx.starTxn.create({
      data: { kind: "WITHDRAW", amount: s.stars, studentId, halqaId: s.halqaId, byId, byRole, reason: "تحويل الطالب إلى «منقطع»" },
    });
  });
}

/** مكافأة نجوم تلقائية (مثل النجاح في مرحلة أو مستوى من السنة النبوية) — لا تمسّ رصيد الحلقة، وتُسجَّل في الأرشيف. */
export async function awardStars(studentId: string, amount: number, reason: string, byId: string, byRole: Role): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.student.update({ where: { id: studentId }, data: { stars: { increment: amount } }, select: { halqaId: true } });
    await tx.starTxn.create({ data: { kind: "CHARGE", amount, studentId, halqaId: s.halqaId, byId, byRole, reason } });
  });
}

/**
 * نجوم مختبر الحديث: موجبة تُودَع، وسالبة تُسحب بقدر ما في الرصيد (الرصيد صفر يُعفى). لا تمسّ رصيد الحلقة.
 * يُرجع ما تغيّر فعلًا في الرصيد.
 */
export async function applyStars(studentId: string, n: number, reason: string, byId: string, byRole: Role): Promise<number> {
  if (!n) return 0;
  if (n > 0) {
    await awardStars(studentId, n, reason, byId, byRole);
    return n;
  }
  return prisma.$transaction(async (tx) => {
    const s = await tx.student.findUnique({ where: { id: studentId }, select: { stars: true, halqaId: true } });
    const take = Math.min(s?.stars ?? 0, -n);
    if (!s || take <= 0) return 0;
    await tx.student.update({ where: { id: studentId }, data: { stars: { decrement: take } } });
    await tx.starTxn.create({ data: { kind: "WITHDRAW", amount: take, studentId, halqaId: s.halqaId, byId, byRole, reason } });
    return -take;
  });
}
