import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import PlacementClient from "./PlacementClient";

export default async function PlacementExamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const examsRaw = await prisma.exam.findMany({
    where: { type: "PLACEMENT", student: { halqaId: null } },
    include: { examiner: { select: { id: true, name: true } }, student: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const rows = examsRaw.map((e) => ({
    id: e.id,
    studentId: e.studentId,
    studentName: e.student.name,
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
    answers: [] as { topicId: string; text: string; mark: number }[],
  }));

  return (
    <>
      <PageHeader title="تحديد مستوى" subtitle="لطالب غير مسجَّل بعد — نتيجته هي الجزء الذي يبدأ منه حفظه." />
      <PlacementClient currentUserId={session.userId} isDirector={session.role === "DIRECTOR"} rows={rows} />
    </>
  );
}
