"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildStudentPreview, type StudentPreview } from "@/lib/reports";

/**
 * تقرير طالب للمدرّس — مشاهدة فقط: لا يُصدَر ولا يُحفظ في السجل ولا يُنزَّل PDF.
 * الطالب من طلاب حلقاته في أفواج حسابه النشط وحدها.
 */
export async function previewTeacherStudentReport(studentId: string, from: string, to: string): Promise<{ preview: StudentPreview } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!studentId) return { error: "اختاروا الطالب أولًا." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { halqa: { select: { teacherId: true, cohortId: true } } } });
  if (!student?.halqa || student.halqa.teacherId !== session.userId || !session.cohortIds.includes(student.halqa.cohortId)) {
    return { error: "هذا الطالب ليس من طلاب حلقاتك." };
  }

  const preview = await buildStudentPreview(studentId, from, to);
  if (!preview) return { error: "لم يُعثر على الطالب." };
  return { preview };
}
