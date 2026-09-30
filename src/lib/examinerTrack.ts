import { prisma } from "./db";
import type { TrackId } from "./track";

/**
 * نوع ما يختبره المستخدم: المختبِر يرى حلقات نوعه وطلابه فقط (قرآن / قراءة عربية)؛
 * المدير وغيره يرون الكل (null = بلا تقييد).
 */
export async function examinerTrack(session: { role: string; userId: string }): Promise<TrackId | null> {
  if (session.role !== "EXAMINER") return null;
  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { track: true } });
  return me?.track ?? "QURAN";
}
