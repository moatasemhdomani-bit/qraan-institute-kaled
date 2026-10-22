import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import RecitationLogReportClient from "./RecitationLogReportClient";

/** «سجل التسميع» للإدارة: حلقة أو أكثر أو الكل — أيام الدوام أعمدةً والطلاب سطورًا. */
export default async function RecitationLogReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const [halaqat, initial] = await Promise.all([
    prisma.halqa.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, cohort: { select: { name: true } } } }),
    loadReviewInputs(review, "RECITATION_LOG"),
  ]);

  return (
    <>
      <PageHeader
        title="سجل التسميع"
        subtitle="اختاروا حلقة أو أكثر (أو الكل) والفترة: أيام الدوام أعمدةً والطلاب سطورًا، وفي كل خانة تسميع الطالب يومها — الجديد والماضي بتقديرهما."
      />
      <RecitationLogReportClient
        key={review ?? "new"}
        halaqat={halaqat.map((h) => ({ id: h.id, name: h.name, cohortName: h.cohort.name }))}
        initial={initial}
      />
    </>
  );
}
