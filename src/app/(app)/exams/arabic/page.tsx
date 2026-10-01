import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { examinerTrack } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";

/** سبر مختصر القراءة العربية — لمختبِر القراءة العربية، وللمدير بالصلاحية نفسها. حلقات القراءة العربية وحدها. */
export default async function ArabicExamPage({ searchParams }: { searchParams: Promise<{ halqa?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");
  if ((await examinerTrack(session)) === "QURAN") redirect("/exams/local");

  const [halaqatRaw, examsRaw] = await Promise.all([
    prisma.halqa.findMany({
      where: { track: "ARABIC" },
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { orderBy: { studentNo: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { type: "ARABIC" },
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
      stage: e.stage,
      grade: e.grade,
      notes: e.notes,
    };
  }
  for (const e of examsRaw) {
    (examsByStudent[e.studentId] ??= []).push(mapExam(e));
  }

  return (
    <>
      <PageHeader title="سبر القراءة العربية" subtitle="مختصر القراءة العربية — المراحل 1 إلى 6 ثم «بينة للناس»: تقدير للمراحل 1–5، وعلامة من 100 للمرحلة 6 و«بينة للناس» (ناجح بـ 90 فأكثر)." />
      <ExamBrowseClient
        type="ARABIC"
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
