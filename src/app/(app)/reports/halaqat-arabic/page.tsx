import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import ArabicHalaqatReportClient from "./ArabicHalaqatReportClient";

export default async function ArabicHalaqatReportPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const [halaqat, initial] = await Promise.all([
    prisma.halqa.findMany({ where: { track: "ARABIC" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    loadReviewInputs(review, "HALAQAT_AR"),
  ]);

  return (
    <>
      <PageHeader
        title="تقرير تسميع حلقات القراءة العربية"
        subtitle="بلوك لكل حلقة، وصف لكل طالب: من/إلى الصفحة وإجماليها، واختباراته بأرقام مراحلها (الأخضر ناجح والأحمر إعادة)."
      />
      <ArabicHalaqatReportClient key={review ?? "new"} halaqat={halaqat.map((h) => ({ id: h.id, name: h.name }))} initial={initial} />
    </>
  );
}
