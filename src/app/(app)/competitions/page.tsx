import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { entryState } from "@/lib/competition";
import PageHeader from "@/components/PageHeader";
import CompetitionsClient from "./CompetitionsClient";

/** مسؤول النشاط: المسابقات — ضمّ الطلاب بنجومهم، وتسجيل المباريات، ومستوى كل مشارك وحالته. */
export default async function CompetitionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ACTIVITY_OFFICER") redirect("/dashboard");

  const [competitions, students] = await Promise.all([
    prisma.competition.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        entries: {
          orderBy: { createdAt: "asc" },
          include: {
            student: { select: { name: true, studentNo: true, halqa: { select: { teacher: { select: { name: true } }, cohort: { select: { name: true } } } } } },
            results: { orderBy: { createdAt: "asc" }, select: { won: true, opponentNo: true, createdAt: true } },
          },
        },
      },
    }),
    prisma.student.findMany({
      where: { active: true },
      select: { id: true, name: true, studentNo: true, stars: true, halqa: { select: { name: true } } },
      orderBy: { studentNo: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="المسابقات"
        subtitle="ضمّ الطالب يسحب نجوم المشاركة من رصيده. ثلاثة انتصارات في المستوى تنقله إلى التالي، وثلاث خسارات فيه تخرجه — ويشارك في المسابقة مرتين على الأكثر."
      />
      <CompetitionsClient
        competitions={competitions.map((c) => ({
          id: c.id,
          name: c.name,
          cost: c.cost,
          levels: c.levels,
          // التراجع متاح لآخر مباراة فقط، ومرة واحدة: آخر نتيجة أحدث من آخر تراجع
          canUndo: (() => {
            const lastAt = Math.max(0, ...c.entries.flatMap((e) => e.results.map((r) => r.createdAt.getTime())));
            return lastAt > 0 && (!c.lastUndoAt || c.lastUndoAt.getTime() < lastAt);
          })(),
          entries: c.entries.map((e, i) => ({
            no: i + 1,
            studentId: e.studentId,
            name: e.student.name,
            studentNo: e.student.studentNo,
            cohortName: e.student.halqa?.cohort.name ?? "—",
            teacherName: e.student.halqa?.teacher.name ?? "—",
            attempt: e.attempt,
            ...entryState(e.results, c.levels),
          })),
        }))}
        students={students.map((s) => ({ id: s.id, name: s.name, no: s.studentNo, stars: s.stars, halqaName: s.halqa?.name ?? null }))}
      />
    </>
  );
}
