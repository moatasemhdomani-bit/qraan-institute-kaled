import { prisma } from "@/lib/db";
import { formatDateAr, ATT_LABELS, ATT_STATES, holidayDaysIn } from "@/lib/daily";
import { cardStyle } from "@/lib/ui";
import PageHeader from "@/components/PageHeader";
import ParentFilters from "../ParentFilters";
import NoStudent from "../NoStudent";
import { loadParentContext, type ParentSearch } from "../data";

/** «جدول الحضور» لولي الأمر: حضور الابن يومًا يومًا في الفترة، وأيام العطل باسمها */
export default async function ParentAttendancePage({ searchParams }: { searchParams: Promise<ParentSearch> }) {
  const ctx = await loadParentContext(searchParams);
  if (!ctx) return <NoStudent title="جدول الحضور" />;
  const { family, activeId, child, from, to } = ctx;

  const [att, holidayNames] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId: child.id, date: { gte: from, lte: to } }, orderBy: { date: "desc" } }),
    holidayDaysIn(from, to),
  ]);
  const rows = [
    ...att.map((a) => ({ raw: a.date, label: ATT_LABELS[a.status], color: ATT_STATES.find((s) => s.id === a.status)?.color ?? "var(--info)" })),
    ...[...holidayNames].filter(([d]) => !att.some((a) => a.date === d)).map(([d, name]) => ({ raw: d, label: `عطلة — ${name}`, color: "var(--info)" })),
  ].sort((x, y) => y.raw.localeCompare(x.raw));

  // ملخّص الفترة
  const count = (id: string) => att.filter((a) => a.status === id).length;

  return (
    <>
      <PageHeader title="جدول الحضور" subtitle={`حضور ${child.name} كما سجّله مدرّسه — يومًا يومًا.`} />
      <ParentFilters basePath="/parent/attendance" family={family} activeId={activeId} from={from} to={to} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
        {ATT_STATES.map((s) => (
          <div key={s.id} style={{ ...cardStyle, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{count(s.id)}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--ink-2)" }}>لا يوجد حضور مسجَّل في هذه الفترة.</div>
        ) : (
          rows.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: i ? "1px solid var(--line-2)" : undefined }}>
              <span style={{ fontSize: 13.5, color: "var(--ink-2)", direction: "ltr" }}>{formatDateAr(h.raw)}</span>
              <span
                style={{
                  marginInlineStart: "auto",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  border: `1px solid color-mix(in srgb, ${h.color} 40%, transparent)`,
                  color: h.color,
                  background: `color-mix(in srgb, ${h.color} 10%, transparent)`,
                }}
              >
                {h.label}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
