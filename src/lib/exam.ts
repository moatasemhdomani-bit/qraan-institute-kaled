import { prisma } from "./db";
import { GRADES } from "./daily";

export const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

export const LEVELS = [
  { id: "مبتدئ", color: "#8FA8C8" },
  { id: "متوسط", color: "#D4AF37" },
  { id: "متقدم", color: "#6FBF8B" },
] as const;

export { GRADES };

export const NOMINATION_PARTS: Record<"present" | "absent", number[]> = {
  present: [10, 20, 30],
  absent: [5, 10, 15, 20, 25, 30],
};

export type EvalModeId = "MARK100" | "GRADE" | "LEVEL";

export const EVAL_MODE_LABELS: Record<EvalModeId, string> = {
  MARK100: "علامة من 100",
  GRADE: "تقدير",
  LEVEL: "مستوى",
};

export const EVAL_MODES: EvalModeId[] = ["MARK100", "GRADE", "LEVEL"];

export type ExamTypeId = "LOCAL" | "WAQF_NOMINATION" | "PLACEMENT";

export const TYPE_LABELS: Record<ExamTypeId, string> = {
  LOCAL: "سبر محلي",
  WAQF_NOMINATION: "ترشيح الأوقاف",
  PLACEMENT: "تحديد مستوى",
};

/** العلامة الكلية لسبر محلي: متوسط علامات الأسئلة (من ١٠) × ١٠ = من ١٠٠. */
export function localTotal(marks: number[]): number {
  if (marks.length === 0) return 0;
  return Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10);
}

type ExamResultShape = {
  type: ExamTypeId;
  localTotal?: number | null;
  resultMark?: number | null;
  resultGrade?: string | null;
  resultLevel?: string | null;
};

/** يُرجع الإعداد الحالي، أو الافتراضي (علامة من ١٠٠ لكلا النوعين) إن لم يُضبط بعد. */
export async function getEvalSettings(): Promise<{ placementMode: EvalModeId; awqafMode: EvalModeId }> {
  const row = await prisma.evaluationSettings.findUnique({ where: { id: 1 } });
  return {
    placementMode: (row?.placementMode as EvalModeId) ?? "MARK100",
    awqafMode: (row?.awqafMode as EvalModeId) ?? "MARK100",
  };
}

/** نص نتيجة موحّد للعرض حسب نوع السبر ووضع التقييم. */
export function resultLabel(exam: ExamResultShape, settings: { placementMode: EvalModeId; awqafMode: EvalModeId }): string {
  if (exam.type === "LOCAL") return `${exam.localTotal ?? 0} / 100`;
  const mode = exam.type === "WAQF_NOMINATION" ? settings.awqafMode : settings.placementMode;
  if (mode === "MARK100") return exam.resultMark != null ? `${exam.resultMark} / 100` : "—";
  if (mode === "GRADE") return exam.resultGrade || "—";
  return exam.resultLevel || "—";
}

type LocalAnswerInput = { mark: number };

/** يُرجع رسالة الرفض، أو null إن كانت بيانات السبر صحيحة وكاملة. */
export function validateExam(input: {
  type: ExamTypeId;
  juz?: number | null;
  mode?: EvalModeId;
  resultMark?: number | null;
  resultGrade?: string | null;
  resultLevel?: string | null;
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
    if (!input.juz || input.juz < 1 || input.juz > 30) return "اختاروا الجزء المختبَر فيه.";
    if (!input.answers || input.answers.length === 0) return "أضيفوا سؤالًا واحدًا على الأقل.";
    for (const a of input.answers) {
      if (!Number.isFinite(a.mark) || a.mark < 0 || a.mark > 10) return "علامة كل سؤال بين 0 و10.";
    }
  }

  if (input.type === "WAQF_NOMINATION") {
    if (input.nominationPresent == null) return "اختاروا حاضرًا أو غيبًا.";
    const allowed = NOMINATION_PARTS[input.nominationPresent ? "present" : "absent"];
    if (!input.nominationParts || !allowed.includes(input.nominationParts)) return "اختاروا عدد الأجزاء.";
  }

  if (input.type === "PLACEMENT" || input.type === "WAQF_NOMINATION") {
    const mode = input.mode ?? "MARK100";
    if (mode === "MARK100") {
      if (input.resultMark == null || input.resultMark < 0 || input.resultMark > 100) return "أدخلوا علامة من 0 إلى 100.";
    } else if (mode === "GRADE") {
      if (!input.resultGrade) return "اختاروا التقدير.";
    } else {
      if (!input.resultLevel) return "اختاروا المستوى.";
    }
  }

  return null;
}
