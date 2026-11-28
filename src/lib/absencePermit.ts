import { prisma } from "./db";

/**
 * الطلاب الذين لهم إذن غياب (يوم أو فترة) يشمل هذا التاريخ —
 * حضورهم يومها «إذن» لازم عند المدرّس لا يُغيَّر.
 */
export async function excusedStudentIds(studentIds: string[], date: string): Promise<Set<string>> {
  if (!studentIds.length) return new Set();
  const rows = await prisma.absencePermit.findMany({
    where: { studentId: { in: studentIds }, from: { lte: date }, to: { gte: date } },
    select: { studentId: true },
  });
  return new Set(rows.map((r) => r.studentId));
}
