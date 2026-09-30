import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma, rawPrisma, nameWithNasab } from "@/lib/db";
import { halqaWithTrack } from "@/lib/track";
import { decryptPassword } from "@/lib/guardian";
import PageHeader from "@/components/PageHeader";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR") redirect("/dashboard");

  const [staffRaw, cohorts] = await Promise.all([
    // العميل الخام: نموذج التعديل يحتاج الاسم المخزَّن بلا نسبة، والنسبة في حقلها المستقل
    rawPrisma.user.findMany({
      where: { role: { in: ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER"] }, deletedAt: null },
      include: { halaqatTaught: { include: { cohort: true } }, teachableCohorts: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cohort.findMany({ orderBy: { id: "asc" } }),
  ]);

  const staff = staffRaw.map((u) => ({
    id: u.id,
    name: u.name,
    fullName: nameWithNasab(u.name, u.familyName),
    username: u.username,
    role: u.role,
    track: u.track,
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
    halqaLabel: u.halaqatTaught.length ? u.halaqatTaught.map((h) => `${halqaWithTrack(h.name, h.track)} · ${h.cohort.name}`).join("، ") : "—",
    cohortIds: u.teachableCohorts.map((c) => c.cohortId),
    currentPassword: decryptPassword(u.passwordEnc) || "",
  }));

  return (
    <>
      <PageHeader title="إدارة المستخدمين" subtitle="قائمة العاملين وتسجيلهم — مدير، إداري، مدرس، مختبِر." />
      <UsersClient staff={staff} cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))} isDirector={session.role === "DIRECTOR"} />
    </>
  );
}
