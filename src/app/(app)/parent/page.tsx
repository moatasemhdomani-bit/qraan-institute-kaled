import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, isValidDate, formatDateAr, ATT_LABELS, ATT_STATES, pageSpan } from "@/lib/daily";
import { resultLabel, TYPE_LABELS } from "@/lib/exam";
import { awqafPassed, certCycleLabel } from "@/lib/awqaf";
import PageHeader from "@/components/PageHeader";
import ParentClient from "./ParentClient";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function ParentPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "GUARDIAN") redirect("/dashboard");

  const sp = await searchParams;
  const from = sp.from && isValidDate(sp.from) ? sp.from : daysAgo(7);
  const to = sp.to && isValidDate(sp.to) ? sp.to : today();

  // الطالب صاحب هذا الحساب، ثم إخوته عبر رقم ولي الأمر المشترك
  const own = await prisma.student.findFirst({
    where: { guardianUserId: session.userId },
    include: { halqa: { include: { cohort: true } } },
  });

  if (!own) {
    return (
      <>
        <PageHeader title="متابعة الابن" subtitle="لا يوجد طالب مرتبط بهذا الحساب." />
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          راجع إدارة المعهد — حسابك غير مرتبط بطالب.
        </div>
      </>
    );
  }

  const family = own.guardianPhone
    ? await prisma.student.findMany({
        where: { guardianPhone: own.guardianPhone },
        orderBy: { studentNo: "asc" },
        select: { id: true, studentNo: true, name: true },
      })
    : [{ id: own.id, studentNo: own.studentNo, name: own.name }];

  const activeId = family.find((f) => f.id === sp.child)?.id ?? own.id;

  const child =
    activeId === own.id
      ? own
      : await prisma.student.findUnique({
          where: { id: activeId },
          include: { halqa: { include: { cohort: true } } },
        });

  if (!child) redirect("/parent");

  const [attHistory, recHistory, todayAtt, todayRec, exams, awqafResults] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: child.id, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    }),
    prisma.recitation.findMany({
      where: { studentId: child.id, date: { gte: from, lte: to } },
      orderBy: { date: "desc" },
    }),
    prisma.attendance.findFirst({ where: { studentId: child.id }, orderBy: { date: "desc" } }),
    prisma.recitation.findFirst({ where: { studentId: child.id }, orderBy: { date: "desc" } }),
    prisma.exam.findMany({
      where: { studentId: child.id },
      include: { examiner: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.awqafResult.findMany({
      where: { studentId: child.id },
      include: { batch: { select: { date: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stateColor = ATT_STATES.find((s) => s.id === todayAtt?.status)?.color ?? "#8FA8C8";

  const recLines: string[] = [];
  if (todayRec) {
    if (todayRec.none) {
      recLines.push("لم يسمّع في هذا اليوم");
    } else {
      recLines.push(
        todayRec.noNew
          ? "لم يسمّع جديدًا"
          : `تسميع جديد: من ${todayRec.newFrom} إلى ${todayRec.newTo} (${pageSpan(todayRec.newFrom, todayRec.newTo)} صفحة) — ${todayRec.gradeNew}`
      );
      recLines.push(
        todayRec.noPast
          ? "لم يقرأ ماضيًا"
          : `الماضي: من ${todayRec.pastFrom} إلى ${todayRec.pastTo} (${pageSpan(todayRec.pastFrom, todayRec.pastTo)} صفحة) — ${todayRec.gradePast}`
      );
    }
  } else {
    recLines.push("لا يوجد تسميع مسجَّل بعد");
  }

  return (
    <>
      <PageHeader title="متابعة الابن" subtitle="حضوره وتسميعه كما سجّلهما مدرّسه." />
      <ParentClient
        family={family.map((f) => ({ id: f.id, label: f.name }))}
        activeId={activeId}
        from={from}
        to={to}
        child={{
          name: child.name,
          meta: child.halqa ? `${child.halqa.name} · ${child.halqa.cohort.name} · رقم ${child.studentNo}` : `رقم ${child.studentNo} — بلا حلقة بعد`,
        }}
        todayLabel={todayAtt ? `آخر يوم مسجَّل: ${formatDateAr(todayAtt.date)}` : "لا يوجد حضور مسجَّل بعد"}
        todayState={{ label: todayAtt ? ATT_LABELS[todayAtt.status] : "—", color: stateColor }}
        recLines={recLines}
        recDateLabel={todayRec ? formatDateAr(todayRec.date) : ""}
        attHistory={attHistory.map((a) => ({
          date: formatDateAr(a.date),
          label: ATT_LABELS[a.status],
          color: ATT_STATES.find((s) => s.id === a.status)?.color ?? "#8FA8C8",
        }))}
        recHistory={recHistory.map((r) => ({
          date: formatDateAr(r.date),
          blank: r.none,
          newLine: r.noNew
            ? "لم يسمّع جديدًا"
            : `جديد: ${r.newFrom}→${r.newTo} (${pageSpan(r.newFrom, r.newTo)} صفحة) — ${r.gradeNew ?? ""}`,
          pastLine: r.noPast
            ? "لم يقرأ ماضيًا"
            : `ماضي: ${r.pastFrom}→${r.pastTo} (${pageSpan(r.pastFrom, r.pastTo)} صفحة) — ${r.gradePast ?? ""}`,
        }))}
        examRows={[
          ...exams.map((e) => ({
            type: TYPE_LABELS[e.type],
            result: resultLabel(e),
            rawDate: e.date,
            examinerName: e.examiner.name,
            notes: e.notes as string | null,
          })),
          ...awqafResults.map((r) => {
            const passed = awqafPassed(r.score, r.nominationPresent);
            return {
              type: "سبر الأوقاف",
              result: r.score != null ? `${r.score} / 100${passed != null ? ` — ${passed ? "ناجح" : "راسب"}` : ""}` : "بانتظار العلامة",
              rawDate: r.batch.date,
              examinerName: "",
              notes: null as string | null,
              certStatus: passed ? certCycleLabel(r) : undefined,
            };
          }),
        ]
          .sort((a, b) => b.rawDate.localeCompare(a.rawDate))
          .map(({ rawDate, ...rest }) => ({ ...rest, date: formatDateAr(rawDate) }))}
      />
    </>
  );
}
