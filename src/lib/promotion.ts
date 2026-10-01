import { prisma } from "./db";
import { logAction } from "./audit";
import { nextLevel, TRACK_LABELS, type TrackId } from "./track";

/**
 * ترفيع الطالب إلى المستوى التالي بعد نجاحه في سبر مستواه — فقط إن كان ما يزال على المستوى `from`.
 * يُخرَج من حلقته ويظهر عند الإدارة ضمن «غير المفروزين» مميَّزًا بـ «ترفّع» لإعادة فرزه على حلقة من مستواه
 * الجديد. المتخرّج لا يُفرز (لا حلقة له).
 */
export async function promoteStudent(studentId: string, from: TrackId, actorId: string, reason: string): Promise<boolean> {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { track: true, name: true } });
  const to = nextLevel(from);
  if (!student || student.track !== from || !to) return false;

  await prisma.student.update({
    where: { id: studentId },
    data: { track: to, halqaId: null, promotedAt: to === "GRADUATED" ? null : new Date() },
  });
  await logAction(actorId, `ترفّع الطالب «${student.name}» من «${TRACK_LABELS[from]}» إلى «${TRACK_LABELS[to]}» — ${reason}`);
  return true;
}
