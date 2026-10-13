import { prisma } from "./db";

/** Every mutation an ADMIN or DIRECTOR performs is written here — read on the Audit screen (§ سجل التدقيق). */
export async function logAction(actorId: string, action: string) {
  await prisma.auditLog.create({ data: { actorId, action } });
}

/** الطالب في سجل التدقيق: اسمه مع نسبته ورقمه — «عمر محمود السيد» #1002 */
export async function studentRef(studentId: string): Promise<string> {
  const s = await prisma.student.findUnique({ where: { id: studentId }, select: { name: true, studentNo: true } });
  return s ? `«${s.name}» #${s.studentNo}` : "«—»";
}
