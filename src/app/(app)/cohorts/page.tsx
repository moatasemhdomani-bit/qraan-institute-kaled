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
    prisma.cohort.findMany({ include: { teachers: { include: { user: true } } }, orderBy: { id: "asc" } }),
    prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { name: "asc" } }),
  ]);

  const cohorts = cohortsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    isRotating: c.isRotating,
    time1: c.time1 || "",
    time2: c.time2 || "",
    teachers: c.teachers.map((t) => ({ id: t.userId, name: t.user.name })),
  }));

  return (
    <>
      <PageHeader title="إدارة الأفواج" subtitle="خمسة أفواج ثابتة الأسماء — يُحدَّد توقيتها فقط." />
      <CohortsClient cohorts={cohorts} allTeachers={teachers.map((t) => ({ id: t.id, name: t.name }))} />
    </>
  );
}
