import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import HadithReportClient from "./HadithReportClient";

export default async function HadithReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const initial = await loadReviewInputs(review, "HADITH");

  return (
    <>
      <PageHeader
        title="تقرير الحديث الشريف"
        subtitle="صف لكل مدرّس: حلقاته، عدد طلابه، المشاركون وغير المشاركين في الحديث الشريف، سبرهم (مرحلة وقسم ومستوى)، وإجمالي أحاديثهم."
      />
      <HadithReportClient key={review ?? "new"} initial={initial} />
    </>
  );
}
