import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listMarkedAwqafBatches, loadReviewInputs } from "@/lib/reports";
import { formatDateAr } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import AwqafMarksClient from "./AwqafMarksClient";

export default async function AwqafMarksReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const [batches, initial] = await Promise.all([listMarkedAwqafBatches(), loadReviewInputs(review, "AWQAF_MARKS")]);

  return (
    <>
      <PageHeader title="علامات سبر الأوقاف" subtitle="اختر دفعة سُجّلت علاماتها — يظهر كل طالب فيها بنوع سبره ومدرّسه وحلقته وفوجه." />
      <AwqafMarksClient
        key={review ?? "new"}
        batches={batches.map((b) => ({ id: b.id, label: `دفعة ${formatDateAr(b.date)} — ${b.marked} من ${b.total} بعلامة` }))}
        initial={initial}
      />
    </>
  );
}
