import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamMonitorClient from "./ExamMonitorClient";

export default async function ExamMonitorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN" && session.role !== "TEACHER") redirect("/dashboard");

  const [halaqatRaw, examsRaw, tajweedTopics] = await Promise.all([
    prisma.halqa.findMany({
      where: session.role === "TEACHER" ? { teacherId: session.userId } : undefined,
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { student: { halqaId: { not: null } } },
      include: { examiner: { select: { id: true, name: true } }, student: { select: { id: true, name: true, halqaId: true } }, answers: { include: { topic: true } } },
      orderBy: { date: "desc" },
    }),
    session.role === "DIRECTOR" ? prisma.tajweedTopic.findMany({ orderBy: [{ juz: "asc" }, { order: "asc" }] }) : Promise.resolve([]),
  ]);

  const blocks = halaqatRaw.map((h) => {
    const rows = examsRaw
      .filter((e) => e.student.halqaId === h.id)
      .map((e) => ({
        id: e.id,
        studentId: e.studentId,
        studentName: e.student.name,
        type: e.type,
        examinerId: e.examinerId,
        examinerName: e.examiner.name,
        date: e.date,
        localKind: e.localKind,
        juz: e.juz,
        pages: e.pages,
        resultMark: e.resultMark,
        nominationPresent: e.nominationPresent,
        nominationParts: e.nominationParts,
        notes: e.notes,
        answers: e.answers.map((a) => ({ topicId: a.topicId, text: a.topic.text })),
      }));

    const sobredIds = new Set(rows.map((r) => r.studentId));
    const neverCount = h.students.filter((s) => !sobredIds.has(s.id)).length;

    return {
      id: h.id,
      name: h.name,
      meta: `${h.teacher.name} · ${h.cohort.name} · ${h.students.length} طالبًا`,
      rows,
      neverLabel: neverCount > 0 ? `${neverCount} طالبًا لم يُسبَر بعد` : "",
    };
  });

  return (
    <>
      <PageHeader title="متابعة السبر" subtitle="سبورات كل الحلقات، وما لم يُسبَر بعد." />
      <ExamMonitorClient
        canEdit={session.role === "DIRECTOR"}
        isDirector={session.role === "DIRECTOR"}
        currentUserId={session.userId}
        tajweedTopics={tajweedTopics.map((t) => ({ id: t.id, juz: t.juz, text: t.text }))}
        blocks={blocks}
      />
    </>
  );
}
