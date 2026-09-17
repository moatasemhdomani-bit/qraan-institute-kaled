import { prisma } from "./db";

/** صفحات مصحف المدينة */
export const MIN_PAGE = 1;
export const MAX_PAGE = 604;

export const GRADES = ["ممتاز", "جيد جدًا", "جيد", "ضعيف", "إعادة"] as const;

export const ATT_STATES = [
  { id: "PRESENT", label: "حاضر", color: "#6FBF8B" },
  { id: "LATE", label: "متأخر", color: "#D4AF37" },
  { id: "EXCUSED", label: "إذن", color: "#8FA8C8" },
  { id: "ABSENT", label: "غائب", color: "#E08A8A" },
] as const;

export type AttStatusId = (typeof ATT_STATES)[number]["id"];

export const ATT_LABELS: Record<string, string> = Object.fromEntries(
  ATT_STATES.map((a) => [a.id, a.label])
);

/** اليوم بصيغة YYYY-MM-DD بتوقيت الجهاز المحلي (لا UTC — وإلا انزلق اليوم مساءً). */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00").getTime());
}

/** اسم اليوم بالعربية — يُستعمل لمطابقة أيام الدوام الرسمية. */
const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export function weekdayName(date: string): string {
  return DAY_NAMES[new Date(date + "T00:00:00").getDay()];
}

export function formatDateAr(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * input[type=time] يرفض بصمت أي قيمة ليست HH:MM بالضبط (مثلًا "9:30" بلا صفر بادئ)،
 * وبيانات قديمة أُدخلت كنص حر قبل توحيد حقل الوقت قد تكون بهذا الشكل — طبّعوها للعرض والحقول معًا.
 */
export function padTime(t: string | null | undefined): string {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t.trim());
  if (!m) return t;
  return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
}

/**
 * سبب إقفال اليوم إن وُجد: عطلة مضافة، أو يوم خارج أيام الدوام الرسمية.
 * يُرجع null إن كان اليوم مفتوحًا للتسجيل.
 */
export async function dayLockReason(date: string): Promise<string | null> {
  const [holidays, working] = await Promise.all([
    prisma.holiday.findMany(),
    prisma.workingDays.findUnique({ where: { id: 1 } }),
  ]);

  const hit = holidays.find((h) => h.date === date);
  if (hit) return `اليوم عطلة رسمية — ${hit.name}`;

  let days: string[] = [];
  try {
    days = JSON.parse(working?.days || "[]");
  } catch {
    days = [];
  }
  // ما لم تُضبط أيام الدوام بعد، يبقى كل يوم مفتوحًا حتى لا يتعطّل المعهد.
  if (days.length === 0) return null;

  const name = weekdayName(date);
  if (!days.includes(name)) return `${name} ليس من أيام الدوام الرسمية`;

  return null;
}

/**
 * الفوج القلّاب يتناوب أسبوعًا بأسبوع. يُرجع أي وقت دوامه في هذا التاريخ
 * بالاعتماد على تاريخ بداية التناوب — أو null إن لم يُضبط بعد.
 */
export function rotationSlot(
  cohort: {
    isRotating: boolean;
    time1Start: string | null;
    time1End: string | null;
    time2Start: string | null;
    time2End: string | null;
    rotationStart: string | null;
  },
  date: string
): { start: string | null; end: string | null; which: 1 | 2 } | null {
  if (!cohort.isRotating) return null;
  if (!cohort.rotationStart || !isValidDate(cohort.rotationStart)) return null;

  const start = new Date(cohort.rotationStart + "T00:00:00").getTime();
  const cur = new Date(date + "T00:00:00").getTime();
  const weeks = Math.floor((cur - start) / (7 * 24 * 60 * 60 * 1000));
  const which = ((weeks % 2) + 2) % 2 === 0 ? 1 : 2;
  return which === 1
    ? { start: cohort.time1Start, end: cohort.time1End, which }
    : { start: cohort.time2Start, end: cohort.time2End, which };
}

/** نص وقت مقروء لعرض "من — إلى"، أو "غير محدَّد" إن لم يُضبط بعد. */
export function timeRangeLabel(start: string | null, end: string | null): string {
  if (!start && !end) return "غير محدَّد";
  if (start && end) return `${start} — ${end}`;
  return start || end || "غير محدَّد";
}

export function pageSpan(from: number | null, to: number | null): number {
  if (from == null || to == null) return 0;
  if (from < MIN_PAGE || to > MAX_PAGE || to < from) return 0;
  return to - from + 1;
}
