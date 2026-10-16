import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { examinerTrack, examinerLike, cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";
import type { ExamTypeId, LocalKindId } from "@/lib/exam";

/**
 * «سبر ماضٍ غيباً» لمختبري القرآن: طلاب «قرآن غيباً» وحدهم. عند اختيار طالب يظهر سجل سبوره في منهج القرآن،
 * وفي أعلاه «سبر ماضٍ جديد» — يُختار ما سُبر فيه كما في تسميع الماضي (النوع ← الجزء)، والنتيجة كالسبر المحلي غيباً.
 */
export default async function PastExamPage({ searchParams }: { searchParams: Promise<{ halqa?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!examinerLike(session.role) && session.role !== "DIRECTOR") redirect("/dashboard");
  if ((await examinerTrack(session)) === "ARABIC") redirect("/exams/arabic");

  const [halaqatRaw, examsRaw] = await Promise.all([
    prisma.halqa.findMany({
      where: { track: "QURAN_GHAIB", ...cohortScope(session) },
      include: {
        teacher: { select: { name: true } },
        cohort: { select: { name: true } },
        // طلاب «قرآن غيباً» وحدهم
        students: { where: { track: "QURAN_GHAIB" }, orderBy: { studentNo: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    // سجل الطالب في منهج القرآن: كل سبوره القرآنية
    prisma.exam.findMany({
      where: { type: { in: ["PAST_GHAIB", "LOCAL", "WAQF_NOMINATION", "PLACEMENT"] }, student: { track: "QURAN_GHAIB" } },
      include: { examiner: { select: { id: true, name: true } } },
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
      type: e.type as ExamTypeId,
      studentId: e.studentId,
      examinerId: e.examinerId,
      examinerName: e.examiner.name,
      date: e.date,
      localKind: e.localKind as LocalKindId | null,
      juz: e.juz,
      pages: e.pages,
      resultMark: e.resultMark,
      repeat: e.repeat,
      nominationPresent: e.nominationPresent,
      nominationParts: e.nominationParts,
      startPage: e.startPage,
      pastItems: e.pastItems,
      notes: e.notes,
    };
  }
  for (const e of examsRaw) (examsByStudent[e.studentId] ??= []).push(mapExam(e));

  return (
    <>
      <PageHeader title="سبر ماضٍ غيباً" subtitle="لطلاب «قرآن غيباً» — بالأجزاء والأحزاب، والنجاح من 80 كالسبر المحلي غيباً." />
      <ExamBrowseClient
        type="PAST_GHAIB"
        newLabel="سبر ماضٍ جديد"
        historyLabel="سجل سبوره في منهج القرآن"
        readOnly={false}
        currentUserId={session.userId}
        isDirector={session.role === "DIRECTOR"}
        initialHalqaId={(await searchParams).halqa}
        halaqat={halaqat}
        examsByStudent={examsByStudent}
      />
    </>
  );
}
