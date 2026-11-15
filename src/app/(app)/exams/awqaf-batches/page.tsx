import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma, rawPrisma, nameWithNasab, studentFullName } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { formatDateAr } from "@/lib/daily";
import { passFailLabel } from "@/lib/exam";
import { awqafPassed, awqafResultLabel, awqafDecided, certCycleLabel } from "@/lib/awqaf";
import AwqafBatchesClient from "./AwqafBatchesClient";
import { sunnahAwqafCandidates } from "@/lib/sunnahServer";
import { sunnahBranchLabel } from "@/lib/sunnah";
import Link from "next/link";
import { cardStyle, chipStyle } from "@/lib/ui";
import { certificateCandidates } from "@/lib/certificateServer";
import CertificatesClient from "./certificates/CertificatesClient";

const TITLE = "سبر الأوقاف والشهادات";
const TABS = [
  { id: "awqaf", label: "الأوقاف", hint: "دفعات سبر الأوقاف للقرآن والسنّة النبوية، ودورة شهاداتها" },
  { id: "certs", label: "شهادات المعهد", hint: "شهادة حفظ جزء عمّ، وشهادة النجاح في القراءة العربية — تُملأ من بيانات الطالب" },
] as const;

/** الشاشة تُفتح على زرّين: «الأوقاف» (كل ما كان في الشاشة) و«شهادات المعهد» — وبعد الدخول يبقى الزرّان أعلاها للتنقّل */
export default async function AwqafBatchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN" && session.role !== "DIRECTOR") redirect("/dashboard");

  const { tab } = await searchParams;
  if (tab !== "awqaf" && tab !== "certs") {
    return (
      <>
        <PageHeader title={TITLE} subtitle="اختاروا القسم." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {TABS.map((t) => (
            <Link key={t.id} href={`?tab=${t.id}`} style={{ ...cardStyle, padding: "22px 22px", textDecoration: "none", color: "var(--ink)" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>{t.hint}</div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const tabBar = (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {TABS.map((t) => (
        <Link key={t.id} href={`?tab=${t.id}`} style={{ ...chipStyle(tab === t.id), textDecoration: "none", fontSize: 13.5 }}>
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (tab === "certs") {
    const [amma, arabic, studentsRaw] = await Promise.all([
      certificateCandidates("AMMA"),
      certificateCandidates("ARABIC"),
      // «شهادة سابقة»: كل طلاب المعهد — بياناتهم تُملأ في الشهادة تلقائيًا من سجلهم
      rawPrisma.student.findMany({
        select: { id: true, studentNo: true, name: true, fatherName: true, familyName: true, birthDate: true, birthPlace: true },
        orderBy: { studentNo: "asc" },
      }),
    ]);
    const priorStudents = studentsRaw.map((s) => ({
      id: s.id,
      no: s.studentNo,
      name: studentFullName(s.name, s.fatherName, s.familyName),
      nasabName: nameWithNasab(s.name, s.familyName),
      father: s.fatherName?.trim() ?? "",
      birthPlace: s.birthPlace?.trim() ?? "",
      birthYear: s.birthDate?.match(/\d{4}/)?.[0] ?? "",
    }));
    return (
      <>
        <PageHeader title={TITLE} subtitle="شهادات المعهد: اختاروا نوع الشهادة ثم الطلاب — تُملأ تلقائيًا من بيانات الطالب ونتيجة سبره، وتُحفظ برقم متسلسل." />
        {tabBar}
        <CertificatesClient candidates={{ AMMA: amma, ARABIC: arabic }} students={priorStudents} />
      </>
    );
  }

  const [batchesRaw, nominationExams, allStudents, priorResults] = await Promise.all([
    prisma.awqafBatch.findMany({
      include: { results: { include: { student: { select: { id: true, name: true, studentNo: true } } } } },
      orderBy: { date: "desc" },
    }),
    prisma.exam.findMany({
      where: { type: "WAQF_NOMINATION" },
      select: { studentId: true, date: true, resultMark: true, nominationPresent: true, nominationDismissed: true },
      orderBy: { date: "desc" },
    }),
    prisma.student.findMany({ orderBy: { studentNo: "asc" }, select: { id: true, name: true, studentNo: true } }),
    prisma.awqafResult.findMany({
      where: { sunnahSection: null },
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
      // أُسقط من قائمة المؤهلين عند حذف دفعته — يعود بترشيح جديد
      if (e.nominationDismissed) return false;
      const lastAttempt = latestAwqafAttempt.get(studentId);
      return !lastAttempt || e.date > lastAttempt.batch.date;
    })
    .map(([studentId, e]) => {
      const student = studentById.get(studentId);
      const priorFail = (priorByStudent.get(studentId) ?? []).find((r) => awqafPassed(r) === false);
      return {
        id: studentId,
        no: student?.studentNo ?? 0,
        name: student?.name ?? "",
        nominationDate: e.date,
        nominationPresent: e.nominationPresent ?? false,
        priorFailNote: priorFail ? `رسب سابقًا في دفعة ${formatDateAr(priorFail.batch.date)} (${awqafResultLabel(priorFail)})` : null,
      };
    })
    .filter((c) => c.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const batches = batchesRaw.map((b) => {
    const rows = b.results.map((r) => ({ ...r, passed: awqafPassed(r) }));
    const scoredCount = rows.filter((r) => awqafDecided(r)).length;
    const passedRows = rows.filter((r) => r.passed === true);
    const allScored = scoredCount === rows.length;
    return {
      id: b.id,
      kind: b.kind,
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
      resultLabel: awqafResultLabel(r),
      passed: awqafPassed(r),
      certLabel: certCycleLabel(r),
    })),
  }));

  return (
    <>
      <PageHeader
        title={TITLE}
        subtitle="الاختبار تُجريه جهة الأوقاف خارج النظام — هنا تُدار الدفعات ودورة الشهادة. حدّ النجاح: 90 حاضرًا (تلاوة) و80 غيبًا (حفظ)."
      />
      {tabBar}
      <AwqafBatchesClient
        candidates={candidates}
        sunnahCandidates={(await sunnahAwqafCandidates()).map((c) => ({
          key: `${c.studentId}|${c.section}|${c.level}`,
          studentId: c.studentId,
          section: c.section,
          level: c.level,
          no: c.no,
          name: c.name,
          label: sunnahBranchLabel(c.section, c.level),
          note: `ترشيح ${c.mark ?? "—"} / 100 · ${formatDateAr(c.nominationDate)}`,
        }))}
        batches={batches}
        searchStudents={searchStudents}
      />
    </>
  );
}
