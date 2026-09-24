import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import TeachersReportClient from "./TeachersReportClient";

export default async function TeachersReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const initial = await loadReviewInputs(review, "TEACHERS");

  return (
    <>
      <PageHeader title="التقرير الشهري للمدرسين" subtitle="صف واحد لكل مدرّس بأرقام الفترة المختارة — النطاق حرّ لا شهر مقفل." />
      <TeachersReportClient key={review ?? "new"} initial={initial} />
    </>
  );
}
