import { prisma } from "@/lib/db";
import { formatDateAr } from "@/lib/daily";
import { cardStyle } from "@/lib/ui";
import { resultLabel, examKindLabel, TYPE_LABELS } from "@/lib/exam";
import { awqafPassed, certCycleLabel } from "@/lib/awqaf";
import { buildStudentPreview } from "@/lib/reports";
import PageHeader from "@/components/PageHeader";
import StudentReportPreview from "../reports/student/StudentReportPreview";
import ParentFilters from "./ParentFilters";
import { loadParentContext, type ParentSearch } from "./data";
import NoStudent from "./NoStudent";

/** «نظرة عامة» لولي الأمر: تقرير الطالب في الفترة (كتقرير الطالب عند الإدارة)، وجدول اختباراته */
export default async function ParentOverviewPage({ searchParams }: { searchParams: Promise<ParentSearch> }) {
  const ctx = await loadParentContext(searchParams);
  if (!ctx) return <NoStudent title="نظرة عامة" />;
  const { family, activeId, child, from, to } = ctx;

  const [preview, exams, awqafResults] = await Promise.all([
    buildStudentPreview(child.id, from, to),
    prisma.exam.findMany({ where: { studentId: child.id }, include: { examiner: { select: { name: true } } }, orderBy: { date: "desc" } }),
    prisma.awqafResult.findMany({ where: { studentId: child.id, sunnahSection: null }, include: { batch: { select: { date: true } } }, orderBy: { createdAt: "desc" } }),
  ]);

  const examRows = [
    ...exams.map((e) => ({
      type: [TYPE_LABELS[e.type], examKindLabel(e)].filter(Boolean).join(" — "),
      result: resultLabel(e),
      rawDate: e.date,
      examinerName: e.examiner.name,
      notes: e.notes as string | null,
      certStatus: undefined as string | undefined,
    })),
    ...awqafResults.map((r) => {
      const passed = awqafPassed(r.score, r.nominationPresent);
      return {
        type: [
          "سبر الأوقاف",
          examKindLabel({
            type: "AWQAF_ACTUAL",
            nominationPresent: r.nominationPresent,
            nominationParts: exams.find((e) => e.type === "WAQF_NOMINATION" && e.nominationPresent === r.nominationPresent && e.date <= r.batch.date)?.nominationParts ?? null,
          }),
        ].join(" — "),
        result: r.score != null ? `${r.score} / 100${passed != null ? ` — ${passed ? "ناجح" : "إعادة"}` : ""}` : "بانتظار العلامة",
        rawDate: r.batch.date,
        examinerName: "",
        notes: null as string | null,
        certStatus: passed ? certCycleLabel(r) : undefined,
      };
    }),
  ].sort((a, b) => b.rawDate.localeCompare(a.rawDate));

  return (
    <>
      <PageHeader title="نظرة عامة" subtitle="تقرير الابن في الفترة المختارة: حضوره وتسميعه وسلوكه واختباراته." />
      <ParentFilters basePath="/parent" family={family} activeId={activeId} from={from} to={to} />
      {preview && <StudentReportPreview preview={preview} />}

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)", fontSize: 14, fontWeight: 700 }}>جدول الاختبارات</div>
        {examRows.length === 0 ? (
          <div style={{ padding: "26px 18px", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>لا توجد نتائج سبر بعد — تظهر هنا نتائج السبر والشهادات.</div>
        ) : (
          examRows.map((e, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>{e.type}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{e.result}</span>
                <span style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--ink-3)", direction: "ltr" }}>{formatDateAr(e.rawDate)}</span>
              </div>
              {e.examinerName && <div style={{ fontSize: 12, color: "var(--ink-2)" }}>المختبِر: {e.examinerName}</div>}
              {e.certStatus && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{e.certStatus}</div>}
              {e.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "pre-line" }}>ملاحظات: {e.notes}</div>}
            </div>
          ))
        )}
      </div>
    </>
  );
}

