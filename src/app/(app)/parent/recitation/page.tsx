import { prisma } from "@/lib/db";
import { formatDateAr, pageSpan, holidayDaysIn, ATT_LABELS, ATT_STATES } from "@/lib/daily";
import { cardStyle } from "@/lib/ui";
import { surahsLabel } from "@/lib/recitation";
import { parsePastItems, pastSummary } from "@/lib/pastRecitation";
import { hasPastRecitation } from "@/lib/track";
import PageHeader from "@/components/PageHeader";
import ParentFilters from "../ParentFilters";
import NoStudent from "../NoStudent";
import { loadParentContext, type ParentSearch } from "../data";

/**
 * «جدول التسميع والحضور» لولي الأمر: جدول واحد يومًا يومًا — الحضور، والتسميع الجديد، والماضي — وأيام العطل باسمها،
 * وفوقه ملخّص الحضور في الفترة.
 */
export default async function ParentRecitationPage({ searchParams }: { searchParams: Promise<ParentSearch> }) {
  const ctx = await loadParentContext(searchParams);
  if (!ctx) return <NoStudent title="جدول التسميع والحضور" />;
  const { family, activeId, child, from, to } = ctx;

  const [recs, att, holidayNames] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: child.id, date: { gte: from, lte: to } } }),
    prisma.attendance.findMany({ where: { studentId: child.id, date: { gte: from, lte: to } } }),
    holidayDaysIn(from, to),
  ]);
  const withPast = hasPastRecitation(child.track);
  const recOf = new Map(recs.map((r) => [r.date, r]));
  const attOf = new Map(att.map((a) => [a.date, a.status]));
  const dates = [...new Set([...recOf.keys(), ...attOf.keys(), ...holidayNames.keys()])].sort((x, y) => y.localeCompare(x));

  const rows = dates.map((d) => {
    const r = recOf.get(d);
    const a = attOf.get(d);
    const holiday = !r && !a ? (holidayNames.get(d) ?? null) : null;
    const fresh = !r
      ? ""
      : r.none
        ? "لم يسمّع"
        : r.surahs.length > 0
          ? `سور: ${surahsLabel(r.surahs, r.surahsDone)} — ${r.gradeNew ?? ""}`
          : r.examPrep
            ? "تحضير للسبر"
            : r.noNew
              ? "لم يسمّع جديدًا"
              : r.newFrom == null
                ? "لم يُسجَّل بعد"
                : `${r.newFrom}←${r.newTo} (${pageSpan(r.newFrom, r.newTo)} صفحة) — ${r.gradeNew ?? ""}${r.pageDone === false ? " — لم يُنهِ الصفحة" : ""}`;
    const past = !r || r.none || !withPast || r.surahs.length > 0 ? "" : r.noPast ? "لم يقرأ ماضيًا" : pastSummary(parsePastItems(r.pastItems)) || "لم يُسجَّل بعد";
    return { date: d, att: a ?? null, holiday, fresh, past, none: !!r?.none };
  });

  const count = (id: string) => att.filter((a) => a.status === id).length;
  const th: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)", textAlign: "start", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px 10px", fontSize: 13, borderTop: "1px solid var(--line-2)", verticalAlign: "top" };

  return (
    <>
      <PageHeader title="جدول التسميع والحضور" subtitle={`حضور ${child.name} وتسميعه كما سجّلهما مدرّسه — يومًا يومًا.`} />
      <ParentFilters basePath="/parent/recitation" family={family} activeId={activeId} from={from} to={to} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
        {ATT_STATES.map((s) => (
          <div key={s.id} style={{ ...cardStyle, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{count(s.id)}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--ink-2)" }}>لا يوجد حضور ولا تسميع مسجَّل في هذه الفترة.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: withPast ? 560 : 420 }}>
            <thead>
              <tr style={{ background: "var(--head-grad)" }}>
                <th style={th}>التاريخ</th>
                <th style={th}>الحضور</th>
                <th style={th}>{withPast ? "التسميع الجديد" : "التسميع"}</th>
                {withPast && <th style={th}>الماضي</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const color = h.att ? (ATT_STATES.find((s) => s.id === h.att)?.color ?? "var(--info)") : "var(--info)";
                return (
                  <tr key={h.date}>
                    <td style={{ ...td, whiteSpace: "nowrap", color: "var(--ink-2)" }}>{formatDateAr(h.date)}</td>
                    {h.holiday ? (
                      <td style={{ ...td, color: "var(--info)", fontWeight: 600 }} colSpan={withPast ? 3 : 2}>
                        عطلة — {h.holiday}
                      </td>
                    ) : (
                      <>
                        <td style={td}>
                          {h.att ? (
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                whiteSpace: "nowrap",
                                border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                                color,
                                background: `color-mix(in srgb, ${color} 10%, transparent)`,
                              }}
                            >
                              {ATT_LABELS[h.att]}
                            </span>
                          ) : (
                            <span style={{ color: "var(--ink-3)" }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, color: h.none ? "var(--bad)" : "var(--ink)" }}>{h.fresh || <span style={{ color: "var(--ink-3)" }}>—</span>}</td>
                        {withPast && <td style={td}>{h.past || <span style={{ color: "var(--ink-3)" }}>—</span>}</td>}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
