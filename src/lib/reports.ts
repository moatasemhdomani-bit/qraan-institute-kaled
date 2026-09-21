import { pageSpan } from "./daily";
import { passFailLabel } from "./exam";
import { awqafPassed } from "./awqaf";

type RecitationRow = {
  date: string;
  newFrom: number | null;
  newTo: number | null;
  pastFrom: number | null;
  pastTo: number | null;
};

/**
 * من/إلى صفحة: أول وآخر صفحة تسميع جديد بترتيب التاريخ ضمن الفترة.
 * الجديد والماضي مفصولان دائمًا — الماضي مراجعة حرّة لا تُحسب مع تقدّم الحفظ الجديد.
 */
export function pagesSummary(recitations: RecitationRow[]): { from: number | null; to: number | null; newTotal: number; pastTotal: number } {
  const sorted = [...recitations].sort((a, b) => a.date.localeCompare(b.date));
  const withNew = sorted.filter((r) => r.newFrom != null && r.newTo != null);
  const newTotal = recitations.reduce((sum, r) => sum + pageSpan(r.newFrom, r.newTo), 0);
  const pastTotal = recitations.reduce((sum, r) => sum + pageSpan(r.pastFrom, r.pastTo), 0);
  return {
    from: withNew[0]?.newFrom ?? null,
    to: withNew[withNew.length - 1]?.newTo ?? null,
    newTotal,
    pastTotal,
  };
}

type LocalExamRow = { localKind: "GHAYBAN" | "HADIRAN" | "AMMA_GHAYBAN" | null; resultMark: number | null };

/** عدد اختبارات السبر المحلي الناجحة/الراسبة — بحدود النجاح الفعلية حسب فرع السبر (90 حاضراً، 80 غيباً/عمّ غيباً). */
export function localSplit(exams: LocalExamRow[]): { pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const e of exams) {
    const label = passFailLabel({ type: "LOCAL", localKind: e.localKind, resultMark: e.resultMark });
    if (label === "ناجح") pass++;
    else if (label === "راسب") fail++;
  }
  return { pass, fail };
}

type NominationExamRow = { resultMark: number | null; nominationPresent: boolean | null };

/** عدد اختبارات ترشيح الأوقاف الداخلي الناجحة/الراسبة — 90 حاضرًا (تلاوة) أو 80 غيبًا (حفظ). */
export function nominationSplit(exams: NominationExamRow[]): { pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const e of exams) {
    const label = passFailLabel({ type: "WAQF_NOMINATION", resultMark: e.resultMark, nominationPresent: e.nominationPresent });
    if (label === "ناجح") pass++;
    else if (label === "راسب") fail++;
  }
  return { pass, fail };
}

type AwqafResultRow = { score: number | null; nominationPresent: boolean };

/** عدد نتائج سبر الأوقاف الفعلي الناجحة/الراسبة — نفس حدّ مسار ترشيح كل طالب. */
export function realAwqafSplit(results: AwqafResultRow[]): { pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const r of results) {
    const passed = awqafPassed(r.score, r.nominationPresent);
    if (passed === true) pass++;
    else if (passed === false) fail++;
  }
  return { pass, fail };
}

const MONTH_NAMES = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

/** اسم الشهر بالعربية من "YYYY-MM". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${y}`;
}

/** أول وآخر يوم من شهر "YYYY-MM"، بصيغة YYYY-MM-DD. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/** الشهر الحالي وآخر شهرين قبله، بصيغة "YYYY-MM" — للاختيار في شاشة ملاحظات المدرّس الشهرية. */
export function recentMonths(count = 3): string[] {
  const out: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m < 1) { m = 12; y--; }
  }
  return out;
}

/** "YYYY-MM" لكل شهر تقويمي تتقاطع معه فترة [from, to] — لجلب ملاحظات المدرّسين الشهرية المطابقة. */
export function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}
