import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { starTxnRow, STAR_TXN_INCLUDE } from "@/lib/starsServer";
import PageHeader from "@/components/PageHeader";
import StarsAdminClient from "./StarsAdminClient";

/** عدد عمليات الأرشيف المعروضة أسفل الشاشة */
const ARCHIVE_LIMIT = 300;

export default async function StarsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "TEACHER") redirect("/my-stars");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [halaqatRaw, studentsRaw, txns, officersRaw, actorsRaw] = await Promise.all([
    prisma.halqa.findMany({
      include: {
        teacher: { select: { name: true } },
        cohort: { select: { name: true } },
        students: { select: { id: true }, orderBy: { studentNo: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      select: { id: true, name: true, studentNo: true, stars: true, active: true, halqaId: true },
      orderBy: { studentNo: "asc" },
    }),
    prisma.starTxn.findMany({
      orderBy: { createdAt: "desc" },
      take: ARCHIVE_LIMIT,
      include: STAR_TXN_INCLUDE,
    }),
    // مسؤولو النشاط وأرصدة نشاطهم
    prisma.user.findMany({
      where: { deletedAt: null, assignments: { some: { role: "ACTIVITY_OFFICER" } } },
      select: { id: true, name: true, activityStars: true },
      orderBy: { name: "asc" },
    }),
    // «الفاعل»: كل حسابات المستخدمين (الموظفين)
    prisma.user.findMany({ where: { role: { not: "GUARDIAN" } }, select: { id: true, name: true, username: true }, orderBy: { name: "asc" } }),
  ]);

  const halqaNames = Object.fromEntries(halaqatRaw.map((h) => [h.id, h.name]));
  const students = studentsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    no: s.studentNo,
    stars: s.stars,
    active: s.active,
    halqaId: s.halqaId,
    halqaName: s.halqaId ? (halqaNames[s.halqaId] ?? null) : null,
  }));

  const halaqat = halaqatRaw.map((h) => ({
    id: h.id,
    name: h.name,
    teacherName: h.teacher.name,
    cohortName: h.cohort.name,
    stars: h.stars,
    studentIds: h.students.map((s) => s.id),
  }));

  const archive = txns.map(starTxnRow);

  return (
    <>
      <PageHeader title="إدارة النجوم" subtitle="نجوم الحلقات والنشاط والطلاب — الإيداع والسحب، وسجل كل العمليات." />
      <StarsAdminClient
        halaqat={halaqat}
        students={students}
        officers={officersRaw.map((o) => ({ id: o.id, name: o.name, stars: o.activityStars }))}
        // الاسم المتكرر يُميَّز باسم المستخدم
        actors={actorsRaw.map((u) => ({ id: u.id, name: actorsRaw.filter((x) => x.name === u.name).length > 1 ? `${u.name} (${u.username})` : u.name }))}
        archive={archive}
        archiveLimit={ARCHIVE_LIMIT}
      />
    </>
  );
}
