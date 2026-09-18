import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { formatDateAr } from "@/lib/daily";
import { passFailLabel } from "@/lib/exam";
import { awqafPassed, certCycleLabel } from "@/lib/awqaf";
import AwqafBatchesClient from "./AwqafBatchesClient";

export default async function AwqafBatchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") redirect("/dashboard");

  const [batchesRaw, nominationExams, allStudents, priorResults] = await Promise.all([
    prisma.awqafBatch.findMany({
      include: { results: { include: { student: { select: { id: true, name: true, studentNo: true } } } } },
      orderBy: { date: "desc" },
    }),
    prisma.exam.findMany({
      where: { type: "WAQF_NOMINATION" },
      select: { studentId: true, date: true, resultMark: true, nominationPresent: true },
      orderBy: { date: "desc" },
    }),
    prisma.student.findMany({ orderBy: { studentNo: "asc" }, select: { id: true, name: true, studentNo: true } }),
    prisma.awqafResult.findMany({
      include: { student: { select: { id: true, name: true, studentNo: true } }, batch: { select: { date: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // آخر محاولة ترشيح أوقاف لكل طالب — نجاحها شرط الترشّح لسبر الأوقاف الفعلي
  const latestNomination = new Map<string, (typeof nominationExams)[number]>();
  for (const e of nominationExams) if (!latestNomination.has(e.studentId)) latestNomination.set(e.studentId, e);

  const studentById = new Map(allStudents.map((s) => [s.id, s]));
  const priorByStudent = new Map<string, typeof priorResults>();
  for (const r of priorResults) {
    if (!priorByStudent.has(r.studentId)) priorByStudent.set(r.studentId, []);
    priorByStudent.get(r.studentId)!.push(r);
  }
  // آخر محاولة سبر أوقاف فعلي لكل طالب (بتاريخ الدفعة) — نجاحًا كانت أو رسوبًا
  const latestAwqafAttempt = new Map<string, (typeof priorResults)[number]>();
  for (const [studentId, rs] of priorByStudent) {
    latestAwqafAttempt.set(studentId, rs.reduce((a, b) => (b.batch.date > a.batch.date ? b : a)));
  }

  // مرشَّح لدفعة جديدة: آخر ترشيح ناجح، ولم يُستهلك بعد بمحاولة سبر أوقاف فعلي — إلا أن يُرشَّح مجددًا بعدها
  const candidates = Array.from(latestNomination.entries())
    .filter(([studentId, e]) => {
      if (passFailLabel({ type: "WAQF_NOMINATION", resultMark: e.resultMark, nominationPresent: e.nominationPresent }) !== "ناجح") return false;
      const lastAttempt = latestAwqafAttempt.get(studentId);
      return !lastAttempt || e.date > lastAttempt.batch.date;
    })
    .map(([studentId, e]) => {
      const student = studentById.get(studentId);
      const priorFail = (priorByStudent.get(studentId) ?? []).find((r) => awqafPassed(r.score, r.nominationPresent) === false);
      return {
        id: studentId,
        no: student?.studentNo ?? 0,
        name: student?.name ?? "",
        nominationDate: e.date,
        nominationPresent: e.nominationPresent ?? false,
        priorFailNote: priorFail ? `رسب سابقًا في دفعة ${formatDateAr(priorFail.batch.date)} (علامة ${priorFail.score})` : null,
      };
    })
    .filter((c) => c.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const batches = batchesRaw.map((b) => {
    const rows = b.results.map((r) => ({ ...r, passed: awqafPassed(r.score, r.nominationPresent) }));
    const scoredCount = rows.filter((r) => r.score != null).length;
    const passedRows = rows.filter((r) => r.passed === true);
    const allScored = scoredCount === rows.length;
    return {
      id: b.id,
      date: formatDateAr(b.date),
      studentCount: rows.length,
      scoredCount,
      allScored,
      passedCount: passedRows.length,
      arrivedCount: passedRows.filter((r) => r.certArrived).length,
      archivedCount: passedRows.filter((r) => r.certArchived).length,
      deliveredCount: passedRows.filter((r) => r.certDelivered).length,
    };
  });

  const searchStudents = allStudents.map((s) => ({
    id: s.id,
    no: s.studentNo,
    name: s.name,
    history: (priorByStudent.get(s.id) ?? []).map((r) => ({
      batchDate: formatDateAr(r.batch.date),
      score: r.score,
      passed: awqafPassed(r.score, r.nominationPresent),
      certLabel: certCycleLabel(r),
    })),
  }));

  return (
    <>
      <PageHeader
        title="سبر الأوقاف والشهادات"
        subtitle="الاختبار تُجريه جهة الأوقاف خارج النظام — هنا تُدار الدفعات ودورة الشهادة. حدّ النجاح: 90 حاضرًا (تلاوة) و80 غيبًا (حفظ)."
      />
      <AwqafBatchesClient candidates={candidates} batches={batches} searchStudents={searchStudents} />
    </>
  );
}
