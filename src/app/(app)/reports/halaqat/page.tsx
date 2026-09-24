import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import HalaqatReportClient from "./HalaqatReportClient";

export default async function HalaqatReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const [halaqat, initial] = await Promise.all([
    prisma.halqa.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    loadReviewInputs(review, "HALAQAT"),
  ]);

  return (
    <>
      <PageHeader title="تقرير تسميع الحلقات" subtitle="بلوك لكل حلقة باسمها واسم أستاذها، ثم صف لكل طالب بإجمالي الفترة كاملة." />
      <HalaqatReportClient key={review ?? "new"} halaqat={halaqat} initial={initial} />
    </>
  );
}
