import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { today, weekdayName } from "@/lib/daily";
import { ALL_WEEKDAYS } from "@/lib/ui";

/** أيام الدوام في هذا الأسبوع (من السبت)، بلا العطل الرسمية — لتنبيه «سمّع يوميًا هذا الأسبوع» */
async function workDatesThisWeek(): Promise<string[]> {
  const [working, holidays] = await Promise.all([prisma.workingDays.findUnique({ where: { id: 1 } }), prisma.holiday.findMany({ select: { date: true } })]);
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
    if ((days.length === 0 || days.includes(weekdayName(d))) && !holidays.some((h) => h.date === d)) out.push(d);
  }
  return out;
}
import SunnahClient, { type SunnahExamRow } from "./SunnahClient";

/** سبر السنة النبوية: لكل طلاب المعهد — المحلي لمختبر الحديث، وسبر الأوقاف تُدخله الإدارة. */
export default async function SunnahExamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.role;
  if (role !== "SUNNAH_EXAMINER" && role !== "DIRECTOR" && role !== "ADMIN") redirect("/dashboard");

  const [studentsRaw, halaqat, exams, recs] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      select: { id: true, name: true, studentNo: true, halqaId: true, stars: true },
      orderBy: { studentNo: "asc" },
    }),
    prisma.halqa.findMany({ select: { id: true, name: true } }),
    prisma.exam.findMany({
      where: { type: { in: ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_AWQAF", "SUNNAH_STAGE"] } },
      include: { examiner: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.sunnahRecitation.findMany({
      include: { examiner: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const halqaNames = Object.fromEntries(halaqat.map((h) => [h.id, h.name]));

  const rows: SunnahExamRow[] = exams.map((e) => ({
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
  }));

  // المحلي لمختبر الحديث والمدير، والأوقاف للإدارة
  const canLocal = role === "SUNNAH_EXAMINER" || role === "DIRECTOR";
  const canAwqaf = role === "DIRECTOR" || role === "ADMIN";

  return (
    <>
      <PageHeader
        title="سبر السنة النبوية"
        subtitle="الحديث الشريف، والشمائل المحمدية، والسيرة النبوية — كل قسم فرعًا بعد فرع، والنجاح من 80."
      />
      <SunnahClient
        students={studentsRaw.map((s) => ({ id: s.id, name: s.name, no: s.studentNo, stars: s.stars, halqaName: s.halqaId ? (halqaNames[s.halqaId] ?? null) : null }))}
        weekDates={await workDatesThisWeek()}
        today={today()}
        exams={rows}
        recitations={recs.map((r) => ({
          id: r.id,
          studentId: r.studentId,
          section: r.section,
          book: r.book,
          fromNo: r.fromNo,
          toNo: r.toNo,
          grade: r.grade,
          date: r.date,
          createdAt: r.createdAt.toISOString(),
          notes: r.notes,
          examinerId: r.examinerId,
          examinerName: r.examiner.name,
        }))}
        canRecite={role === "SUNNAH_EXAMINER" || role === "DIRECTOR"}
        canLocal={canLocal}
        canAwqaf={canAwqaf}
        isDirector={role === "DIRECTOR"}
        canDeleteAny={role === "DIRECTOR" || role === "ADMIN"}
        currentUserId={session.userId}
      />
    </>
  );
}
