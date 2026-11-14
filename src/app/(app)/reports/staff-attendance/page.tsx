import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import type { StaffAttendanceRow } from "@/lib/staffAttendance";
import StaffAttendanceClient from "./StaffAttendanceClient";

export default async function StaffAttendanceReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  // «مراجعة التقرير» من السجل: الناتج المحفوظ يوم الإصدار
  const { review } = await searchParams;
  const saved = review ? await prisma.issuedReport.findUnique({ where: { id: review } }) : null;
  let initial: { id: string; name: string; from: string; to: string; totalDays: number; rows: StaffAttendanceRow[] } | null = null;
  if (saved && saved.kind === "STAFF_ATTENDANCE") {
    try {
      const p = JSON.parse(saved.paramsJson);
      initial = { id: saved.id, name: saved.name, from: saved.fromDate, to: saved.toDate, totalDays: p.totalDays ?? 0, rows: p.rows ?? [] };
    } catch {
      initial = null;
    }
  }

  const cohorts = await prisma.cohort.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <>
      <PageHeader
        title="حضور الموظفين"
        subtitle="من ملف البصّامة (.XLS، ورقة «سجلات»): أيام الدوام والغياب وتفصيل التأخير من بداية دوام الفوج وإجماليه — يُنزَّل ملف Excel."
      />
      <StaffAttendanceClient key={review ?? "new"} initial={initial} cohorts={cohorts} />
    </>
  );
}
