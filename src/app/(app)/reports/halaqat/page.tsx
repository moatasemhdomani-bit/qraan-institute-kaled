import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import HalaqatReportClient from "./HalaqatReportClient";

export default async function HalaqatReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const halaqat = await prisma.halqa.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <>
      <PageHeader title="تقرير تسميع الحلقات" subtitle="بلوك لكل حلقة باسمها واسم أستاذها، ثم صف لكل طالب بإجمالي الفترة كاملة." />
      <HalaqatReportClient halaqat={halaqat} />
    </>
  );
}
