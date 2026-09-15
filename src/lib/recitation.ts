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

/** يُرجع سبب رفض السطر، أو null إن كان مكتملًا وصحيحًا. */
export function validateEntry(e: RecEntry): string | null {
  if (e.none) return null;
  if (e.noNew && e.noPast) return "لم يسمّع جديدًا ولا ماضيًا — استخدم خيار «لم يسمّع اليوم».";

  if (!e.noNew) {
    if (!inRange(e.newFrom) || !inRange(e.newTo)) return `صفحات التسميع الجديد بين ${MIN_PAGE} و${MAX_PAGE} فقط.`;
    if ((e.newTo as number) < (e.newFrom as number)) return "صفحة «إلى» في التسميع الجديد لا تسبق صفحة «من».";
    if (!e.gradeNew) return "اختر تقدير التسميع الجديد.";
  }
  if (!e.noPast) {
    if (!inRange(e.pastFrom) || !inRange(e.pastTo)) return `صفحات الماضي بين ${MIN_PAGE} و${MAX_PAGE} فقط.`;
    if ((e.pastTo as number) < (e.pastFrom as number)) return "صفحة «إلى» في الماضي لا تسبق صفحة «من».";
    if (!e.gradePast) return "اختر تقدير الماضي.";
  }
  return null;
}
