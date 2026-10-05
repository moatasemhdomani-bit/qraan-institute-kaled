import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ImportClient from "./ImportClient";

export default async function StudentImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [teachers, cohorts] = await Promise.all([
    prisma.user.findMany({ where: { assignments: { some: { role: "TEACHER" } }, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="استيراد طلاب" subtitle="من جدول «سجل الطلاب» على Google Sheets — مدرّسًا مدرّسًا، بمعاينة كاملة قبل أي تسجيل." />
      <ImportClient teachers={teachers} cohorts={cohorts} />
    </>
  );
}
