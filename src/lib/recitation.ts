import { pageRange, hasPastRecitation, AMMA_SURAHS, type TrackId } from "./track";
import { validatePastItems, type PastKind } from "./pastRecitation";

export type RecEntry = {
  studentId: string;
  none: boolean;
  noNew: boolean;
  noPast: boolean;
  newFrom: number | null;
  newTo: number | null;
  gradeNew: string | null;
  /** الماضي بالأجزاء والأحزاب، لكل بند تقديره */
  pastItems: { kind: PastKind | string; juz: number | null; grade: string }[];
};


/**
 * يُرجع سبب رفض السطر، أو null إن كان مكتملًا وصحيحًا.
 * maxPriorNewTo: أعلى صفحة جديدة سُمِّعت من قبل لهذا الطالب — لا يجوز أن يبدأ التسميع الجديد قبلها
 * أو منها (لا يُعاد تسميع صفحة سبق حفظها). الماضي مراجعة حرّة، بلا هذا القيد.
 * track: نوع الحلقة — القراءة العربية صفحاتها 5–48 وتسميعها جديد فقط بلا ماضٍ.
 */
export function validateEntry(e: RecEntry, maxPriorNewTo?: number | null, track: TrackId = "QURAN"): string | null {
  if (e.none) return null;
  const { min: MIN_PAGE, max: MAX_PAGE } = pageRange(track);
  const inRange = (n: number | null) => n != null && n >= MIN_PAGE && n <= MAX_PAGE;
  if (!hasPastRecitation(track)) {
    if (e.noNew) return "لم يسمّع جديدًا — استخدم خيار «لم يسمّع اليوم».";
    e = { ...e, noPast: true };
  }
  // القراءة العربية: «التسميع» وحده بلا وصف «الجديد»
  const T = hasPastRecitation(track) ? "التسميع الجديد" : "التسميع";
  const from = hasPastRecitation(track) ? "من صفحة" : "من الصفحة";
  const to = hasPastRecitation(track) ? "إلى صفحة" : "إلى الصفحة";
  if (e.noNew && e.noPast) return "لم يسمّع جديدًا ولا ماضيًا — استخدم خيار «لم يسمّع اليوم».";

  if (!e.noNew) {
    if (e.newFrom == null || e.newTo == null) return `لم يتم تحديد صفحات ${T} (${from} / ${to}).`;
    if (!inRange(e.newFrom) || !inRange(e.newTo)) return `صفحات ${T} بين ${MIN_PAGE} و${MAX_PAGE} فقط.`;
    if (e.newTo < e.newFrom) {
      return `إدخال ${T} غير صحيح — «${to}» (${e.newTo}) أصغر من «${from}» (${e.newFrom}).`;
    }
    if (maxPriorNewTo != null && e.newFrom <= maxPriorNewTo) {
      return `لا يمكن تسميع صفحة مسمَّعة مسبقًا — آخر صفحة سُمِّعت${hasPastRecitation(track) ? " جديدًا" : ""}: ${maxPriorNewTo}، فابدأ من ${maxPriorNewTo + 1}.`;
    }
    if (!e.gradeNew) return `لم يتم تحديد تقدير ${T}.`;
  }
  if (!e.noPast) {
    const bad = validatePastItems(e.pastItems);
    if (bad) return bad;
  }
  return null;
}

/**
 * تسميع بالسور (عمَّ غيباً، و«بينة للناس» لطالب القراءة العربية بعد المرحلة 6): سورة أو أكثر من القائمة،
 * مع تقدير التسميع. يُرجع سبب الرفض أو null.
 */
export function validateSurahEntry(e: { none: boolean; surahs: string[]; gradeNew: string | null }): string | null {
  if (e.none) return null;
  if (e.surahs.length === 0) return "اختاروا سورة واحدة على الأقل.";
  if (e.surahs.some((s) => !AMMA_SURAHS.includes(s))) return "سورة غير معروفة.";
  if (!e.gradeNew) return "لم يتم تحديد تقدير التسميع.";
  return null;
}
