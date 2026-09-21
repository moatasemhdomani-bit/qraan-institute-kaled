import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import StudentReportClient from "./StudentReportClient";

export default async function StudentReportPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { student: studentId } = await searchParams;
  const preselected = studentId
    ? await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true, studentNo: true } })
    : null;

  return (
    <>
      <PageHeader title="تقرير طالب" subtitle="حضوره وتسميعه واختباراته الثلاثة وسلوكه." />
      <StudentReportClient
        preselected={preselected ? { id: preselected.id, no: String(preselected.studentNo), name: preselected.name } : null}
      />
    </>
  );
}
