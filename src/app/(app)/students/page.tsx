import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import StudentsClient from "./StudentsClient";
import { decryptPassword } from "@/lib/guardian";
import { dateOnly, formatDateAr } from "@/lib/daily";

export default async function StudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [studentsRaw, halaqatRaw] = await Promise.all([
    prisma.student.findMany({
      include: {
        halqa: { include: { cohort: true, teacher: true } },
        guardianUser: true,
        behaviorLog: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { studentNo: "asc" },
    }),
    prisma.halqa.findMany({ include: { cohort: true, teacher: true }, orderBy: { name: "asc" } }),
  ]);

  const students = studentsRaw.map((s) => ({
    id: s.id,
    no: String(s.studentNo),
    name: s.name,
    father: s.fatherName || "",
    mother: s.motherName || "",
    familyName: s.familyName || "",
    birth: s.birthDate || "",
    address: s.address || "",
    job: s.fatherJob || "",
    phone: s.studentPhone || "",
    guardianPhone: s.guardianPhone || "",
    photoUrl: s.photoUrl,
    registeredAt: formatDateAr(dateOnly(s.registeredAt)),
    halqaId: s.halqaId || "",
    halqaName: s.halqa?.name || "—",
    cohortName: s.halqa?.cohort.name || "—",
    teacherName: s.halqa?.teacher.name || "—",
    guardianUsername: s.guardianUser?.username || "",
    guardianPassword: decryptPassword(s.guardianUser?.passwordEnc) || "",
    behavior: s.behavior,
    behaviorLog: s.behaviorLog.map((l) => ({
      previousValue: l.previousValue,
      newValue: l.newValue,
      note: l.note,
      by: l.actor.name,
      date: formatDateAr(dateOnly(l.createdAt)),
    })),
  }));

  const halaqat = halaqatRaw.map((h) => ({
    id: h.id,
    name: h.name,
    cohortId: h.cohortId,
    cohortName: h.cohort.name,
    teacherId: h.teacherId,
    teacherName: h.teacher.name,
  }));

  return (
    <>
      <PageHeader title="الطلاب" subtitle="قائمة الطلاب وفرزهم على حلقة وفوج." />
      <StudentsClient students={students} halaqat={halaqat} />
    </>
  );
}
