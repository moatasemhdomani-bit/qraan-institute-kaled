import { prisma } from "./db";
import { passFailLabel, LOCAL_KIND_LABELS, arabicStageLabel, ARABIC_FINAL_STAGE, type ExamTypeId, type LocalKindId } from "./exam";

/** مهلة «إعادة»: لا يُعاد السبر في يوم رسوبه نفسه — يُسمح به من اليوم التالي */
export const RETRY_DELAY_MESSAGE = "هذا السبر أُعيد في هذا اليوم — يُسمح بإعادته من اليوم التالي.";

const LAST_JUZ = 30;

/**
 * قيود التسلسل في سبر القرآن والقراءة العربية (لسبر جديد فقط):
 * - البداية حرّة: أول سبر للطالب في نوعه من أي جزء أو مرحلة، ثم يجري عليه التسلسل.
 * - السبر المحلي حاضرًا وغيبًا (لكلٍّ تسلسله): تصاعدي — الجزء التالي لأعلى جزء نجح فيه، ولا يُعاد جزء نجح فيه.
 * - القراءة العربية: المرحلة التالية لأعلى مرحلة نجح فيها، حتى «بينة للناس».
 * - ترشيح الأوقاف حاضرًا/غيبًا لـ N أجزاء: بعد النجاح في الجزء N في المحلي حاضرًا/غيبًا.
 * - مهلة يوم بعد «إعادة» للسبر نفسه.
 * - الطالب العائد بعد انقطاع: يُلغى التسلسل بما سبق عودته، فيبدأ من أي سبر.
 * يُرجع رسالة المنع، أو null.
 */
export async function examSequenceBlock(input: {
  studentId: string;
  type: ExamTypeId;
  localKind: LocalKindId | null;
  juz: number | null;
  stage: number | null;
  nominationParts: number | null;
  nominationPresent: boolean | null;
  date: string;
}): Promise<string | null> {
  const { type } = input;
  if (type === "PLACEMENT") return null;
  const prior = await prisma.exam.findMany({
    where: { studentId: input.studentId, type: { in: ["LOCAL", "WAQF_NOMINATION", "ARABIC", "PAST_GHAIB"] } },
    select: { type: true, localKind: true, juz: true, stage: true, grade: true, resultMark: true, repeat: true, nominationPresent: true, date: true, createdAt: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  const result = (e: (typeof prior)[number]) => passFailLabel({ ...e, type: e.type as ExamTypeId, localKind: e.localKind as LocalKindId | null });

  // السبر نفسه: النوع، ونوع المحلي وجزؤه، ومرحلة القراءة العربية
  const juzKind = type === "LOCAL" && (input.localKind === "HADIRAN" || input.localKind === "GHAYBAN");
  const sameUnit = (e: (typeof prior)[number]) =>
    e.type === type &&
    (type !== "LOCAL" || e.localKind === input.localKind) &&
    (!juzKind || e.juz === input.juz) &&
    (type !== "ARABIC" || e.stage === input.stage);
  if (prior.some((e) => sameUnit(e) && e.date === input.date && result(e) === "إعادة")) return RETRY_DELAY_MESSAGE;

  // عاد بعد انقطاع: سبوره قبل عودته لا تُحتسب في التسلسل — البداية حرّة من جديد
  const st = await prisma.student.findUnique({ where: { id: input.studentId }, select: { examSeqResetAt: true } });
  const resetAt = st?.examSeqResetAt;
  if (resetAt) {
    const kept = prior.filter((e) => e.createdAt > resetAt);
    prior.length = 0;
    prior.push(...kept);
  }

  if (juzKind && input.juz != null) {
    const mine = prior.filter((e) => e.type === "LOCAL" && e.localKind === input.localKind && e.juz != null);
    if (mine.length === 0) return null; // البداية حرّة
    const kind = LOCAL_KIND_LABELS[input.localKind as LocalKindId];
    const passed = mine.filter((e) => result(e) === "ناجح").map((e) => e.juz as number);
    if (passed.includes(input.juz)) return `نجح الطالب في الجزء ${input.juz} (${kind}) سابقًا.`;
    const next = passed.length ? Math.max(...passed) + 1 : (mine[0].juz as number);
    if (next > LAST_JUZ) return `أنهى الطالب الأجزاء كلها في السبر المحلي (${kind}).`;
    if (input.juz !== next) return `الجزء التالي للطالب في السبر المحلي (${kind}) هو الجزء ${next} — الأجزاء بالترتيب تصاعديًا.`;
    return null;
  }

  if (type === "ARABIC" && input.stage != null) {
    const mine = prior.filter((e) => e.type === "ARABIC" && e.stage != null);
    if (mine.length === 0) return null; // البداية حرّة
    const passed = mine.filter((e) => result(e) === "ناجح").map((e) => e.stage as number);
    if (passed.includes(input.stage)) return `نجح الطالب في ${arabicStageLabel(input.stage)} سابقًا.`;
    const next = passed.length ? Math.max(...passed) + 1 : (mine[0].stage as number);
    if (next > ARABIC_FINAL_STAGE) return "أنهى الطالب مراحل القراءة العربية كلها.";
    if (input.stage !== next) return `المرحلة التالية للطالب في القراءة العربية هي ${arabicStageLabel(next)} — المراحل بالترتيب.`;
    return null;
  }

  // ترشيح الأوقاف حاضرًا (أو غيبًا) لـ N أجزاء: وصل الطالب في تسلسل المحلي حاضرًا (أو غيبًا) إلى الجزء N ونجح فيه
  if (type === "WAQF_NOMINATION" && input.nominationParts && input.nominationPresent != null) {
    if (prior.length === 0) return null; // البداية حرّة
    const kind: LocalKindId = input.nominationPresent ? "HADIRAN" : "GHAYBAN";
    const n = input.nominationParts;
    const ok = prior.some((e) => e.type === "LOCAL" && e.localKind === kind && e.juz === n && result(e) === "ناجح");
    if (!ok) return `ترشيح الأوقاف ${LOCAL_KIND_LABELS[kind]} لـ ${n} أجزاء يحتاج نجاح الطالب في السبر المحلي ${LOCAL_KIND_LABELS[kind]} في الجزء ${n}.`;
  }
  return null;
}
