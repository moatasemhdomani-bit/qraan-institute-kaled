import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [staffRaw, cohorts] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER"] } },
      include: { halaqatTaught: { include: { cohort: true } }, teachableCohorts: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cohort.findMany({ orderBy: { id: "asc" } }),
  ]);

  const staff = staffRaw.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    phone: u.phone || "",
    photoUrl: u.photoUrl,
    father: u.fatherName || "",
    mother: u.motherName || "",
    family: u.familyName || "",
    birth: u.birthDate || "",
    nid: u.nationalId || "",
    address: u.address || "",
    job: u.currentJob || "",
    marital: u.maritalStatus || "",
    education: u.education || "",
    quran: u.quranLevel || "",
    halqaLabel: u.halaqatTaught.length ? u.halaqatTaught.map((h) => `${h.name} · ${h.cohort.name}`).join("، ") : "—",
    cohortIds: u.teachableCohorts.map((c) => c.cohortId),
  }));

  return (
    <>
      <PageHeader title="إدارة المستخدمين" subtitle="قائمة العاملين وتسجيلهم — مدير، إداري، مدرس، مختبِر." />
      <UsersClient staff={staff} cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))} isDirector={session.role === "DIRECTOR"} />
    </>
  );
}
