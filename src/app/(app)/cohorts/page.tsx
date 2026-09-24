import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import CohortsClient from "./CohortsClient";

export default async function CohortsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [cohortsRaw, teachers] = await Promise.all([
    prisma.cohort.findMany({ include: { teachers: { include: { user: true } }, _count: { select: { halaqat: true } } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { name: "asc" } }),
  ]);

  const cohorts = cohortsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    isRotating: c.isRotating,
    time1Start: c.time1Start || "",
    time1End: c.time1End || "",
    time2Start: c.time2Start || "",
    time2End: c.time2End || "",
    rotationStart: c.rotationStart || "",
    halaqatCount: c._count.halaqat,
    teachers: c.teachers.map((t) => ({ id: t.userId, name: t.user.name })),
  }));

  return (
    <>
      <PageHeader title="إدارة الأفواج" subtitle="توقيت كل فوج ومدرّسوه المُسندون — ويمكن إضافة فوج جديد." />
      <CohortsClient cohorts={cohorts} allTeachers={teachers.map((t) => ({ id: t.id, name: t.name }))} />
    </>
  );
}
