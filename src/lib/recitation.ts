import { MIN_PAGE, MAX_PAGE } from "./daily";

export type RecEntry = {
  studentId: string;
  none: boolean;
  noNew: boolean;
  noPast: boolean;
  newFrom: number | null;
  newTo: number | null;
  pastFrom: number | null;
  pastTo: number | null;
  gradeNew: string | null;
  gradePast: string | null;
};

const inRange = (n: number | null) => n != null && n >= MIN_PAGE && n <= MAX_PAGE;

/**
 * يُرجع سبب رفض السطر، أو null إن كان مكتملًا وصحيحًا.
 * maxPriorNewTo: أعلى صفحة جديدة سُمِّعت من قبل لهذا الطالب — لا يجوز أن يبدأ التسميع الجديد قبلها
 * أو منها (لا يُعاد تسميع صفحة سبق حفظها). الماضي مراجعة حرّة، بلا هذا القيد.
 */
export function validateEntry(e: RecEntry, maxPriorNewTo?: number | null): string | null {
  if (e.none) return null;
  if (e.noNew && e.noPast) return "لم يسمّع جديدًا ولا ماضيًا — استخدم خيار «لم يسمّع اليوم».";

  if (!e.noNew) {
    if (e.newFrom == null || e.newTo == null) return "لم يتم تحديد صفحات التسميع الجديد (من صفحة / إلى صفحة).";
    if (!inRange(e.newFrom) || !inRange(e.newTo)) return `صفحات التسميع الجديد بين ${MIN_PAGE} و${MAX_PAGE} فقط.`;
    if (e.newTo < e.newFrom) {
      return `إدخال التسميع الجديد غير صحيح — «إلى صفحة» (${e.newTo}) أصغر من «من صفحة» (${e.newFrom}).`;
    }
    if (maxPriorNewTo != null && e.newFrom <= maxPriorNewTo) {
      return `لا يمكن تسميع صفحة مسمَّعة مسبقًا — آخر صفحة سُمِّعت جديدًا: ${maxPriorNewTo}، فابدأ من ${maxPriorNewTo + 1}.`;
    }
    if (!e.gradeNew) return "لم يتم تحديد تقييم التسميع الجديد.";
  }
  if (!e.noPast) {
    if (e.pastFrom == null || e.pastTo == null) return "لم يتم تحديد صفحات الماضي (من صفحة / إلى صفحة).";
    if (!inRange(e.pastFrom) || !inRange(e.pastTo)) return `صفحات الماضي بين ${MIN_PAGE} و${MAX_PAGE} فقط.`;
    if (e.pastTo < e.pastFrom) {
      return `إدخال الماضي غير صحيح — «إلى صفحة» (${e.pastTo}) أصغر من «من صفحة» (${e.pastFrom}).`;
    }
    if (!e.gradePast) return "لم يتم تحديد تقييم الماضي.";
  }
  return null;
}
