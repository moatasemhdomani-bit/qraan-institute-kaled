"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle, inputStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import { starsText, type StarTxnRow } from "@/lib/stars";
import StarOpDrawer from "../stars/StarOpDrawer";
import StarArchive from "../stars/StarArchive";
import StarBadge from "../stars/StarBadge";
import { teacherStudentStars } from "../stars/actions";

type StudentRow = { id: string; name: string; no: number; stars: number };
type HalqaRow = { id: string; name: string; cohortName: string; stars: number; students: StudentRow[] };

export default function TeacherStarsClient({
  halaqat,
  archive,
  archiveLimit,
}: {
  halaqat: HalqaRow[];
  archive: StarTxnRow[];
  archiveLimit: number;
}) {
  const [halqaId, setHalqaId] = useState(halaqat[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [op, setOp] = useState<StudentRow | null>(null);
  const halqa = halaqat.find((h) => h.id === halqaId);

  const shown = useMemo(() => {
    const q = toWesternDigits(search.trim());
    const list = halqa?.students ?? [];
    return q ? list.filter((s) => s.name.includes(q) || String(s.no) === q) : list;
  }, [halqa, search]);

  if (!halqa) {
    return <div style={{ ...cardStyle, fontSize: 14, color: "var(--ink-2)" }}>لا توجد لك حلقة في هذا الحساب.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* اختيار الحلقة من الأعلى */}
      {halaqat.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {halaqat.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                setHalqaId(h.id);
                setSearch("");
              }}
              style={{ ...chipStyle(h.id === halqaId), minHeight: 42, padding: "9px 16px" }}
            >
              {h.name} — {h.cohortName}
            </button>
          ))}
        </div>
      )}

      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>رصيد نجوم الحلقة</div>
          <div style={{ fontSize: 26 }}>
            <StarBadge n={halqa.stars} />
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", maxWidth: 360 }}>
          الشحن لطالب يُصرف من رصيد الحلقة، والسحب من طالب يعيد النجوم إلى رصيد الحلقة. تشحن الإدارة رصيد الحلقة.
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>طلاب {halqa.name}</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم الطالب أو رقمه" style={inputStyle()} />
        {shown.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{search.trim() ? "لا يوجد طالب بهذا الاسم أو الرقم." : "لا طلاب في هذه الحلقة."}</div>
        )}
        {shown.map((s) => (
          <div
            key={s.id}
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}
          >
            <div style={{ flex: 1, minWidth: 150, fontSize: 14.5, fontWeight: 600 }}>
              {s.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{s.no}</span>
            </div>
            <StarBadge n={s.stars} />
            <button type="button" onClick={() => setOp(s)} style={{ ...softButtonStyle, padding: "8px 14px" }}>
              شحن / سحب
            </button>
          </div>
        ))}
      </div>

      <StarArchive rows={archive.filter((r) => r.halqaId === halqa.id)} limit={archiveLimit} title="عمليات نجوم الحلقة" />

      {op && (
        <StarOpDrawer
          title="نجوم الطالب"
          subtitle={op.name}
          info={
            <div style={{ padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)", fontSize: 13.5, display: "flex", flexDirection: "column", gap: 4 }}>
              <div>
                رصيد الطالب: <StarBadge n={op.stars} />
              </div>
              <div>
                رصيد الحلقة: <StarBadge n={halqa.stars} />{" "}
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>— أقصى شحن الآن {starsText(halqa.stars)}</span>
              </div>
            </div>
          }
          onSubmit={(v) => teacherStudentStars({ studentId: op.id, ...v })}
          onClose={() => setOp(null)}
        />
      )}
    </div>
  );
}
