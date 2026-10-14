import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { softButtonStyle, primaryButtonStyle } from "@/lib/ui";
import { formatDateAr } from "@/lib/daily";
import BatchDetailClient from "./BatchDetailClient";
import { sunnahBranchLabel } from "@/lib/sunnah";

export default async function AwqafBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") redirect("/dashboard");

  const { id } = await params;
  const batch = await prisma.awqafBatch.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      results: { include: { student: { select: { id: true, name: true, studentNo: true } } } },
    },
  });

  if (!batch) notFound();

  const results = batch.results
    .map((r) => ({
      id: r.id,
      student: { id: r.student.id, no: r.student.studentNo, name: r.student.name },
      score: r.score,
      nominationPresent: r.nominationPresent,
      // دفعة السنّة: المنهج والمستوى (حدّ النجاح 80)
      sunnahLabel: r.sunnahSection && r.sunnahLevel ? sunnahBranchLabel(r.sunnahSection, r.sunnahLevel, false) : null,
      certArrived: r.certArrived,
      certArchived: r.certArchived,
      certFileUrl: r.certFileUrl,
      certDelivered: r.certDelivered,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, "ar"));

  return (
    <>
      <PageHeader
        title={`دفعة ${formatDateAr(batch.date)} — ${batch.kind === "SUNNAH" ? "السنّة النبوية" : "القرآن الكريم"}`}
        subtitle={`فتحها ${batch.createdBy.name} — ${results.length} طالبًا · ${batch.kind === "SUNNAH" ? "حدّ النجاح 80" : "حدّ النجاح 90 حاضرًا و80 غيبًا"}`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              // ملف الترشيح بقالب الأوقاف (القرآن أو السنّة)، مملوءًا من بيانات طلاب الدفعة
              <a href={`/exams/awqaf-batches/${batch.id}/excel`} download style={{ ...primaryButtonStyle, textDecoration: "none", display: "inline-block" }}>
                تنزيل Excel
              </a>
            )}
            <Link href="/exams/awqaf-batches" style={{ ...softButtonStyle, textDecoration: "none", display: "inline-block" }}>
              ← كل الدفعات
            </Link>
          </div>
        }
      />
      <BatchDetailClient batchId={batch.id} batchFileUrl={batch.certFileUrl} results={results} />
    </>
  );
}
