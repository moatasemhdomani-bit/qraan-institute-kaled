/** النجوم: مكافآت المعهد (مفردها نجمة) — رصيد للطالب، ورصيد للحلقة تودعه الإدارة ويصرفه المدرّس على طلابها. */
export type StarKind = "CHARGE" | "WITHDRAW";

/** أكبر عدد نجوم في العملية الواحدة */
export const STAR_MAX = 10000;

export const starKindLabel = (k: StarKind | string) => (k === "CHARGE" ? "إيداع" : "سحب");

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
  /** null = العملية على رصيد الحلقة (أو رصيد نشاط مسؤول النشاط) نفسه */
  studentId: string | null;
  studentName: string | null;
  studentNo: number | null;
  halqaId: string | null;
  halqaName: string | null;
  byId: string;
  byName: string;
  /** مسؤول النشاط المعنيّ: عملية على رصيد نشاطه، أو عمليته هو على طالب */
  officerId: string | null;
  officerName: string | null;
  byLabel: string;
  fromPool: boolean;
  reason: string | null;
  /** إعادة نجوم سُحبت بالغلط (مسؤول النشاط) */
  isReturn: boolean;
  /** سحبٌ أُعيدت نجومه */
  returned: boolean;
};
