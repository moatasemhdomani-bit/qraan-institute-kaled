import { prisma } from "./db";

/** Every mutation an ADMIN or DIRECTOR performs is written here — read on the Audit screen (§ سجل التدقيق). */
export async function logAction(actorId: string, action: string) {
  await prisma.auditLog.create({ data: { actorId, action } });
}
