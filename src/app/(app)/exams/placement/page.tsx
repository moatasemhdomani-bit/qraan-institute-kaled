import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { examinerTrack } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import PlacementClient from "./PlacementClient";

export default async function PlacementExamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const track = await examinerTrack(session);
  // مختبِر القراءة العربية له شاشة سبره وحدها
  if (track === "ARABIC") redirect("/exams/arabic");
  const examsRaw = await prisma.exam.findMany({
    where: { type: "PLACEMENT", student: { halqaId: null, active: true, track: { not: "GRADUATED" } } },
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
    startPage: e.startPage,
    pages: e.pages,
    resultMark: e.resultMark,
    nominationPresent: e.nominationPresent,
    nominationParts: e.nominationParts,
    notes: e.notes,
  }));

  return (
    <>
      <PageHeader title="تحديد مستوى" subtitle="لطالب غير مسجَّل بعد — نتيجته هي الجزء الذي يبدأ منه حفظه، أو الصفحة التي يبدأ منها في القراءة العربية." />
      <PlacementClient currentUserId={session.userId} isDirector={session.role === "DIRECTOR"} rows={rows} />
    </>
  );
}
