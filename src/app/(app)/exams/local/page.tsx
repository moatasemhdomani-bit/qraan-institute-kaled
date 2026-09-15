import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEvalSettings } from "@/lib/exam";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";

export default async function LocalExamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const [halaqatRaw, examsRaw, bankRaw, settings] = await Promise.all([
    prisma.halqa.findMany({
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { orderBy: { studentNo: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { type: "LOCAL" },
      include: { examiner: { select: { id: true, name: true } }, answers: { include: { question: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.question.findMany({ where: { examinerId: session.userId }, orderBy: { createdAt: "desc" } }),
    getEvalSettings(),
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
      juz: e.juz,
      resultMark: e.resultMark,
      resultGrade: e.resultGrade,
      resultLevel: e.resultLevel,
      localTotal: e.localTotal,
      nominationPresent: e.nominationPresent,
      nominationParts: e.nominationParts,
      notes: e.notes,
      answers: e.answers.map((a) => ({ questionId: a.questionId, text: a.question.text, mark: a.mark })),
    };
  }
  for (const e of examsRaw) {
    (examsByStudent[e.studentId] ??= []).push(mapExam(e));
  }

  return (
    <>
      <PageHeader title="السبر المحلي" subtitle="أسئلة من بنككم وعلامة من 10 لكل سؤال — الكلية محسوبة من 100." />
      <ExamBrowseClient
        type="LOCAL"
        readOnly={false}
        currentUserId={session.userId}
        isDirector={session.role === "DIRECTOR"}
        mode={settings.placementMode}
        bank={bankRaw.map((q) => ({ id: q.id, text: q.text }))}
        halaqat={halaqat}
        examsByStudent={examsByStudent}
      />
    </>
  );
}
