import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";

export default async function LocalExamViewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [halaqatRaw, examsRaw] = await Promise.all([
    prisma.halqa.findMany({
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { orderBy: { studentNo: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { type: "LOCAL" },
      include: { examiner: { select: { id: true, name: true } }, answers: { include: { topic: true } } },
      orderBy: { date: "desc" },
    }),
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
      pageFrom: e.pageFrom,
      pageTo: e.pageTo,
      resultMark: e.resultMark,
      localTotal: e.localTotal,
      nominationPresent: e.nominationPresent,
      nominationParts: e.nominationParts,
      notes: e.notes,
      answers: e.answers.map((a) => ({ topicId: a.topicId, text: a.topic.text, mark: a.mark })),
    };
  }
  for (const e of examsRaw) {
    (examsByStudent[e.studentId] ??= []).push(mapExam(e));
  }

  return (
    <>
      <PageHeader title="متابعة السبر المحلي" subtitle="نتائج السبر المحلي في كل الحلقات — عرض فقط." />
      <ExamBrowseClient
        type="LOCAL"
        readOnly
        currentUserId={session.userId}
        isDirector={session.role === "DIRECTOR"}
        tajweedTopics={[]}
        halaqat={halaqat}
        examsByStudent={examsByStudent}
      />
    </>
  );
}
