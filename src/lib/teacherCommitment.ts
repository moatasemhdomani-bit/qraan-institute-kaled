import { prisma } from "./db";
import { weekdayName, inHoliday, today } from "./daily";

/** أكبر عدد أيام في التقرير */
export const COMMITMENT_MAX_DAYS = 62;

/** حالة التسميع كما في متابعة التسميع: مرفوع (لكل الطلاب) / غير مكتمل (لبعضهم) / لم يُرفع */
export type RecState = "full" | "partial" | "none";
export type CommitmentCell = { att: boolean; rec: RecState };
export type CommitmentRow = {
  halqaId: string;
  halqaName: string;
  teacherId: string;
  teacherName: string;
  cohortName: string;
  cells: Record<string, CommitmentCell>;
  totals: { attUp: number; attNo: number; recFull: number; recPartial: number; recNone: number };
};
export type CommitmentReport = { days: { date: string; label: string }[]; truncated: boolean; rows: CommitmentRow[] };

export const REC_LABELS: Record<RecState, string> = { full: "مرفوع", partial: "غير مكتمل", none: "لم يُرفع" };

/** المدرّسون الذين لهم حلقات — لاختيار مدرّس أو أكثر */
export async function listCommitmentTeachers(): Promise<{ id: string; name: string }[]> {
  const halaqat = await prisma.halqa.findMany({ select: { teacher: { select: { id: true, name: true } } } });
  const map = new Map(halaqat.map((h) => [h.teacher.id, h.teacher.name]));
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

/**
 * التزام المدرّسين بالموقع: صف لكل حلقة (المدرّس بأكثر من حلقة له صف لكل حلقة)، وعمود لكل يوم دوام في الفترة (حتى اليوم)،
 * وفي الخانة: رفع الحضور أو لم يرفعه، وحالة التسميع — ثم إجمالي كل حالة.
 * «مرفوع»: سُجّل تسميع كل طلاب الحلقة يومها (من سُجّل حضورهم، أو طلابها الحاليون إن لم يُسجَّل حضور).
 */
export async function buildTeacherCommitment(teacherIds: string[] | "all", from: string, to: string): Promise<CommitmentReport> {
  const end = to < today() ? to : today();
  const halaqat = await prisma.halqa.findMany({
    where: teacherIds === "all" ? {} : { teacherId: { in: teacherIds } },
    include: {
      teacher: { select: { id: true, name: true } },
      cohort: { select: { name: true } },
      students: { where: { active: true }, select: { id: true } },
    },
  });
  if (halaqat.length === 0 || from > end) return { days: [], truncated: false, rows: [] };

  const ids = halaqat.map((h) => h.id);
  const [working, holidays, atts, recs] = await Promise.all([
    prisma.workingDays.findUnique({ where: { id: 1 } }),
    prisma.holiday.findMany({ select: { date: true, endDate: true } }),
    prisma.attendance.findMany({ where: { halqaId: { in: ids }, date: { gte: from, lte: end } }, select: { halqaId: true, studentId: true, date: true } }),
    prisma.recitation.findMany({ where: { halqaId: { in: ids }, date: { gte: from, lte: end } }, select: { halqaId: true, studentId: true, date: true } }),
  ]);
  let workDays: string[] = [];
  try {
    workDays = JSON.parse(working?.days || "[]");
  } catch {
    workDays = [];
  }

  const days: string[] = [];
  for (let d = new Date(`${from}T12:00:00Z`), k = 0; k < 400 && days.length < COMMITMENT_MAX_DAYS; d = new Date(d.getTime() + 86400000), k++) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > end) break;
    if (workDays.length && !workDays.includes(weekdayName(iso))) continue;
    if (holidays.some((x) => inHoliday(iso, x))) continue;
    days.push(iso);
  }

  // halqaId:date → الطلاب
  const group = (xs: { halqaId: string; studentId: string; date: string }[]) => {
    const m = new Map<string, Set<string>>();
    for (const x of xs) {
      const k = `${x.halqaId}:${x.date}`;
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(x.studentId);
    }
    return m;
  };
  const attBy = group(atts);
  const recBy = group(recs);

  const rows: CommitmentRow[] = halaqat.map((h) => {
    const cells: Record<string, CommitmentCell> = {};
    const totals = { attUp: 0, attNo: 0, recFull: 0, recPartial: 0, recNone: 0 };
    for (const d of days) {
      const attSet = attBy.get(`${h.id}:${d}`);
      const recSet = recBy.get(`${h.id}:${d}`);
      const att = !!attSet && attSet.size > 0;
      const expected = att ? [...attSet!] : h.students.map((s) => s.id);
      const rec: RecState = !recSet || recSet.size === 0 ? "none" : expected.every((id) => recSet.has(id)) ? "full" : "partial";
      cells[d] = { att, rec };
      if (att) totals.attUp++;
      else totals.attNo++;
      if (rec === "full") totals.recFull++;
      else if (rec === "partial") totals.recPartial++;
      else totals.recNone++;
    }
    return { halqaId: h.id, halqaName: h.name, teacherId: h.teacher.id, teacherName: h.teacher.name, cohortName: h.cohort.name, cells, totals };
  });
  rows.sort((a, b) => a.teacherName.localeCompare(b.teacherName, "ar") || a.halqaName.localeCompare(b.halqaName, "ar"));

  return {
    days: days.map((d) => ({ date: d, label: `${weekdayName(d)} ${d.slice(8, 10)}/${d.slice(5, 7)}` })),
    truncated: days.length >= COMMITMENT_MAX_DAYS,
    rows,
  };
}
