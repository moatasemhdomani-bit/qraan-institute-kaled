import { redirect } from "next/navigation";
import { buildRecitationLog } from "@/lib/recitationLog";
import { defaultHalqa } from "@/lib/cohortNow";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { today, monthStart, isValidDate } from "@/lib/daily";
import { pagesSummary, localSplit, nominationSplit, realAwqafSplit, arabicExamMarks, pastGhaibSplit } from "@/lib/reports";
import TeacherReportsClient, { type ReportType } from "./TeacherReportsClient";


/**
 * «مركز التقارير» عند المدرّس — ثلاثة تقارير يختار أحدها:
 * التقرير الشهري (لحلقة القرآن أو القراءة العربية)، تقرير طالب (مشاهدة)، وسجل التسميع — كلها بتاريخ بداية ونهاية.
 */
export default async function TeacherReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string; halqa?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/dashboard");

  const sp = await searchParams;
  const type: ReportType | null = sp.type === "monthly" || sp.type === "student" || sp.type === "log" ? sp.type : null;
  const t = today();
  const from = sp.from && isValidDate(sp.from) ? sp.from : monthStart();
  const to = sp.to && isValidDate(sp.to) ? sp.to : t;

  const halaqat = await prisma.halqa.findMany({
    where: { teacherId: session.userId, ...cohortScope(session) },
    orderBy: { name: "asc" },
    include: { cohort: true, students: { orderBy: { studentNo: "asc" }, select: { id: true, name: true, studentNo: true } } },
  });
  const header = <PageHeader title="مركز التقارير" subtitle="اختاروا نوع التقرير: التقرير الشهري، تقرير طالب، أو سجل التسميع والحضور." />;

  if (halaqat.length === 0) {
    return (
      <>
        {header}
        <div style={{ padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا حلقة مُسندة إليك بعد.</div>
      </>
    );
  }

  const halqa = halaqat.find((h) => h.id === sp.halqa) ?? defaultHalqa(halaqat) ?? halaqat[0];
  const arabic = halqa.track === "ARABIC";
  const studentIds = halqa.students.map((s) => s.id);

  let monthly: Parameters<typeof TeacherReportsClient>[0]["monthly"] = null;
  let log: Parameters<typeof TeacherReportsClient>[0]["log"] = null;

  if (type === "monthly" && from <= to) {
    const [recitations, localExams, nomExams, awqafResults, arabicExams, notes, pastExams] = await Promise.all([
      prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { gte: from, lte: to } } }),
      arabic ? Promise.resolve([]) : prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "LOCAL", date: { gte: from, lte: to } } }),
      arabic ? Promise.resolve([]) : prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
      arabic ? Promise.resolve([]) : prisma.awqafResult.findMany({ where: { studentId: { in: studentIds }, sunnahSection: null, batch: { date: { gte: from, lte: to } } } }),
      arabic ? prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "ARABIC", date: { gte: from, lte: to } } }) : Promise.resolve([]),
      prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, reportNote: true } }),
      arabic ? Promise.resolve([]) : prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "PAST_GHAIB", date: { gte: from, lte: to } } }),
    ]);
    monthly = {
      rows: halqa.students
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "ar"))
        .map((s) => {
          const pages = pagesSummary(recitations.filter((r) => r.studentId === s.id));
          const loc = arabic
            ? (() => {
                const marks = arabicExamMarks(arabicExams.filter((e) => e.studentId === s.id));
                return { pass: marks.filter((m) => m.passed === true).length, fail: marks.filter((m) => m.passed === false).length };
              })()
            : localSplit(localExams.filter((e) => e.studentId === s.id));
          const nom = nominationSplit(nomExams.filter((e) => e.studentId === s.id));
          const past = pastGhaibSplit(pastExams.filter((e) => e.studentId === s.id));
          const real = realAwqafSplit(awqafResults.filter((r) => r.studentId === s.id));
          return {
            studentId: s.id,
            studentName: s.name,
            from: pages.from, to: pages.to, newTotal: pages.newTotal, pastJuz: pages.pastJuz,
            locPass: loc.pass, locFail: loc.fail,
            pastPass: past.pass, pastFail: past.fail,
            nomPass: nom.pass, nomFail: nom.fail,
            realPass: real.pass, realFail: real.fail,
            note: notes.find((n) => n.id === s.id)?.reportNote ?? "",
          };
        }),
    };
  }

  // سجل التسميع: أعمدة = أيام الدوام في الفترة، سطور = الطلاب، والخانة = تسميعه يومها (الجديد والماضي بتقديرهما)
  if (type === "log" && from <= to) {
    const [block] = await buildRecitationLog([halqa.id], from, to);
    log = block ? { days: block.days, truncated: block.truncated, rows: block.rows } : null;
  }

  return (
    <>
      {header}
      <TeacherReportsClient
        type={type}
        from={from}
        to={to}
        halaqat={halaqat.map((h) => ({ id: h.id, name: h.name, students: h.students.map((s) => ({ id: s.id, name: s.name, no: s.studentNo })) }))}
        halqaId={halqa.id}
        arabic={arabic}
        monthly={monthly}
        log={log}
      />
    </>
  );
}
