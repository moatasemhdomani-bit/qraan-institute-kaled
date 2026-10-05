import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import ArabicTeachersReportClient from "./ArabicTeachersReportClient";

export default async function ArabicTeachersReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const initial = await loadReviewInputs(review, "TEACHERS_AR");

  return (
    <>
      <PageHeader
        title="التقرير الشهري لمدرسي القراءة العربية"
        subtitle="صف لكل مدرّس: حلقاته في كل الأفواج، مجموع صفحات طلابه، اختباراتهم الناجحة والمُعادة، عدد طلابه، وملاحظات الإدارة."
      />
      <ArabicTeachersReportClient key={review ?? "new"} initial={initial} />
    </>
  );
}
