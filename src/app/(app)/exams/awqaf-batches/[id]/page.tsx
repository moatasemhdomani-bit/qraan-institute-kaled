import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { softButtonStyle } from "@/lib/ui";
import { formatDateAr } from "@/lib/daily";
import BatchDetailClient from "./BatchDetailClient";

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
      certArrived: r.certArrived,
      certArchived: r.certArchived,
      certFileUrl: r.certFileUrl,
      certDelivered: r.certDelivered,
    }))
    .sort((a, b) => a.student.name.localeCompare(b.student.name, "ar"));

  return (
    <>
      <PageHeader
        title={`دفعة ${formatDateAr(batch.date)}`}
        subtitle={`فتحها ${batch.createdBy.name} — ${results.length} طالبًا · حدّ النجاح 90 حاضرًا و80 غيبًا`}
        action={
          <Link href="/exams/awqaf-batches" style={{ ...softButtonStyle, textDecoration: "none", display: "inline-block" }}>
            ← كل الدفعات
          </Link>
        }
      />
      <BatchDetailClient batchId={batch.id} results={results} />
    </>
  );
}
