import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import AuditClient from "./AuditClient";
import { formatDateTimeAr } from "@/lib/daily";

/** عدد ما يُعرض من السجل (الأحدث أولًا) */
const LIMIT = 3000;

/** تاريخ اليوم بتوقيت دمشق YYYY-MM-DD — لفلترة «من تاريخ / إلى تاريخ» */
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Damascus", year: "numeric", month: "2-digit", day: "2-digit" });

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR") redirect("/dashboard");

  const [rows, reports, students] = await Promise.all([
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: LIMIT }),
    // التقارير الصادرة تُعرض في السجل عملياتٍ من نوع «تقرير»
    prisma.issuedReport.findMany({ include: { issuedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.student.findMany({ select: { id: true, name: true, studentNo: true }, orderBy: { studentNo: "asc" } }),
  ]);

  const audit = [
    ...rows.map((r) => ({ id: r.id, who: r.actor.name, what: r.action, at: r.createdAt })),
    ...reports.map((r) => ({ id: `rep-${r.id}`, who: r.issuedBy.name, what: `أصدر تقرير «${r.name}»`, at: r.createdAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((r) => ({ id: r.id, who: r.who, what: r.what, when: formatDateTimeAr(r.at), day: DAY.format(r.at) }));

  return (
    <>
      <PageHeader title="سجل التدقيق" subtitle="من عدّل ماذا ومتى. يراه مدير المعهد وحده." />
      <AuditClient rows={audit} students={students.map((s) => ({ id: s.id, name: s.name, no: s.studentNo }))} limit={LIMIT} />
    </>
  );
}
