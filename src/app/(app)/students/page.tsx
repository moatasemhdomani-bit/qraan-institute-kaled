import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import StudentsClient from "./StudentsClient";
import { decryptPassword } from "@/lib/guardian";

export default async function StudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [studentsRaw, halaqatRaw] = await Promise.all([
    prisma.student.findMany({
      include: { halqa: { include: { cohort: true } }, guardianUser: true },
      orderBy: { studentNo: "asc" },
    }),
    prisma.halqa.findMany({ include: { cohort: true }, orderBy: { name: "asc" } }),
  ]);

  const students = studentsRaw.map((s) => ({
    id: s.id,
    no: String(s.studentNo),
    name: s.name,
    father: s.fatherName || "",
    mother: s.motherName || "",
    birth: s.birthDate || "",
    address: s.address || "",
    job: s.fatherJob || "",
    phone: s.studentPhone || "",
    guardianPhone: s.guardianPhone || "",
    photoUrl: s.photoUrl,
    registeredAt: s.registeredAt.toLocaleDateString("ar-SY"),
    halqaId: s.halqaId || "",
    halqaName: s.halqa?.name || "—",
    cohortName: s.halqa?.cohort.name || "—",
    guardianUsername: s.guardianUser?.username || "",
    guardianPassword: decryptPassword(s.guardianUser?.passwordEnc) || "",
  }));

  const halaqat = halaqatRaw.map((h) => ({ id: h.id, name: h.name, cohortName: h.cohort.name }));

  return (
    <>
      <PageHeader title="الطلاب" subtitle="قائمة الطلاب وفرزهم على حلقة وفوج." />
      <StudentsClient students={students} halaqat={halaqat} />
    </>
  );
}
