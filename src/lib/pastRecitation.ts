import { GRADES, REPEAT_GRADE } from "./daily";

/**
 * التسميع الماضي لطلاب القرآن بالأجزاء والأحزاب (بدل الصفحات): كل بند «حزب 1» أو «حزب 2» أو «جزء» من
 * أحد الأجزاء 1–30 مع تقديره. يجوز أكثر من بند وأكثر من نوع في اليوم، ولا يتكرّر البند نفسه (النوع + الجزء).
 * في التقارير: الجزء = 1، والحزب = نصف جزء.
 */
export type PastKind = "HIZB1" | "HIZB2" | "JUZ";
export type PastItem = { kind: PastKind; juz: number; grade: string };

export const PAST_KINDS: { id: PastKind; label: string }[] = [
  { id: "HIZB1", label: "حزب 1" },
  { id: "HIZB2", label: "حزب 2" },
  { id: "JUZ", label: "جزء" },
];

export const JUZ_COUNT = 30;

/** «الحزب 1 من الجزء 10» أو «الجزء 10». */
export function pastItemLabel(i: { kind: PastKind; juz: number }): string {
  if (i.kind === "JUZ") return `الجزء ${i.juz}`;
  return `الحزب ${i.kind === "HIZB1" ? 1 : 2} من الجزء ${i.juz}`;
}

/** مقدار البند بالأجزاء: الجزء 1، والحزب نصف جزء. */
export const pastItemJuz = (i: { kind: PastKind }) => (i.kind === "JUZ" ? 1 : 0.5);

/** مجموع الأجزاء — البند المقدَّر «إعادة» لا يُحسب (كأنه لم يُسمَّع). */
export function pastJuzTotal(items: { kind: PastKind; grade?: string }[]): number {
  return items.reduce((sum, i) => sum + (i.grade === REPEAT_GRADE ? 0 : pastItemJuz(i)), 0);
}

/** عرض عدد الأجزاء: 3 أو 3.5. */
export function formatJuz(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** يقرأ بنود الماضي المخزّنة (JSON) بأمان — ما لا يصحّ يُهمَل. */
export function parsePastItems(raw: unknown): PastItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is PastItem =>
      !!x &&
      typeof x === "object" &&
      PAST_KINDS.some((k) => k.id === (x as PastItem).kind) &&
      Number.isInteger((x as PastItem).juz) &&
      typeof (x as PastItem).grade === "string"
  );
}

/** سبب رفض بنود الماضي، أو null إن كانت صحيحة. */
export function validatePastItems(items: { kind: string; juz: number | null; grade: string }[]): string | null {
  if (items.length === 0) return "لم يتم تحديد الماضي — اختاروا حزبًا أو جزءًا، أو «لم يقرأ ماضي اليوم».";
  const seen = new Set<string>();
  for (const i of items) {
    if (!PAST_KINDS.some((k) => k.id === i.kind)) return "نوع ماضٍ غير معروف.";
    const kindLabel = PAST_KINDS.find((k) => k.id === i.kind)!.label;
    if (i.juz == null || !Number.isInteger(i.juz) || i.juz < 1 || i.juz > JUZ_COUNT) {
      return `اختاروا رقم الجزء (1–${JUZ_COUNT}) لـ«${kindLabel}» في الماضي.`;
    }
    const key = `${i.kind}-${i.juz}`;
    if (seen.has(key)) return `«${pastItemLabel({ kind: i.kind as PastKind, juz: i.juz })}» مكرَّر — لا يُسمَّع البند نفسه مرتين في اليوم.`;
    seen.add(key);
    if (!i.grade) return `لم يتم تحديد تقدير «${pastItemLabel({ kind: i.kind as PastKind, juz: i.juz })}».`;
    if (!GRADES.includes(i.grade as never)) return "تقدير غير معروف.";
  }
  return null;
}

/** ملخّص الماضي في سطر: «الماضي: الحزب 1 من الجزء 10 (ممتاز)، الجزء 3 (جيد)». */
export function pastSummary(items: PastItem[]): string {
  return items.map((i) => `${pastItemLabel(i)} (${i.grade})`).join("، ");
}
