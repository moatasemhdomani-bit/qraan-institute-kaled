/**
 * مستويات المعهد بالترتيب: قراءة عربية ← عمَّ غيباً ← قرآن حاضراً ← قرآن غيباً ← متخرِّج.
 * الطالب على أحدها، والمدرّس والحلقة على أحد الأربعة الأولى (لا حلقة للمتخرّجين)،
 * والمختبِر نوعان فقط: QURAN (يسبر مستويات القرآن الثلاثة) أو ARABIC.
 */
export type TrackId = "ARABIC" | "AMMA" | "QURAN" | "QURAN_GHAIB" | "GRADUATED";

/** مستويات الطالب بالترتيب. */
export const STUDENT_LEVELS: TrackId[] = ["ARABIC", "AMMA", "QURAN", "QURAN_GHAIB", "GRADUATED"];

/** أنواع الحلقات والمدرّسين (بلا «متخرِّج»). */
export const HALQA_TRACKS: TrackId[] = ["ARABIC", "AMMA", "QURAN", "QURAN_GHAIB"];

export const TRACK_LABELS: Record<TrackId, string> = {
  ARABIC: "قراءة عربية",
  AMMA: "عمَّ غيباً",
  QURAN: "قرآن حاضراً",
  QURAN_GHAIB: "قرآن غيباً",
  GRADUATED: "متخرِّج",
};

/** مستويات القرآن الثلاثة — يسبرها مختبِر القرآن، وتظهر في تقارير القرآن. */
export const QURAN_FAMILY: TrackId[] = ["AMMA", "QURAN", "QURAN_GHAIB"];

/** عائلة المستوى للسبر والتقارير: القراءة العربية، أو القرآن بمستوياته. */
export function examFamily(track: TrackId | null | undefined): "ARABIC" | "QURAN" {
  return track === "ARABIC" ? "ARABIC" : "QURAN";
}

/** المستوى التالي عند الترفّع. */
export function nextLevel(track: TrackId): TrackId | null {
  const i = STUDENT_LEVELS.indexOf(track);
  return i >= 0 && i < STUDENT_LEVELS.length - 1 ? STUDENT_LEVELS[i + 1] : null;
}

/** سور «عمَّ غيباً» / «بينة للناس» — يختار المدرّس منها سورة أو أكثر في التسميع. */
export const AMMA_SURAHS = [
  "البينة",
  "الزلزلة",
  "العاديات",
  "القارعة",
  "التكاثر",
  "العصر",
  "الهمزة",
  "الفيل",
  "قريش",
  "الماعون",
  "الكوثر",
  "الكافرون",
  "النصر",
  "المسد",
  "الإخلاص",
  "الفلق",
  "الناس",
];

/**
 * طريقة التسميع اليومي:
 * - "quran": جديد وماضٍ بأرقام صفحات المصحف (قرآن حاضراً، قرآن غيباً)
 * - "arabic": جديد فقط بصفحات الكتاب 5–48 (القراءة العربية)
 * - "surah": اختيار سورة أو أكثر (عمَّ غيباً، وطالب القراءة العربية بعد نجاحه في المرحلة 6 — «بينة للناس»)
 */
export type RecitationMode = "quran" | "arabic" | "surah";

export function recitationMode(track: TrackId | null | undefined, passedArabicStage6 = false): RecitationMode {
  if (track === "AMMA") return "surah";
  if (track === "ARABIC") return passedArabicStage6 ? "surah" : "arabic";
  return "quran";
}

/** صفحات التسميع المسموحة: المصحف 1–604، وكتاب «مختصر القراءة العربية» 5–48. */
export function pageRange(track: TrackId | null | undefined): { min: number; max: number } {
  return track === "ARABIC" ? { min: 5, max: 48 } : { min: 1, max: 604 };
}

/** الماضي (المراجعة) لمستويَي القرآن حاضراً وغيباً وحدهما. */
export const hasPastRecitation = (track: TrackId | null | undefined) => track === "QURAN" || track === "QURAN_GHAIB" || track == null;

/** اسم الحلقة مع نوعها — «حلقة النور (قرآن حاضراً)». */
export function halqaWithTrack(name: string, track: TrackId | null | undefined): string {
  return `${name} (${TRACK_LABELS[track ?? "QURAN"]})`;
}

/** تسمية دور الموظف مع نوعه: «مدرس عمَّ غيباً»، «مختبِر قرآن»، «مختبِر قراءة عربية». */
export function staffRoleLabel(role: string, track: TrackId | null | undefined, roleLabels: Record<string, string>): string {
  if (role === "TEACHER") return `مدرس ${TRACK_LABELS[track ?? "QURAN"]}`;
  if (role === "EXAMINER") return track === "ARABIC" ? "مختبِر قراءة عربية" : "مختبِر قرآن";
  return roleLabels[role] ?? role;
}
