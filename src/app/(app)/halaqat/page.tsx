import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import HalaqatClient from "./HalaqatClient";

export default async function HalaqatPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [halaqatRaw, teachers, cohorts] = await Promise.all([
    prisma.halqa.findMany({
      include: { teacher: true, cohort: true, _count: { select: { students: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ orderBy: { name: "asc" } }),
  ]);

  const halaqat = halaqatRaw.map((h) => ({
    id: h.id,
    name: h.name,
    teacherId: h.teacherId,
    teacherName: h.teacher.name,
    cohortId: h.cohortId,
    cohortName: h.cohort.name,
    count: h._count.students,
  }));

  return (
    <>
      <PageHeader title="إدارة الحلقات" subtitle="الحلقات مجمّعة حسب الفوج — الأفواج نفسها تُدار من «إدارة الأفواج»." />
      <HalaqatClient
        halaqat={halaqat}
        teachers={teachers.map((t) => ({ id: t.id, name: t.name }))}
        cohorts={cohorts.map((c) => ({ id: c.id, name: c.name, isRotating: c.isRotating }))}
      />
    </>
  );
}
