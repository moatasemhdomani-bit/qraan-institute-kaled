import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { loadReviewInputs } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import StudentReportClient from "./StudentReportClient";

export default async function StudentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; review?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { student, review } = await searchParams;
  const initial = await loadReviewInputs(review, "STUDENT");
  const studentId = initial?.studentId ?? student;
  const preselected = studentId
    ? await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true, studentNo: true } })
    : null;

  return (
    <>
      <PageHeader title="تقرير طالب" subtitle="حضوره وتسميعه واختباراته الثلاثة وسلوكه." />
      <StudentReportClient
        key={review ?? student ?? "new"}
        preselected={preselected ? { id: preselected.id, no: String(preselected.studentNo), name: preselected.name } : null}
        initial={initial && preselected ? initial : null}
      />
    </>
  );
}
