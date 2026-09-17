import { MIN_PAGE, MAX_PAGE } from "./daily";

export { MIN_PAGE, MAX_PAGE };

export const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

/** بنك أسئلة التجويد (حاضراً) مبني حتى الجزء ٢٠ فقط؛ الأجزاء ٢١-٣٠ ترث كل ما دونها. */
export const TAJWEED_MAX_JUZ = 20;
export function tajweedJuzCap(juz: number): number {
  return Math.min(juz, TAJWEED_MAX_JUZ);
}

export const NOMINATION_PARTS: Record<"present" | "absent", number[]> = {
  present: [10, 20, 30],
  absent: [5, 10, 15, 20, 25, 30],
};

export type ExamTypeId = "LOCAL" | "WAQF_NOMINATION" | "PLACEMENT";

export const TYPE_LABELS: Record<ExamTypeId, string> = {
  LOCAL: "سبر محلي",
  WAQF_NOMINATION: "ترشيح الأوقاف",
  PLACEMENT: "تحديد مستوى",
};

export type LocalKindId = "GHAYBAN" | "HADIRAN" | "AMMA_GHAYBAN";

export const LOCAL_KINDS: LocalKindId[] = ["GHAYBAN", "HADIRAN", "AMMA_GHAYBAN"];

export const LOCAL_KIND_LABELS: Record<LocalKindId, string> = {
  GHAYBAN: "غيباً",
  HADIRAN: "حاضراً",
  AMMA_GHAYBAN: "عمّ غيباً",
};

/** العلامة الكلية لسبر محلي حاضراً: متوسط علامات الأسئلة (من ١٠) × ١٠ = من ١٠٠. */
export function localTotal(marks: number[]): number {
  if (marks.length === 0) return 0;
  return Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10);
}

type ExamResultShape = {
  type: ExamTypeId;
  localKind?: LocalKindId | null;
  localTotal?: number | null;
  resultMark?: number | null;
  juz?: number | null;
};

/** نص نتيجة موحّد للعرض. */
export function resultLabel(exam: ExamResultShape): string {
  if (exam.type === "LOCAL") {
    if (exam.localKind === "HADIRAN") return `${exam.localTotal ?? 0} / 100`;
    return exam.resultMark != null ? `${exam.resultMark} / 100` : "—";
  }
  if (exam.type === "PLACEMENT") return exam.juz != null ? `يبدأ من الجزء ${exam.juz}` : "—";
  return exam.resultMark != null ? `${exam.resultMark} / 100` : "—";
}

type LocalAnswerInput = { mark: number };

/** يُرجع رسالة الرفض، أو null إن كانت بيانات السبر صحيحة وكاملة. */
export function validateExam(input: {
  type: ExamTypeId;
  localKind?: LocalKindId | null;
  juz?: number | null;
  pageFrom?: number | null;
  pageTo?: number | null;
  resultMark?: number | null;
  nominationPresent?: boolean | null;
  nominationParts?: number | null;
  answers?: LocalAnswerInput[];
  studentName?: string;
}): string | null {
  if (input.type === "PLACEMENT") {
    if (!input.studentName?.trim()) return "اكتبوا اسم الطالب.";
    if (!input.juz || input.juz < 1 || input.juz > 30) return "اختاروا الجزء الذي يبدأ منه الطالب.";
  }

  if (input.type === "LOCAL") {
    if (!input.localKind) return "اختاروا نوع السبر المحلي: غيباً أو حاضراً أو عمّ غيباً.";
    if (
      !input.pageFrom ||
      !input.pageTo ||
      input.pageFrom < MIN_PAGE ||
      input.pageTo > MAX_PAGE ||
      input.pageTo < input.pageFrom
    ) {
      return `أرقام الصفحات بين ${MIN_PAGE} و${MAX_PAGE}، و"إلى" لا تسبق "من".`;
    }

    if (input.localKind === "HADIRAN") {
      if (!input.juz || input.juz < 1 || input.juz > 30) return "اختاروا الجزء لعرض أسئلة التجويد الخاصة به.";
      if (!input.answers || input.answers.length === 0) return "أضيفوا سؤالًا واحدًا على الأقل من بنك التجويد.";
      for (const a of input.answers) {
        if (!Number.isFinite(a.mark) || a.mark < 0 || a.mark > 10) return "علامة كل سؤال بين 0 و10.";
      }
    } else {
      if (input.resultMark == null || input.resultMark < 0 || input.resultMark > 100) return "أدخلوا علامة من 0 إلى 100.";
    }
  }

  if (input.type === "WAQF_NOMINATION") {
    if (input.nominationPresent == null) return "اختاروا حاضرًا أو غيبًا.";
    const allowed = NOMINATION_PARTS[input.nominationPresent ? "present" : "absent"];
    if (!input.nominationParts || !allowed.includes(input.nominationParts)) return "اختاروا عدد الأجزاء.";
    if (input.resultMark == null || input.resultMark < 0 || input.resultMark > 100) return "أدخلوا علامة من 0 إلى 100.";
  }

  return null;
}
