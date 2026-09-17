import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";
import { passFailLabel } from "@/lib/exam";

export default async function AwqafExamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const [halaqatRaw, examsRaw] = await Promise.all([
    prisma.halqa.findMany({
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { orderBy: { studentNo: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { type: "WAQF_NOMINATION" },
      include: { examiner: { select: { id: true, name: true } }, answers: true, student: { select: { id: true, name: true, studentNo: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const readyMap = new Map<string, { id: string; no: number; name: string; date: string }>();
  for (const e of examsRaw) {
    if (readyMap.has(e.studentId)) continue; // examsRaw مرتّبة تنازليًا حسب التاريخ — أول ظهور هو الأحدث
    const passed = passFailLabel({ type: "WAQF_NOMINATION", resultMark: e.resultMark, nominationPresent: e.nominationPresent }) === "ناجح";
    if (passed) readyMap.set(e.studentId, { id: e.student.id, no: e.student.studentNo, name: e.student.name, date: e.date });
  }
  const readyStudents = Array.from(readyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

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
      localKind: null,
      juz: e.juz,
      pages: e.pages,
      resultMark: e.resultMark,
      nominationPresent: e.nominationPresent,
      nominationParts: e.nominationParts,
      notes: e.notes,
      answers: [] as { topicId: string; text: string }[],
    };
  }
  for (const e of examsRaw) {
    (examsByStudent[e.studentId] ??= []).push(mapExam(e));
  }

  return (
    <>
      <PageHeader title="ترشيح الأوقاف" subtitle="حاضرًا أو غيبًا وعدد الأجزاء — نجاحه يتيح سبر الأوقاف الفعلي في المرحلة 4." />
      <ExamBrowseClient
        type="WAQF_NOMINATION"
        readOnly={false}
        currentUserId={session.userId}
        isDirector={session.role === "DIRECTOR"}
        tajweedTopics={[]}
        halaqat={halaqat}
        examsByStudent={examsByStudent}
        readyStudents={readyStudents}
      />
    </>
  );
}
