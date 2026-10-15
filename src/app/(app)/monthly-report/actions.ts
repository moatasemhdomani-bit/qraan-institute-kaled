"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type NoteState = { error?: string; ok?: boolean };

/** ملاحظة التقرير الشهري للطالب — تبقى محفوظة حتى يعدّلها المدرّس أو الإدارة. */
export async function saveTeacherNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "غير مصرَّح لك بهذا الإجراء." };

  const studentId = String(formData.get("studentId") || "");
  const note = String(formData.get("note") || "").trim();
  if (!studentId) return { error: "بيانات ناقصة." };

  const student = await prisma.student.findFirst({ where: { id: studentId, halqa: { teacherId: session.userId } }, select: { id: true } });
  if (!student) return { error: "الطالب ليس في حلقاتك." };

  await prisma.student.update({ where: { id: studentId }, data: { reportNote: note || null } });

  revalidatePath("/monthly-report");
  revalidatePath("/reports/halaqat");
  return { ok: true };
}
