import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listOrphans, loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import OrphansReportClient from "./OrphansReportClient";

export default async function OrphansReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const [orphans, initial] = await Promise.all([listOrphans(), loadReviewInputs(review, "ORPHANS")]);

  return (
    <>
      <PageHeader title="الأيتام" subtitle="أسماء الطلاب الأيتام ثلاثية بحسب حالة الطالب، مرقّمة على نصفَي الصفحة." />
      <OrphansReportClient
        key={review ?? "new"}
        orphans={orphans}
        initialName={initial?.name ?? ""}
        initialStatus={initial?.status ?? "active"}
        // «مراجعة التقرير» من السجل: تُعرض قائمة يوم إصداره كما حُفظت
        frozen={initial?.names ? { names: initial.names, date: initial.from } : null}
      />
    </>
  );
}
