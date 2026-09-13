import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [workingDaysRow, holidays] = await Promise.all([
    prisma.workingDays.findUnique({ where: { id: 1 } }),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
  ]);

  const days: string[] = workingDaysRow ? JSON.parse(workingDaysRow.days || "[]") : [];

  return (
    <>
      <PageHeader title="الدوام والعطل" subtitle="أيام الأسبوع الرسمية وقائمة العطل." />
      <ScheduleClient
        activeDays={days}
        holidays={holidays.map((h) => ({ id: h.id, name: h.name, date: h.date }))}
      />
    </>
  );
}
