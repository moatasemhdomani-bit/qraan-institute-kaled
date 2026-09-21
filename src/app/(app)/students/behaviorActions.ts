"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { dateOnly, formatDateAr } from "@/lib/daily";

export type BehaviorLogEntry = { previousValue: string; newValue: string; note: string; by: string; date: string };
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
  await logAction(session.userId, `غيّر سلوك الطالب «${student.name}» من «${previousValue}» إلى «${newValue}»: ${note}`);

  revalidatePath("/students");
  return {
    ok: true,
    behavior: newValue,
    logEntry: { previousValue, newValue, note, by: session.name, date: formatDateAr(dateOnly(log.createdAt)) },
  };
}
