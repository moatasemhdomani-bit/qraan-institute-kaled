"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle, inputStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import { starsText, type StarTxnRow } from "@/lib/stars";
import StarOpDrawer from "../stars/StarOpDrawer";
import StarArchive from "../stars/StarArchive";
import StarBadge from "../stars/StarBadge";
import { teacherStudentStars } from "../stars/actions";
import { textHas } from "@/lib/search";

type StudentRow = { id: string; name: string; no: number; stars: number };
type HalqaRow = { id: string; name: string; cohortName: string; stars: number; students: StudentRow[] };

export default function TeacherStarsClient({
  halaqat,
  archive,
  archiveLimit,
  defaultHalqaId,
}: {
  halaqat: HalqaRow[];
  archive: StarTxnRow[];
  archiveLimit: number;
  /** حلقة الفوج الجاري الآن */
  defaultHalqaId?: string;
}) {
  const [halqaId, setHalqaId] = useState(defaultHalqaId ?? halaqat[0]?.id ?? "");
  const [search, setSearch] = useState("");
  // العملية على طالب: مع حلقته (رصيدها في النافذة)
  const [op, setOp] = useState<{ s: StudentRow; h: HalqaRow } | null>(null);
  // «كل الحلقات»: حلقات المدرّس كلها متتالية
  const all = halqaId === "all";
  const selected = useMemo(() => (all ? halaqat : halaqat.filter((h) => h.id === halqaId)), [all, halaqat, halqaId]);

  const filterStudents = (list: StudentRow[]) => {
    const q = toWesternDigits(search.trim());
    return q ? list.filter((st) => textHas(st.name, q) || String(st.no) === q) : list;
  };

  if (selected.length === 0) {
    return <div style={{ ...cardStyle, padding: "16px 18px", fontSize: 14, color: "var(--ink-2)" }}>لا توجد لك حلقة في هذا الحساب.</div>;
  }

  const pick = (id: string) => {
    setHalqaId(id);
    setSearch("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* اختيار الحلقة من الأعلى — و«كل الحلقات» أوّلها */}
      {halaqat.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => pick("all")} style={{ ...chipStyle(all), minHeight: 42, padding: "9px 16px" }}>
            كل الحلقات
          </button>
          {halaqat.map((h) => (
            <button key={h.id} type="button" onClick={() => pick(h.id)} style={{ ...chipStyle(h.id === halqaId), minHeight: 42, padding: "9px 16px" }}>
              {h.name} — {h.cohortName}
            </button>
          ))}
        </div>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم الطالب أو رقمه" style={inputStyle()} />

      {selected.map((halqa) => {
        const shown = filterStudents(halqa.students);
        if (all && search.trim() && shown.length === 0) return null;
        return (
          <div key={halqa.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>رصيد نجوم {all ? halqa.name : "الحلقة"}</div>
                <div style={{ fontSize: 26 }}>
                  <StarBadge n={halqa.stars} />
                </div>
              </div>
              {!all && (
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", maxWidth: 360 }}>
                  الإيداع لطالب يُصرف من رصيد الحلقة، والسحب من طالب يعيد النجوم إلى رصيد الحلقة. تودع الإدارة رصيد الحلقة.
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>طلاب {halqa.name}</div>
              {shown.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{search.trim() ? "لا يوجد طالب بهذا الاسم أو الرقم." : "لا طلاب في هذه الحلقة."}</div>
              )}
              {shown.map((st) => (
                <div
                  key={st.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}
                >
                  <div style={{ flex: 1, minWidth: 150, fontSize: 14.5, fontWeight: 600 }}>
                    {st.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{st.no}</span>
                  </div>
                  <StarBadge n={st.stars} />
                  <button type="button" onClick={() => setOp({ s: st, h: halqa })} style={{ ...softButtonStyle, padding: "8px 14px" }}>
                    إيداع / سحب
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {all && search.trim() && selected.every((h) => filterStudents(h.students).length === 0) && (
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب بهذا الاسم أو الرقم.</div>
      )}

      <StarArchive rows={archive.filter((r) => selected.some((h) => h.id === r.halqaId))} limit={archiveLimit} title={all ? "عمليات نجوم حلقاتك" : "عمليات نجوم الحلقة"} />

      {op && (
        <StarOpDrawer
          title="نجوم الطالب"
          subtitle={op.s.name}
          info={
            <div style={{ padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)", fontSize: 13.5, display: "flex", flexDirection: "column", gap: 4 }}>
              <div>
                رصيد الطالب: <StarBadge n={op.s.stars} />
              </div>
              <div>
                رصيد {op.h.name}: <StarBadge n={op.h.stars} />{" "}
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>— أقصى إيداع الآن {starsText(op.h.stars)}</span>
              </div>
            </div>
          }
          balance={op.s.stars}
          onSubmit={(v) => teacherStudentStars({ studentId: op.s.id, ...v })}
          onClose={() => setOp(null)}
        />
      )}
    </div>
  );
}
