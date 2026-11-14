import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import FinanceReportClient from "./FinanceReportClient";

export default async function FinanceReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const initial = await loadReviewInputs(review, "FINANCE");

  return (
    <>
      <PageHeader title="تقرير المالية" subtitle="عمليات صندوق المعهد في الفترة: التاريخ والعملية والسبب والفاعل والمبلغ، مع رصيد أول الفترة وآخرها." />
      <FinanceReportClient key={review ?? "new"} initial={initial} />
    </>
  );
}
