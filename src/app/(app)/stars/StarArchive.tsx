"use client";

import { useMemo, useState, useTransition } from "react";
import { cardStyle, chipStyle, softButtonStyle } from "@/lib/ui";
import { starKindLabel, type StarTxnRow } from "@/lib/stars";
import type { StarResult } from "./actions";

/** أرشيف التعديلات على أرصدة النجوم: الطالب (أو رصيد الحلقة)، الجهة المانحة، العملية، التاريخ. */
export default function StarArchive({
  rows,
  limit,
  title = "أرشيف التعديلات على أرصدة النجوم",
  onReturn,
}: {
  rows: StarTxnRow[];
  limit: number;
  title?: string;
  /** مسؤول النشاط: «إعادة» نجوم سحبها بالغلط */
  onReturn?: (id: string) => Promise<StarResult>;
}) {
  const [filter, setFilter] = useState<"ALL" | "CHARGE" | "WITHDRAW">("ALL");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = useMemo(() => rows.filter((r) => filter === "ALL" || r.kind === filter), [rows, filter]);

  function doReturn(id: string) {
    if (!onReturn) return;
    setError(null);
    startTransition(async () => {
      const res = await onReturn(id);
      if (res.error) setError({ id, msg: res.error });
      setConfirmId(null);
    });
  }

  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{title}</div>
        {(["ALL", "CHARGE", "WITHDRAW"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setFilter(k)} style={chipStyle(filter === k)}>
            {k === "ALL" ? "الكل" : starKindLabel(k)}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>عدد النتائج: {shown.length}</div>
      {rows.length >= limit && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>آخر {limit} عملية.</div>}
      {shown.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا توجد عمليات بعد.</div>}
      {shown.map((r) => {
        const charge = r.kind === "CHARGE";
        const tone = charge ? "var(--ok)" : "var(--bad)";
        const canReturn = !!onReturn && !charge && !r.returned && !r.isReturn && r.studentName != null;
        return (
          <div
            key={r.id}
            style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr) auto", gap: "4px 12px", alignItems: "center", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {r.studentName ? (
                  <>
                    {r.studentName} {r.studentNo != null && <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}>#{r.studentNo}</span>}
                  </>
                ) : (
                  <>رصيد الحلقة</>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                {r.halqaName ?? "—"}
                {r.fromPool && (charge ? " · من رصيد الحلقة" : " · عادت إلى رصيد الحلقة")}
              </div>
            </div>
            <div style={{ minWidth: 0, fontSize: 12.5, color: "var(--ink-2)" }}>
              <div>
                الجهة المانحة: {r.byLabel} — {r.byName}
              </div>
              <div style={{ color: "var(--ink-3)" }}>{r.at}</div>
            </div>
            <div
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
                color: tone,
                border: `1px solid color-mix(in srgb, ${tone} 50%, transparent)`,
                background: `color-mix(in srgb, ${tone} 12%, transparent)`,
              }}
            >
              {r.isReturn ? "إعادة" : starKindLabel(r.kind)} {charge ? "+" : "−"}
              {r.amount} ★
            </div>
            {r.returned && <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "var(--ink-3)" }}>أُعيدت نجومها</div>}
            {canReturn && (
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {confirmId === r.id ? (
                  <>
                    <span style={{ fontSize: 12.5 }}>إعادة {r.amount} ★ إلى {r.studentName}؟</span>
                    <button type="button" disabled={pending} onClick={() => doReturn(r.id)} style={{ ...softButtonStyle, padding: "6px 14px" }}>
                      {pending ? "جارٍ…" : "نعم، أعِدها"}
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} style={{ ...chipStyle(false), padding: "6px 14px" }}>
                      تراجع
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(r.id)} style={{ ...softButtonStyle, padding: "6px 14px" }}>
                    إعادة (سُحبت بالغلط)
                  </button>
                )}
                {error?.id === r.id && <span style={{ fontSize: 12.5, color: "var(--bad)" }}>{error.msg}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
