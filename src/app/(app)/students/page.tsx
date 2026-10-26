import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma, rawPrisma, nameWithNasab, studentFullName } from "@/lib/db";
import { halqaWithTrack } from "@/lib/track";
import PageHeader from "@/components/PageHeader";
import StudentsClient from "./StudentsClient";
import { sunnahLevelsFor } from "@/lib/sunnahServer";
import { decryptPassword } from "@/lib/guardian";
import { dateOnly, formatDateAr } from "@/lib/daily";

export default async function StudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [studentsRaw, halaqatRaw] = await Promise.all([
    // العميل الخام: نموذج التعديل يحتاج اسم الطالب المخزَّن بلا نسبة (النسبة في حقلها المستقل)،
    // وأسماء العرض تُركَّب هنا صراحة مع النسبة
    rawPrisma.student.findMany({
      include: {
        halqa: { include: { cohort: true, teacher: true } },
        guardianUser: true,
        behaviorLog: { include: { actor: { select: { name: true, familyName: true } } }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { studentNo: "asc" },
    }),
    prisma.halqa.findMany({ include: { cohort: true, teacher: true }, orderBy: { name: "asc" } }),
  ]);

  // مستوى كل طالب في مناهج السنة النبوية الثلاثة
  const sunnahLevels = await sunnahLevelsFor(studentsRaw.map((s) => s.id));

  const students = studentsRaw.map((s) => ({
    id: s.id,
    no: String(s.studentNo),
    name: s.name,
    fullName: studentFullName(s.name, s.fatherName, s.familyName),
    father: s.fatherName || "",
    mother: s.motherName || "",
    familyName: s.familyName || "",
    birth: s.birthDate || "",
    birthPlace: s.birthPlace || "",
    address: s.address || "",
    job: s.fatherJob || "",
    phone: s.studentPhone || "",
    guardianPhone: s.guardianPhone || "",
    guardianPhone2: s.guardianPhone2 || "",
    photoUrl: s.photoUrl,
    registeredAt: s.registeredAt ? formatDateAr(dateOnly(s.registeredAt)) : "—",
    halqaId: s.halqaId || "",
    halqaName: s.halqa ? halqaWithTrack(s.halqa.name, s.halqa.track) : "—",
    cohortName: s.halqa?.cohort.name || "—",
    teacherName: s.halqa ? nameWithNasab(s.halqa.teacher.name, s.halqa.teacher.familyName) : "—",
    guardianUsername: s.guardianUser?.username || "",
    guardianPassword: decryptPassword(s.guardianUser?.passwordEnc) || "",
    behavior: s.behavior,
    active: s.active,
    isOrphan: s.isOrphan,
    feeStatus: s.feeStatus ?? "",
    feeAmount: s.feeAmount != null ? String(s.feeAmount) : "",
    track: s.track,
    promoted: !!s.promotedAt,
    stars: s.stars,
    sunnahLevels: sunnahLevels[s.id] ?? [],
    behaviorLog: s.behaviorLog.map((l) => ({
      previousValue: l.previousValue,
      newValue: l.newValue,
      note: l.note,
      by: nameWithNasab(l.actor.name, l.actor.familyName),
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
    track: h.track,
    // عدد طلاب الحلقة (النشطين) — يظهر عند الفرز بجوار المدرّس والفوج
    studentCount: studentsRaw.filter((s) => s.halqaId === h.id && s.active).length,
  }));

  return (
    <>
      <PageHeader title="شؤون الطلاب" subtitle="قائمة الطلاب وفرزهم على حلقة وفوج." />
      <StudentsClient students={students} halaqat={halaqat} />
    </>
  );
}
