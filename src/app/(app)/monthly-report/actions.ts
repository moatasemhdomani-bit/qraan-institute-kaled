"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type NoteState = { error?: string; ok?: boolean };

export async function saveTeacherNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "غير مصرَّح لك بهذا الإجراء." };

  const studentId = String(formData.get("studentId") || "");
  const month = String(formData.get("month") || "");
  const note = String(formData.get("note") || "");

  if (!studentId || !month) return { error: "بيانات ناقصة." };

  await prisma.teacherMonthlyNote.upsert({
    where: { studentId_month: { studentId, month } },
    update: { note },
    create: { studentId, month, note },
  });

  revalidatePath("/monthly-report");
  return { ok: true };
}
