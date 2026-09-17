import { MIN_PAGE, MAX_PAGE } from "./daily";

export { MIN_PAGE, MAX_PAGE };

export const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

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

type ExamResultShape = {
  type: ExamTypeId;
  localKind?: LocalKindId | null;
  resultMark?: number | null;
  juz?: number | null;
};

/** نص نتيجة موحّد للعرض. */
export function resultLabel(exam: ExamResultShape): string {
  if (exam.type === "PLACEMENT") return exam.juz != null ? `يبدأ من الجزء ${exam.juz}` : "—";
  return exam.resultMark != null ? `${exam.resultMark} / 100` : "—";
}

/** الحدود الدنيا للنجاح — ثابتة، لا تُضبط من الإدارة. لا حدّ لتحديد المستوى (لا علامة له أصلًا). */
export function passThreshold(
  type: ExamTypeId,
  localKind: LocalKindId | null | undefined,
  nominationPresent: boolean | null | undefined
): number | null {
  if (type === "WAQF_NOMINATION") return nominationPresent ? 90 : 80;
  if (type === "LOCAL") {
    if (localKind === "HADIRAN") return 90;
    if (localKind === "GHAYBAN" || localKind === "AMMA_GHAYBAN") return 80;
  }
  return null;
}

type PassFailShape = ExamResultShape & { nominationPresent?: boolean | null };

/** "ناجح" أو "راسب" — أو null لما لا حدّ نجاح له (تحديد مستوى، أو سبر بلا نتيجة بعد). */
export function passFailLabel(exam: PassFailShape): "ناجح" | "راسب" | null {
  const threshold = passThreshold(exam.type, exam.localKind, exam.nominationPresent);
  if (threshold == null) return null;
  if (exam.resultMark == null) return null;
  return exam.resultMark >= threshold ? "ناجح" : "راسب";
}

/** يُرجع رسالة الرفض، أو null إن كانت بيانات السبر صحيحة وكاملة. */
export function validateExam(input: {
  type: ExamTypeId;
  localKind?: LocalKindId | null;
  juz?: number | null;
  pages?: number[];
  resultMark?: number | null;
  nominationPresent?: boolean | null;
  nominationParts?: number | null;
  topicIds?: string[];
  studentName?: string;
}): string | null {
  if (input.type === "PLACEMENT") {
    if (!input.studentName?.trim()) return "اكتبوا اسم الطالب.";
    if (!input.juz || input.juz < 1 || input.juz > 30) return "اختاروا الجزء الذي يبدأ منه الطالب.";
  }

  if (input.type === "LOCAL" || input.type === "WAQF_NOMINATION") {
    const pages = input.pages ?? [];
    if (pages.length === 0) return "أضيفوا صفحة واحدة على الأقل.";
    for (const p of pages) {
      if (!Number.isFinite(p) || p < MIN_PAGE || p > MAX_PAGE) return `أرقام الصفحات بين ${MIN_PAGE} و${MAX_PAGE}.`;
    }
  }

  if (input.type === "LOCAL") {
    if (!input.localKind) return "اختاروا نوع السبر المحلي: غيباً أو حاضراً أو عمّ غيباً.";

    if (input.localKind === "HADIRAN" || input.localKind === "GHAYBAN") {
      if (!input.juz || input.juz < 1 || input.juz > 30) return "اختاروا الجزء الذي سُبر فيه الطالب.";
    }

    if (input.localKind === "HADIRAN" && (!input.topicIds || input.topicIds.length === 0)) {
      return "أضيفوا سؤالًا واحدًا على الأقل من بنك التجويد.";
    }

    if (input.resultMark == null || input.resultMark < 0 || input.resultMark > 100) return "أدخلوا علامة من 0 إلى 100.";
  }

  if (input.type === "WAQF_NOMINATION") {
    if (input.nominationPresent == null) return "اختاروا حاضرًا أو غيبًا.";
    const allowed = NOMINATION_PARTS[input.nominationPresent ? "present" : "absent"];
    if (!input.nominationParts || !allowed.includes(input.nominationParts)) return "اختاروا عدد الأجزاء.";
    if (input.resultMark == null || input.resultMark < 0 || input.resultMark > 100) return "أدخلوا علامة من 0 إلى 100.";
  }

  return null;
}
