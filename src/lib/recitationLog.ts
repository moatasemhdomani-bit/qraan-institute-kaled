import { prisma } from "./db";
import { weekdayName, inHoliday, holidayDaysIn } from "./daily";
import { parsePastItems, pastSummary } from "./pastRecitation";

/** أكبر عدد أيام في سجل التسميع */
export const LOG_MAX_DAYS = 62;

export type LogCell = { none: boolean; fresh: string; past: string };
export type LogDay = { date: string; label: string; holiday: string | null };
export type LogBlock = {
  halqaId: string;
  halqaName: string;
  teacherName: string;
  cohortName: string;
  /** حلقة القراءة العربية: بلا ماضٍ */
  arabic: boolean;
  days: LogDay[];
  truncated: boolean;
  rows: { studentId: string; studentName: string; cells: Record<string, LogCell> }[];
};

/**
 * سجل التسميع: لكل حلقة — أيام الدوام في الفترة أعمدةً (ومعها أيام العطل باسمها، وأي يوم سُجّل فيه تسميع)،
 * وطلابها سطورًا، والخانة تسميع الطالب يومها: الجديد والماضي بتقديرهما.
 */
export async function buildRecitationLog(halqaIds: string[] | "all", from: string, to: string): Promise<LogBlock[]> {
  const halaqat = await prisma.halqa.findMany({
    where: halqaIds === "all" ? {} : { id: { in: halqaIds } },
    include: {
      teacher: { select: { name: true } },
      cohort: { select: { name: true } },
      students: { where: { active: true }, select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  if (halaqat.length === 0 || from > to) return [];

  const [working, holidays, recs, holidayNames] = await Promise.all([
    prisma.workingDays.findUnique({ where: { id: 1 } }),
    prisma.holiday.findMany({ select: { date: true, endDate: true } }),
    prisma.recitation.findMany({ where: { halqaId: { in: halaqat.map((h) => h.id) }, date: { gte: from, lte: to } } }),
    holidayDaysIn(from, to),
  ]);
  let workDays: string[] = [];
  try {
    workDays = JSON.parse(working?.days || "[]");
  } catch {
    workDays = [];
  }

  return halaqat.map((h) => {
    const arabic = h.track === "ARABIC";
    const mine = recs.filter((r) => r.halqaId === h.id);
    const recDates = new Set(mine.map((r) => r.date));
    const days: string[] = [];
    for (let d = new Date(`${from}T12:00:00Z`); days.length < LOG_MAX_DAYS; d = new Date(d.getTime() + 86400000)) {
      const iso = d.toISOString().slice(0, 10);
      if (iso > to) break;
      const isWork = (workDays.length === 0 || workDays.includes(weekdayName(iso))) && !holidays.some((x) => inHoliday(iso, x));
      if (isWork || recDates.has(iso) || holidayNames.has(iso)) days.push(iso);
    }
    const cellOf = (r: (typeof mine)[number]): LogCell => {
      if (r.none) return { none: true, fresh: "لم يسمّع", past: "" };
      let fresh = "";
      if (r.examPrep) fresh = "تحضير للسبر";
      else if (r.noNew) fresh = "لا جديد";
      else if (r.surahs.length) fresh = r.surahs.map((x) => (r.surahsDone.includes(x) ? `${x} ✓` : x)).join("، ");
      else if (r.newFrom != null && r.newTo != null)
        fresh = r.newFrom === r.newTo ? `ص ${r.newFrom}${r.pageDone === false ? " (لم تتم)" : ""}` : `ص ${r.newFrom}–${r.newTo}`;
      if (fresh && !r.noNew && r.gradeNew) fresh += ` (${r.gradeNew})`;
      const past = arabic ? "" : r.noPast ? "لم يقرأ" : pastSummary(parsePastItems(r.pastItems));
      return { none: false, fresh, past };
    };
    return {
      halqaId: h.id,
      halqaName: h.name,
      teacherName: h.teacher.name,
      cohortName: h.cohort.name,
      arabic,
      days: days.map((d) => ({ date: d, label: `${weekdayName(d)} ${d.slice(8, 10)}/${d.slice(5, 7)}`, holiday: holidayNames.get(d) ?? null })),
      truncated: days.length >= LOG_MAX_DAYS,
      rows: h.students
        .slice()
        .sort((x, y) => x.name.localeCompare(y.name, "ar"))
        .map((st) => ({
          studentId: st.id,
          studentName: st.name,
          cells: Object.fromEntries(mine.filter((r) => r.studentId === st.id).map((r) => [r.date, cellOf(r)])),
        })),
    };
  });
}
