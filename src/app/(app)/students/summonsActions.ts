"use server";

import { prisma, nameWithNasab } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { dateOnly, formatDateAr } from "@/lib/daily";
import { invalidateNotifications } from "@/lib/notifications";
import type { BehaviorLogEntry } from "./behaviorActions";

export type SummonsEntry = { id: string; reason: string; by: string; date: string; attended: boolean; attendedDate: string };
export type SummonsResult = { error?: string; ok?: boolean; summonses?: SummonsEntry[]; behavior?: string; logEntry?: BehaviorLogEntry };

const BEHAVIOR = ["ممتاز", "جيد جدًا", "جيد", "ضعيف"];

async function staff() {
  const session = await getSession();
  return session && (session.role === "DIRECTOR" || session.role === "ADMIN") ? session : null;
}

/** استدعاءات الطالب (الأحدث أولًا) */
async function listOf(studentId: string): Promise<SummonsEntry[]> {
  const rows = await prisma.guardianSummons.findMany({
    where: { studentId },
    include: { by: { select: { name: true, familyName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    by: nameWithNasab(r.by.name, r.by.familyName),
    date: formatDateAr(dateOnly(r.createdAt)),
    attended: r.attendedAt != null,
    attendedDate: r.attendedAt ? formatDateAr(dateOnly(r.attendedAt)) : "",
  }));
}

function changed(studentId: string) {
  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/recitation");
  invalidateNotifications();
  return listOf(studentId);
}

/**
 * استدعاء ولي أمر بسبب إلزامي — ومع behavior: يُعدَّل سلوك الطالب ويُحفظ في سجل السلوك بالسبب نفسه.
 * ما دام لم يحضر ولي الأمر تُقفل شاشتا تسميع الطالب وحضوره عند مدرّسه.
 */
export async function addSummons(studentId: string, rawReason: string, behavior: string | null): Promise<SummonsResult> {
  const session = await staff();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const reason = rawReason.trim();
  if (!reason) return { error: "سبب الاستدعاء إلزامي." };
  if (reason.length > 500) return { error: "السبب طويل — 500 حرف على الأكثر." };
  if (behavior !== null && !BEHAVIOR.includes(behavior)) return { error: "اختاروا درجة السلوك." };
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { behavior: true } });
  if (!student) return { error: "لم يُعثر على الطالب." };

  const previousValue = student.behavior;
  const log = await prisma.$transaction(async (tx) => {
    await tx.guardianSummons.create({ data: { studentId, reason, byId: session.userId } });
    if (behavior === null) return null;
    await tx.student.update({ where: { id: studentId }, data: { behavior } });
    return tx.studentBehaviorLog.create({ data: { studentId, previousValue, newValue: behavior, note: reason, actorId: session.userId } });
  });
  const ref = await studentRef(studentId);
  await logAction(session.userId, `استدعى ولي أمر الطالب ${ref}: ${reason}`);
  if (log) await logAction(session.userId, `غيّر سلوك الطالب ${ref} من «${previousValue}» إلى «${behavior}»: ${reason}`);

  return {
    ok: true,
    summonses: await changed(studentId),
    ...(log
      ? {
          behavior: behavior as string,
          logEntry: { id: log.id, previousValue, newValue: behavior as string, note: reason, by: session.name, date: formatDateAr(dateOnly(log.createdAt)) },
        }
      : {}),
  };
}

/** «حضر ولي أمره» (أو التراجع عنه) */
export async function setSummonsAttended(id: string, attended: boolean): Promise<SummonsResult> {
  const session = await staff();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const s = await prisma.guardianSummons.findUnique({ where: { id } });
  if (!s) return { error: "لم يُعثر على الاستدعاء." };
  await prisma.guardianSummons.update({ where: { id }, data: { attendedAt: attended ? new Date() : null } });
  await logAction(
    session.userId,
    attended ? `سجّل حضور ولي أمر الطالب ${await studentRef(s.studentId)} للاستدعاء: ${s.reason}` : `ألغى حضور ولي أمر الطالب ${await studentRef(s.studentId)} للاستدعاء: ${s.reason}`
  );
  return { ok: true, summonses: await changed(s.studentId) };
}

/** حذف استدعاء سُجّل بالغلط */
export async function deleteSummons(id: string): Promise<SummonsResult> {
  const session = await staff();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const s = await prisma.guardianSummons.findUnique({ where: { id } });
  if (!s) return { error: "لم يُعثر على الاستدعاء." };
  await prisma.guardianSummons.delete({ where: { id } });
  await logAction(session.userId, `حذف استدعاء ولي أمر الطالب ${await studentRef(s.studentId)}: ${s.reason}`);
  return { ok: true, summonses: await changed(s.studentId) };
}

/** منع الطالب من النشاط أو إلغاء المنع — الإدارة والمدير */
export async function setActivityBan(studentId: string, banned: boolean): Promise<{ error?: string; ok?: boolean }> {
  const session = await staff();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const r = await prisma.student.updateMany({ where: { id: studentId }, data: { activityBanned: banned } });
  if (r.count === 0) return { error: "لم يُعثر على الطالب." };
  await logAction(session.userId, `${banned ? "منع" : "إلغاء منع"} الطالب ${await studentRef(studentId)} ${banned ? "من" : "من"} النشاط`);
  revalidatePath("/students");
  revalidatePath("/activity-stars");
  return { ok: true };
}
