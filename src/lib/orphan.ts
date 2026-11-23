/** قلب أبيض صغير بعد اسم الطالب اليتيم — يظهر للمدرّس ومسؤول النشاط */
export const ORPHAN_HEART = "🤍";

export function orphanMark(name: string, isOrphan: boolean | null | undefined): string {
  return isOrphan ? `${name} ${ORPHAN_HEART}` : name;
}
