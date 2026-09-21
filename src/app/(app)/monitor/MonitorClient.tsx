"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ATT_STATES } from "@/lib/daily";
import { chipStyle } from "@/lib/ui";
import DateField from "@/components/DateField";

type Block = {
  id: string;
  name: string;
  meta: string;
  uploaded: boolean;
  tally: { id: string; label: string; color: string; count: number }[];
  rows: { id: string; name: string; status: string; label: string }[];
};

export default function MonitorClient({
  date,
  blocks,
  pendingCount,
  totalCount,
  canRecord,
}: {
  date: string;
  blocks: Block[];
  pendingCount: number;
  totalCount: number;
  canRecord: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  const filters = [{ id: "all", label: "الكل" }, ...ATT_STATES.map((s) => ({ id: s.id, label: s.label }))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {pendingCount > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: "15px 16px",
            borderRadius: 13,
            border: "1px solid rgba(224,138,138,0.6)",
            background: "linear-gradient(135deg, rgba(224,138,138,0.20), rgba(224,138,138,0.04))",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#E08A8A", flex: "none", marginTop: 6 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
              {pendingCount} من {totalCount} حلقة لم ترفع الحضور بعد
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              الحلقة التي لم تُسجَّل تبدو فارغة تمامًا كحلقة كل طلابها حاضرون — تحقّق من مدرّسها.
            </div>
          </div>
        </div>
      ) : (
        totalCount > 0 && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 13,
              border: "1px solid rgba(111,191,139,0.5)",
              background: "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))",
              fontSize: 13.5,
            }}
          >
            كل الحلقات رفعت حضور هذا اليوم.
          </div>
        )
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 13,
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filters.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={chipStyle(filter === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>التاريخ</span>
          <DateField defaultValue={date} onChange={(v) => v && router.push(`/monitor?date=${v}`)} />
        </div>
      </div>

      {blocks.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          لا توجد حلقات بعد — أنشئ حلقة أولًا.
        </div>
      )}

      {blocks.map((b) => {
        const rows = filter === "all" ? b.rows : b.rows.filter((r) => r.status === filter);
        return (
          <div
            key={b.id}
            style={{
              borderRadius: 14,
              border: b.uploaded ? "1px solid var(--line)" : "1px solid rgba(224,138,138,0.45)",
              background: "var(--card-grad)",
              overflow: "hidden",
              boxShadow: "var(--glow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                padding: "13px 16px",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{b.meta}</div>
              </div>
              <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  border: b.uploaded ? "1px solid rgba(111,191,139,0.5)" : "1px solid rgba(224,138,138,0.6)",
                  color: b.uploaded ? "#8FD3A8" : "#F0B4B4",
                  background: b.uploaded ? "rgba(111,191,139,0.12)" : "rgba(224,138,138,0.12)",
                }}
              >
                {b.uploaded ? "مرفوع" : "لم يُرفع بعد"}
              </span>
              {canRecord && (
                <Link
                  href={"/attendance?halqa=" + b.id + "&date=" + date}
                  style={{
                    padding: "6px 13px",
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: "1px solid var(--btn-border)",
                    background: "var(--btn-grad)",
                    color: "var(--on-accent)",
                  }}
                >
                  {b.uploaded ? "تعديل الحضور" : "تسجيل الحضور"}
                </Link>
              )}
              </div>
            </div>

            {!b.uploaded ? (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--ink-2)" }}>
                لم يسجّل مدرّس هذه الحلقة حضور هذا اليوم.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "11px 16px", borderBottom: "1px solid var(--line-2)" }}>
                  {b.tally.map((t) => (
                    <span
                      key={t.id}
                      style={{
                        padding: "4px 11px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: `1px solid ${t.color}66`,
                        color: t.color,
                        background: `${t.color}1A`,
                      }}
                    >
                      {t.label} {t.count}
                    </span>
                  ))}
                </div>
                {rows.length === 0 ? (
                  <div style={{ padding: "16px", fontSize: 13, color: "var(--ink-3)" }}>لا أحد بهذه الحالة في هذه الحلقة.</div>
                ) : (
                  rows.map((r) => (
                    <div
                      key={r.id}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}
                    >
                      <span style={{ fontSize: 14 }}>{r.name}</span>
                      <span
                        style={{
                          marginInlineStart: "auto",
                          padding: "4px 11px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: "1px solid var(--line)",
                          color: "var(--ink-2)",
                        }}
                      >
                        {r.label}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {canRecord
          ? "بصفتك مدير المعهد يمكنك تسجيل حضور أي حلقة أو تعديله — ويُسجَّل ذلك في سجل التدقيق."
          : "عرض فقط — لا تعديل من الإدارة على ما سجّله المدرّس."}
      </div>
    </div>
  );
}
