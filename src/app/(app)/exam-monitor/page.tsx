import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getEvalSettings } from "@/lib/exam";
import PageHeader from "@/components/PageHeader";
import ExamMonitorClient from "./ExamMonitorClient";

export default async function ExamMonitorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [halaqatRaw, examsRaw, bankRaw, settings] = await Promise.all([
    prisma.halqa.findMany({
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { student: { halqaId: { not: null } } },
      include: { examiner: { select: { id: true, name: true } }, student: { select: { id: true, name: true, halqaId: true } }, answers: { include: { question: true } } },
      orderBy: { date: "desc" },
    }),
    session.role === "DIRECTOR" ? prisma.question.findMany({ orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    getEvalSettings(),
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
        juz: e.juz,
        resultMark: e.resultMark,
        resultGrade: e.resultGrade,
        resultLevel: e.resultLevel,
        localTotal: e.localTotal,
        nominationPresent: e.nominationPresent,
        nominationParts: e.nominationParts,
        notes: e.notes,
        answers: e.answers.map((a) => ({ questionId: a.questionId, text: a.question.text, mark: a.mark })),
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

  const banksByExaminer: Record<string, { id: string; text: string }[]> = {};
  for (const q of bankRaw) {
    (banksByExaminer[q.examinerId] ??= []).push({ id: q.id, text: q.text });
  }

  return (
    <>
      <PageHeader title="متابعة السبر" subtitle="سبورات كل الحلقات، وما لم يُسبَر بعد." />
      <ExamMonitorClient
        canEdit={session.role === "DIRECTOR"}
        isDirector={session.role === "DIRECTOR"}
        currentUserId={session.userId}
        settings={settings}
        banksByExaminer={banksByExaminer}
        blocks={blocks}
      />
    </>
  );
}
