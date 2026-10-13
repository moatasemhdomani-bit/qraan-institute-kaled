"use client";

import { useMemo, useState } from "react";
import { cardStyle, inputStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import type { StarTxnRow } from "@/lib/stars";
import StarOpDrawer from "../stars/StarOpDrawer";
import StarArchive from "../stars/StarArchive";
import StarBadge from "../stars/StarBadge";
import { activityReturnStars, activityWithdrawStars } from "../stars/actions";

type StudentRow = { id: string; name: string; no: number; stars: number; halqaName: string | null };

export default function ActivityStarsClient({
  students,
  archive,
  archiveLimit,
}: {
  students: StudentRow[];
  archive: StarTxnRow[];
  archiveLimit: number;
}) {
  const [search, setSearch] = useState("");
  const [op, setOp] = useState<StudentRow | null>(null);

  const matches = useMemo(() => {
    const q = toWesternDigits(search.trim());
    if (!q) return [];
    return students.filter((s) => s.name.includes(q) || String(s.no) === q).slice(0, 20);
  }, [students, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>البحث عن طالب</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اكتبوا اسم الطالب أو رقمه" style={inputStyle()} autoFocus />
        {search.trim() && matches.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب بهذا الاسم أو الرقم.</div>}
        {matches.map((s) => (
          <div
            key={s.id}
            style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                {s.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{s.no}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.halqaName ?? "غير مفروز"}</div>
            </div>
            <StarBadge n={s.stars} />
            <button
              type="button"
              disabled={s.stars === 0}
              onClick={() => setOp(s)}
              style={{ ...softButtonStyle, padding: "8px 14px", opacity: s.stars === 0 ? 0.5 : 1 }}
            >
              سحب للنشاط
            </button>
          </div>
        ))}
      </div>

      <StarArchive rows={archive} limit={archiveLimit} title="عمليات السحب التي أجريتها" onReturn={activityReturnStars} />

      {op && (
        <StarOpDrawer
          title="سحب نجوم للنشاط"
          subtitle={op.name}
          kinds={["WITHDRAW"]}
          info={
            <div style={{ padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)", fontSize: 13.5 }}>
              رصيد الطالب: <StarBadge n={op.stars} /> — {op.halqaName ?? "غير مفروز"}
            </div>
          }
          onSubmit={(v) => activityWithdrawStars({ studentId: op.id, amount: v.amount })}
          onClose={() => setOp(null)}
        />
      )}
    </div>
  );
}
