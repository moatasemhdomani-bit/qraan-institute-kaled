import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { monthRange, monthLabel, recentMonths, pagesSummary, localSplit, nominationSplit, realAwqafSplit } from "@/lib/reports";
import MonthlyReportClient from "./MonthlyReportClient";

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; halqa?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/dashboard");

  const { month: monthParam, halqa: halqaParam } = await searchParams;
  const months = recentMonths(3);
  const month = monthParam && months.includes(monthParam) ? monthParam : months[0];

  const halaqat = await prisma.halqa.findMany({
    where: { teacherId: session.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (halaqat.length === 0) {
    return (
      <>
        <PageHeader title="التقرير الشهري" subtitle="تقرير حلقتك الشهري كاملًا — أرقامه محسوبة، وعمود الملاحظات تكتبه أنت." />
        <div style={{ padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا حلقة مُسندة إليك بعد.</div>
      </>
    );
  }

  const halqaId = halaqat.find((h) => h.id === halqaParam)?.id ?? halaqat[0].id;
  const { from, to } = monthRange(month);

  const students = await prisma.student.findMany({ where: { halqaId }, orderBy: { name: "asc" } });
  const studentIds = students.map((s) => s.id);

  const [recitations, localExams, nomExams, awqafResults, notes] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId: { in: studentIds }, batch: { date: { gte: from, lte: to } } } }),
    prisma.teacherMonthlyNote.findMany({ where: { studentId: { in: studentIds }, month } }),
  ]);

  const rows = students.map((s) => {
    const pages = pagesSummary(recitations.filter((r) => r.studentId === s.id));
    const loc = localSplit(localExams.filter((e) => e.studentId === s.id));
    const nom = nominationSplit(nomExams.filter((e) => e.studentId === s.id));
    const real = realAwqafSplit(awqafResults.filter((r) => r.studentId === s.id));
    const note = notes.find((n) => n.studentId === s.id)?.note ?? "";
    return {
      studentId: s.id,
      studentName: s.name,
      from: pages.from, to: pages.to, newTotal: pages.newTotal, pastTotal: pages.pastTotal,
      locPass: loc.pass, locFail: loc.fail,
      nomPass: nom.pass, nomFail: nom.fail,
      realPass: real.pass, realFail: real.fail,
      note,
    };
  });

  return (
    <>
      <PageHeader title="التقرير الشهري" subtitle="تقرير حلقتك الشهري كاملًا — أرقامه محسوبة، وعمود الملاحظات تكتبه أنت." />
      <MonthlyReportClient
        halaqat={halaqat}
        halqaId={halqaId}
        months={months.map((m) => ({ id: m, label: monthLabel(m) }))}
        month={month}
        rows={rows}
      />
    </>
  );
}
