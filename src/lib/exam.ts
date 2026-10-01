import { MIN_PAGE, MAX_PAGE } from "./daily";

export { MIN_PAGE, MAX_PAGE };

export const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

export const NOMINATION_PARTS: Record<"present" | "absent", number[]> = {
  present: [10, 20, 30],
  absent: [5, 10, 15, 20, 25, 30],
};

export type ExamTypeId = "LOCAL" | "WAQF_NOMINATION" | "PLACEMENT" | "ARABIC";

export const TYPE_LABELS: Record<ExamTypeId, string> = {
  LOCAL: "سبر محلي",
  WAQF_NOMINATION: "ترشيح الأوقاف",
  PLACEMENT: "تحديد مستوى",
  ARABIC: "سبر القراءة العربية",
};

/** سبر القراءة العربية: ست مراحل — 1 إلى 5 بتقدير، والسادسة بعلامة من 100 (النجاح 90 فأكثر). */
export const ARABIC_STAGES = [1, 2, 3, 4, 5, 6, 7];
/** المرحلة 7 «بينة للناس»: سور البينة إلى الناس — النجاح فيها يرفّع الطالب إلى «عمَّ غيباً». */
export const ARABIC_FINAL_STAGE = 7;
/** المرحلتان 6 و7 بعلامة من 100، وما قبلهما بتقدير. */
export const isArabicMarkStage = (stage: number | null | undefined) => stage === 6 || stage === 7;
/** اسم المرحلة: رقمها، والسابعة باسمها «بينة للناس». */
export const arabicStageLabel = (stage: number) => (stage === ARABIC_FINAL_STAGE ? "بينة للناس" : `المرحلة ${stage}`);
export const ARABIC_PASS_MARK = 90;
/** «إعادة» = راسب؛ جيد وجيد جدًا وممتاز = ناجح. */
export const ARABIC_GRADES = ["ممتاز", "جيد جدًا", "جيد", "إعادة"];
export const ARABIC_FAIL_GRADE = "إعادة";

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
  nominationPresent?: boolean | null;
  stage?: number | null;
  grade?: string | null;
};

/** نص نتيجة موحّد للعرض. */
export function resultLabel(exam: ExamResultShape): string {
  if (exam.type === "PLACEMENT") {
    if (exam.juz == null) return "—";
    const mode = exam.nominationPresent == null ? "" : exam.nominationPresent ? " — حاضرًا" : " — غيبًا";
    return `يبدأ من الجزء ${exam.juz}${mode}`;
  }
  if (exam.type === "ARABIC" && !isArabicMarkStage(exam.stage)) return exam.grade || "—";
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
  if (exam.type === "ARABIC") {
    if (isArabicMarkStage(exam.stage)) return exam.resultMark == null ? null : exam.resultMark >= ARABIC_PASS_MARK ? "ناجح" : "راسب";
    if (!exam.grade) return null;
    return exam.grade === ARABIC_FAIL_GRADE ? "راسب" : "ناجح";
  }
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
  studentName?: string;
  stage?: number | null;
  grade?: string | null;
}): string | null {
  if (input.type === "ARABIC") {
    if (!input.stage || !ARABIC_STAGES.includes(input.stage)) return "اختاروا المرحلة.";
    if (isArabicMarkStage(input.stage)) {
      if (input.resultMark == null || input.resultMark < 0 || input.resultMark > 100) return `أدخلوا علامة «${arabicStageLabel(input.stage)}» من 0 إلى 100.`;
    } else if (!input.grade || !ARABIC_GRADES.includes(input.grade)) return "اختاروا التقدير.";
    return null;
  }
  if (input.type === "PLACEMENT") {
    // الاسم يُطلب فقط عند تسجيل طالب جديد — عند تعديل سبر قائم لا يُمرَّر الاسم أصلًا
    if (input.studentName !== undefined && !input.studentName.trim()) return "اكتبوا اسم الطالب.";
    if (input.nominationPresent == null) return "اختاروا حاضرًا أو غيبًا.";
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

/**
 * نوع السبر بصيغة مختصرة تُعرض دومًا مع العلامة والمختبِر والصفحات:
 * «10 غيبًا» / «15 حاضرًا» (أجزاء ترشيح الأوقاف أو سبر الأوقاف الفعلي)، «الجزء 18 حاضرًا» / «الجزء 21 غيبًا» (السبر المحلي وتحديد المستوى)، «عمّ غيبًا».
 */
export function examKindLabel(e: {
  type: ExamTypeId | "AWQAF_ACTUAL";
  localKind?: LocalKindId | null;
  juz?: number | null;
  nominationPresent?: boolean | null;
  nominationParts?: number | null;
  stage?: number | null;
}): string {
  if (e.type === "ARABIC") return e.stage != null ? arabicStageLabel(e.stage) : "";
  const mode = e.nominationPresent == null ? "" : e.nominationPresent ? "حاضرًا" : "غيبًا";
  if (e.type === "WAQF_NOMINATION" || e.type === "AWQAF_ACTUAL") {
    return [e.nominationParts ?? "", mode].filter(Boolean).join(" ");
  }
  if (e.type === "LOCAL") {
    if (e.localKind === "AMMA_GHAYBAN") return "عمّ غيبًا";
    const localMode = e.localKind === "HADIRAN" ? "حاضرًا" : "غيبًا";
    return e.juz != null ? `الجزء ${e.juz} ${localMode}` : localMode;
  }
  // PLACEMENT
  return e.juz != null ? `الجزء ${e.juz}${mode ? ` ${mode}` : ""}` : mode;
}
