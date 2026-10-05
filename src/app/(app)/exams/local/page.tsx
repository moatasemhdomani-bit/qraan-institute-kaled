import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { examinerTrack, examinerLike, cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamBrowseClient from "../ExamBrowseClient";

export default async function LocalExamPage({ searchParams }: { searchParams: Promise<{ halqa?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!examinerLike(session.role) && session.role !== "DIRECTOR") redirect("/dashboard");

  const track = await examinerTrack(session);
  // مختبِر القراءة العربية له شاشة سبره وحدها
  if (track === "ARABIC") redirect("/exams/arabic");
  const [halaqatRaw, examsRaw] = await Promise.all([
    prisma.halqa.findMany({
      where: { track: { in: ["AMMA", "QURAN", "QURAN_GHAIB"] }, ...cohortScope(session) },
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { orderBy: { studentNo: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { type: "LOCAL" },
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
      repeat: e.repeat,
      nominationPresent: e.nominationPresent,
      nominationParts: e.nominationParts,
      notes: e.notes,
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
        initialHalqaId={(await searchParams).halqa}
        halaqat={halaqat}
        examsByStudent={examsByStudent}
      />
    </>
  );
}
