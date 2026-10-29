import { prisma } from "@/lib/db";
import { formatDateAr, pageSpan, holidayDaysIn } from "@/lib/daily";
import { cardStyle } from "@/lib/ui";
import { surahsLabel } from "@/lib/recitation";
import { parsePastItems, pastSummary } from "@/lib/pastRecitation";
import { hasPastRecitation } from "@/lib/track";
import PageHeader from "@/components/PageHeader";
import ParentFilters from "../ParentFilters";
import NoStudent from "../NoStudent";
import { loadParentContext, type ParentSearch } from "../data";

/** «جدول التسميع» لولي الأمر: تسميع الابن يومًا يومًا في الفترة — الجديد والماضي، وأيام العطل باسمها */
export default async function ParentRecitationPage({ searchParams }: { searchParams: Promise<ParentSearch> }) {
  const ctx = await loadParentContext(searchParams);
  if (!ctx) return <NoStudent title="جدول التسميع" />;
  const { family, activeId, child, from, to } = ctx;

  const [recs, holidayNames] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: child.id, date: { gte: from, lte: to } }, orderBy: { date: "desc" } }),
    holidayDaysIn(from, to),
  ]);
  const withPast = hasPastRecitation(child.track);
  const rows = [
    ...[...holidayNames].filter(([d]) => !recs.some((r) => r.date === d)).map(([d, name]) => ({ raw: d, holiday: `عطلة — ${name}`, blank: false, newLine: "", pastLine: "" })),
    ...recs.map((r) => ({
      raw: r.date,
      holiday: null as string | null,
      blank: r.none,
      newLine:
        r.surahs.length > 0
          ? `سور: ${surahsLabel(r.surahs, r.surahsDone)} — ${r.gradeNew ?? ""}`
          : r.examPrep
            ? "تحضير للسبر"
            : r.noNew
              ? "لم يسمّع جديدًا"
              : r.newFrom == null
                ? "الجديد لم يُسجَّل بعد"
                : `جديد: ${r.newFrom}←${r.newTo} (${pageSpan(r.newFrom, r.newTo)} صفحة) — ${r.gradeNew ?? ""}${r.pageDone === false ? " — لم يُنهِ الصفحة" : ""}`,
      pastLine: !withPast || r.surahs.length > 0 ? "" : r.noPast ? "لم يقرأ ماضيًا" : `ماضي: ${pastSummary(parsePastItems(r.pastItems)) || "لم يُسجَّل بعد"}`,
    })),
  ].sort((x, y) => y.raw.localeCompare(x.raw));

  return (
    <>
      <PageHeader title="جدول التسميع" subtitle={`تسميع ${child.name} كما سجّله مدرّسه — يومًا يومًا.`} />
      <ParentFilters basePath="/parent/recitation" family={family} activeId={activeId} from={from} to={to} />
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--ink-2)" }}>لا يوجد تسميع مسجَّل في هذه الفترة.</div>
        ) : (
          rows.map((h, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "11px 16px", borderTop: i ? "1px solid var(--line-2)" : undefined }}>
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", direction: "ltr", textAlign: "right" }}>{formatDateAr(h.raw)}</div>
              {h.holiday ? (
                <div style={{ fontSize: 13, color: "var(--info)", fontWeight: 600 }}>{h.holiday}</div>
              ) : h.blank ? (
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>لم يسمّع في هذا اليوم</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{h.newLine}</div>
                  {h.pastLine && <div style={{ fontSize: 13, color: "var(--ink)" }}>{h.pastLine}</div>}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
