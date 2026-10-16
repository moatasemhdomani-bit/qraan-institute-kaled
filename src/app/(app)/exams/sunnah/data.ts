import { prisma } from "@/lib/db";
import { today, weekdayName, inHoliday } from "@/lib/daily";
import { ALL_WEEKDAYS } from "@/lib/ui";
import type { SunnahSectionId } from "@/lib/sunnah";
import type { SunnahExamRow } from "./SunnahClient";

/** أيام الدوام في هذا الأسبوع (من السبت)، بلا العطل الرسمية — لتنبيه «سمّع يوميًا هذا الأسبوع» */
export async function workDatesThisWeek(): Promise<string[]> {
  const [working, holidays] = await Promise.all([prisma.workingDays.findUnique({ where: { id: 1 } }), prisma.holiday.findMany({ select: { date: true, endDate: true } })]);
  let days: string[] = [];
  try {
    days = JSON.parse(working?.days || "[]");
  } catch {
    days = [];
  }
  const t = today();
  const base = new Date(`${t}T12:00:00Z`);
  const idx = ALL_WEEKDAYS.indexOf(weekdayName(t));
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + (i - idx) * 86400000).toISOString().slice(0, 10);
    if ((days.length === 0 || days.includes(weekdayName(d))) && !holidays.some((h) => inHoliday(d, h))) out.push(d);
  }
  return out;
}

/** سبور السنة النبوية بصيغة العرض — لمنهج واحد أو للكل */
export async function loadSunnahExamRows(section?: SunnahSectionId, types?: SunnahExamRow["type"][]): Promise<SunnahExamRow[]> {
  const exams = await prisma.exam.findMany({
    where: {
      type: { in: types ?? ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_AWQAF", "SUNNAH_STAGE", "SUNNAH_PART"] },
      ...(section ? { sunnahSection: section } : {}),
    },
    include: { examiner: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return exams.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    type: e.type as SunnahExamRow["type"],
    section: e.sunnahSection as SunnahExamRow["section"],
    branch: e.stage ?? 1,
    date: e.date,
    mark: e.resultMark,
    repeat: e.repeat,
    grade: e.grade,
    stageNo: e.sunnahStage,
    notes: e.notes,
    examinerId: e.examinerId,
    examinerName: e.examiner.name,
    createdAt: e.createdAt.toISOString(),
  }));
}

/** الطلاب النشطون مع حلقاتهم ورصيد نجومهم */
export async function loadSunnahStudents() {
  const [students, halaqat] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      select: { id: true, name: true, studentNo: true, halqaId: true, stars: true },
      orderBy: { studentNo: "asc" },
    }),
    prisma.halqa.findMany({ select: { id: true, name: true } }),
  ]);
  const halqaNames = Object.fromEntries(halaqat.map((h) => [h.id, h.name]));
  return students.map((s) => ({ id: s.id, name: s.name, no: s.studentNo, stars: s.stars, halqaName: s.halqaId ? (halqaNames[s.halqaId] ?? null) : null }));
}
