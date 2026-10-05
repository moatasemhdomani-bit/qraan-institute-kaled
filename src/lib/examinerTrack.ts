import type { TrackId } from "./track";
import type { Session } from "./session";

/**
 * نوع ما يسبره المستخدم في حسابه النشط: مختبِر القرآن ومشرف مختبرين القرآن يريان حلقات مستويات القرآن،
 * ومختبِر القراءة العربية حلقاتها — المدير وغيره يرون الكل (null = بلا تقييد).
 */
export async function examinerTrack(session: Pick<Session, "role" | "track">): Promise<TrackId | null> {
  if (session.role === "EXAM_SUPERVISOR") return "QURAN";
  if (session.role !== "EXAMINER") return null;
  return session.track === "ARABIC" ? "ARABIC" : "QURAN";
}

/** يُجري السبر: المختبِر ومشرف مختبرين القرآن (والمدير من «متابعة السبر»). */
export const examinerLike = (role: string) => role === "EXAMINER" || role === "EXAM_SUPERVISOR";

/**
 * حلقات المختبِر والمشرف محصورة في أفواج حسابهما النشط؛ المدير والإداري للمعهد كاملًا.
 * يُرجع شرط Prisma على الحلقة (أو {} بلا تقييد).
 */
export function cohortScope(session: Pick<Session, "role" | "cohortIds">): { cohortId?: { in: string[] } } {
  return session.role === "EXAMINER" || session.role === "EXAM_SUPERVISOR" || session.role === "TEACHER"
    ? { cohortId: { in: session.cohortIds } }
    : {};
}
