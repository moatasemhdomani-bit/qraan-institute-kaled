import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import { starTxnRow, STAR_TXN_INCLUDE } from "@/lib/starsServer";
import PageHeader from "@/components/PageHeader";
import TeacherStarsClient from "./TeacherStarsClient";

const ARCHIVE_LIMIT = 200;

/** متابعة النجوم للمدرّس: رصيد كل حلقة من حلقاته، ويصرف منه على طلابها أو يسحب منهم. */
export default async function MyStarsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "DIRECTOR" || session.role === "ADMIN") redirect("/stars");
  if (session.role !== "TEACHER") redirect("/dashboard");

  const halaqatRaw = await prisma.halqa.findMany({
    where: { teacherId: session.userId, ...cohortScope(session) },
    include: {
      cohort: { select: { name: true } },
      students: { select: { id: true, name: true, studentNo: true, stars: true }, orderBy: { studentNo: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  const txns = await prisma.starTxn.findMany({
    where: { halqaId: { in: halaqatRaw.map((h) => h.id) } },
    orderBy: { createdAt: "desc" },
    take: ARCHIVE_LIMIT,
    include: STAR_TXN_INCLUDE,
  });

  const halaqat = halaqatRaw.map((h) => ({
    id: h.id,
    name: h.name,
    cohortName: h.cohort.name,
    stars: h.stars,
    students: h.students.map((s) => ({ id: s.id, name: s.name, no: s.studentNo, stars: s.stars })),
  }));

  return (
    <>
      <PageHeader title="متابعة النجوم" subtitle="رصيد نجوم الحلقة تشحنه الإدارة، وتصرفه على طلاب الحلقة وحدهم." />
      <TeacherStarsClient halaqat={halaqat} archive={txns.map(starTxnRow)} archiveLimit={ARCHIVE_LIMIT} />
    </>
  );
}
