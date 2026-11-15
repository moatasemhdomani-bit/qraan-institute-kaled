import { prisma } from "./db";

export { SUMMONS_LOCK_MESSAGE } from "./summonsText";

/** الطلاب الذين لهم استدعاء ولي أمر لم يحضر له بعد — تُقفل شاشتا تسميعهم وحضورهم عند المدرّس */
export async function summonedStudentIds(studentIds: string[]): Promise<Set<string>> {
  if (!studentIds.length) return new Set();
  const rows = await prisma.guardianSummons.findMany({
    where: { studentId: { in: studentIds }, attendedAt: null },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  return new Set(rows.map((r) => r.studentId));
}
