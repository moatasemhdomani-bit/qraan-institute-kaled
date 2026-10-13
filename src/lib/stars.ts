/** النجوم: مكافآت المعهد (مفردها نجمة) — رصيد للطالب، ورصيد للحلقة تشحنه الإدارة ويصرفه المدرّس على طلابها. */
export type StarKind = "CHARGE" | "WITHDRAW";

/** أكبر عدد نجوم في العملية الواحدة */
export const STAR_MAX = 10000;

export const starKindLabel = (k: StarKind | string) => (k === "CHARGE" ? "شحن" : "سحب");

/** «5 نجوم»، «نجمة واحدة»، «نجمتان» */
export function starsText(n: number): string {
  if (n === 1) return "نجمة واحدة";
  if (n === 2) return "نجمتان";
  if (n >= 3 && n <= 10) return `${n} نجوم`;
  return `${n} نجمة`;
}

/** سطر في أرشيف التعديلات على أرصدة النجوم */
export type StarTxnRow = {
  id: string;
  at: string;
  kind: StarKind;
  amount: number;
  /** null = العملية على رصيد الحلقة نفسه */
  studentName: string | null;
  studentNo: number | null;
  halqaId: string | null;
  halqaName: string | null;
  byName: string;
  byLabel: string;
  fromPool: boolean;
  reason: string | null;
  /** إعادة نجوم سُحبت بالغلط (مسؤول النشاط) */
  isReturn: boolean;
  /** سحبٌ أُعيدت نجومه */
  returned: boolean;
};
