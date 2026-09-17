import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";

export default async function LocalExamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const [halaqatRaw, examsRaw, tajweedTopics] = await Promise.all([
    prisma.halqa.findMany({
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { orderBy: { studentNo: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { type: "LOCAL" },
      include: { examiner: { select: { id: true, name: true } }, answers: { include: { topic: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.tajweedTopic.findMany({ orderBy: [{ juz: "asc" }, { order: "asc" }] }),
  ]);

  const halaqat = halaqatRaw.map((h) => ({
    id: h.id,
    name: h.name,
    teacherName: h.teacher.name,
    cohortName: h.cohort.name,
    students: h.students.map((s) => ({ id: s.id, no: s.studentNo, name: s.name })),
  }));

  const examsByStudent: Record<string, ReturnType<typeof mapExam>[]> = {};
  function mapExam(e: (typeof examsRaw)[number]) {
    return {
      id: e.id,
      studentId: e.studentId,
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
    };
  }
  for (const e of examsRaw) {
    (examsByStudent[e.studentId] ??= []).push(mapExam(e));
  }

  return (
    <>
      <PageHeader title="السبر المحلي" subtitle="غيباً أو حاضراً أو عمّ غيباً — بأرقام الصفحات وعلامة لكل نوع." />
      <ExamBrowseClient
        type="LOCAL"
        readOnly={false}
        currentUserId={session.userId}
        isDirector={session.role === "DIRECTOR"}
        tajweedTopics={tajweedTopics.map((t) => ({ id: t.id, juz: t.juz, text: t.text }))}
        halaqat={halaqat}
        examsByStudent={examsByStudent}
      />
    </>
  );
}
