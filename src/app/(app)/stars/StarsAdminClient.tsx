"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import type { StarTxnRow } from "@/lib/stars";
import StarOpDrawer from "./StarOpDrawer";
import StarArchive from "./StarArchive";
import StarBadge from "./StarBadge";
import { adminHalqaStars, adminStudentStars } from "./actions";

type StudentRow = { id: string; name: string; no: number; stars: number; active: boolean; halqaId: string | null; halqaName: string | null };
type HalqaRow = { id: string; name: string; teacherName: string; cohortName: string; stars: number; studentIds: string[] };

const starBadge = (n: number) => <StarBadge n={n} />;

export default function StarsAdminClient({
  halaqat,
  students,
  archive,
  archiveLimit,
}: {
  halaqat: HalqaRow[];
  students: StudentRow[];
  archive: StarTxnRow[];
  archiveLimit: number;
}) {
  const [search, setSearch] = useState("");
  const [openHalqa, setOpenHalqa] = useState<string | null>(null);
  const [opStudent, setOpStudent] = useState<StudentRow | null>(null);
  const [halqaOp, setHalqaOp] = useState(false);
  // «نجوم الحلقات»: حلقة واحدة أو أكثر أو الكل
  const [halqaPicked, setHalqaPicked] = useState<string[]>([]);

  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);

  const matches = useMemo(() => {
    const q = toWesternDigits(search.trim());
    if (!q) return [];
    return students.filter((s) => s.name.includes(q) || String(s.no) === q).slice(0, 20);
  }, [students, search]);

  // الحلقات مجمّعة حسب الفوج
  const cohorts = useMemo(() => {
    const m = new Map<string, HalqaRow[]>();
    for (const h of halaqat) m.set(h.cohortName, [...(m.get(h.cohortName) ?? []), h]);
    return [...m].sort((a, b) => a[0].localeCompare(b[0], "ar"));
  }, [halaqat]);

  const studentRow = (s: StudentRow, showHalqa: boolean) => (
    <div
      key={s.id}
      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}
    >
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>
          {s.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{s.no}</span>
          {!s.active && <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}> · منقطع</span>}
        </div>
        {showHalqa && <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.halqaName ?? "غير مفروز"}</div>}
      </div>
      {starBadge(s.stars)}
      <button type="button" onClick={() => setOpStudent(s)} style={{ ...softButtonStyle, padding: "8px 14px" }}>
        شحن / سحب
      </button>
    </div>
  );

  const togglePicked = (id: string) => setHalqaPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allPicked = halaqat.length > 0 && halqaPicked.length === halaqat.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            setHalqaPicked([]);
            setHalqaOp(true);
          }}
          style={{ ...primaryButtonStyle, padding: "11px 20px" }}
        >
          ★ نجوم الحلقات
        </button>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>شحن رصيد حلقة أو أكثر أو سحبه — يصرفه مدرّسها على طلابها وحدهم.</span>
      </div>

      {/* البحث عن طالب مباشرة */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>البحث عن طالب</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اكتبوا اسم الطالب أو رقمه" style={inputStyle()} />
        {search.trim() && matches.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب بهذا الاسم أو الرقم.</div>}
        {matches.map((s) => studentRow(s, true))}
      </div>

      {/* الحلقات */}
      {cohorts.map(([cohortName, list]) => (
        <div key={cohortName} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-2)" }}>فوج {cohortName}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 10 }}>
            {list.map((h) => {
              const open = openHalqa === h.id;
              const studentStars = h.studentIds.reduce((sum, id) => sum + (byId[id]?.stars ?? 0), 0);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setOpenHalqa(open ? null : h.id)}
                  style={{ ...cardStyle, textAlign: "start", cursor: "pointer", outline: open ? "2px solid var(--gold)" : "none", display: "flex", flexDirection: "column", gap: 6, color: "var(--ink)" }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{h.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{h.teacherName}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>رصيد الحلقة: {starBadge(h.stars)}</span>
                    <span style={{ color: "var(--ink-3)" }}>
                      {h.studentIds.length} طالب · ★ {studentStars}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {list.some((h) => h.id === openHalqa) &&
            (() => {
              const h = list.find((x) => x.id === openHalqa)!;
              return (
                <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>طلاب {h.name}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setHalqaPicked([h.id]);
                        setHalqaOp(true);
                      }}
                      style={{ ...softButtonStyle, padding: "8px 14px" }}
                    >
                      شحن / سحب رصيد الحلقة
                    </button>
                  </div>
                  {h.studentIds.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا طلاب في هذه الحلقة.</div>}
                  {h.studentIds.map((id) => byId[id] && studentRow(byId[id], false))}
                </div>
              );
            })()}
        </div>
      ))}

      <StarArchive rows={archive} limit={archiveLimit} />

      {opStudent && (
        <StarOpDrawer
          title="نجوم الطالب"
          subtitle={opStudent.name}
          info={
            <div style={{ padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)", fontSize: 13.5 }}>
              رصيد الطالب: {starBadge(opStudent.stars)} — {opStudent.halqaName ?? "غير مفروز"}
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>شحن الإدارة وسحبها لا يمسّان رصيد الحلقة.</div>
            </div>
          }
          onSubmit={(v) => adminStudentStars({ studentId: opStudent.id, ...v })}
          onClose={() => setOpStudent(null)}
        />
      )}

      {halqaOp && (
        <StarOpDrawer
          title="نجوم الحلقات"
          subtitle="شحن رصيد حلقة أو أكثر أو سحبه"
          canSubmit={halqaPicked.length > 0}
          onSubmit={(v) => adminHalqaStars({ halqaIds: halqaPicked, ...v })}
          onClose={() => setHalqaOp(false)}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>
                الحلقات {halqaPicked.length > 0 && `— المختارة: ${halqaPicked.length} من ${halaqat.length}`}
              </div>
              <button type="button" onClick={() => setHalqaPicked(allPicked ? [] : halaqat.map((h) => h.id))} style={{ ...chipStyle(allPicked), padding: "6px 14px" }}>
                {allPicked ? "✓ كل الحلقات" : "اختيار الكل"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cohorts.map(([cohortName, list]) => (
                <div key={cohortName}>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>فوج {cohortName}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {list.map((h) => (
                      <button key={h.id} type="button" onClick={() => togglePicked(h.id)} style={{ ...chipStyle(halqaPicked.includes(h.id)), padding: "8px 12px" }}>
                        {halqaPicked.includes(h.id) ? "✓ " : ""}
                        {h.name} <span style={{ opacity: 0.75 }}>★ {h.stars}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
              {halqaPicked.length > 1 ? "يُشحن العدد نفسه لكل حلقة من الحلقات المختارة (أو يُسحب من كل منها)." : "اختاروا حلقة واحدة أو أكثر، أو «اختيار الكل»."}
            </div>
          </div>
        </StarOpDrawer>
      )}
    </div>
  );
}
