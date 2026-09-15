"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { chipStyle, inputStyle } from "@/lib/ui";

type Row = {
  id: string;
  name: string;
  no: number;
  state: "done" | "blank" | "none";
  lines: string[];
};

type Block = {
  id: string;
  name: string;
  meta: string;
  uploaded: boolean;
  totalPages: number;
  rows: Row[];
};

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "done", label: "سمّع" },
  { id: "blank", label: "لم يسمّع" },
  { id: "none", label: "لم يُسجَّل" },
];

export default function RecitationMonitorClient({
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
  const [filter, setFilter] = useState("all");

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
              {pendingCount} من {totalCount} حلقة لم ترفع التسميع بعد
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              التسميع غير المسجَّل لا يظهر لأولياء الأمور — تحقّق من مدرّس الحلقة.
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
            كل الحلقات رفعت تسميع هذا اليوم.
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
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={chipStyle(filter === f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>التاريخ</span>
          <input
            type="date"
            defaultValue={date}
            onChange={(e) => e.target.value && router.push(`/recitation-monitor?date=${e.target.value}`)}
            style={{ ...inputStyle(), width: 170, minHeight: 40, textAlign: "center", direction: "ltr" }}
          />
        </div>
      </div>

      {blocks.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          لا توجد حلقات بعد — أنشئ حلقة أولًا.
        </div>
      )}

      {blocks.map((b) => {
        const rows = filter === "all" ? b.rows : b.rows.filter((r) => r.state === filter);
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
                {b.uploaded && (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      border: "1px solid var(--line)",
                      color: "var(--ink-2)",
                      background: "var(--chip)",
                    }}
                  >
                    {b.totalPages} صفحة
                  </span>
                )}
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
                    href={`/recitation?halqa=${b.id}&date=${date}`}
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
                    {b.uploaded ? "تعديل التسميع" : "تسجيل التسميع"}
                  </Link>
                )}
              </div>
            </div>

            {!b.uploaded ? (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--ink-2)" }}>
                لم يسجّل مدرّس هذه الحلقة تسميع هذا اليوم.
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: "16px", fontSize: 13, color: "var(--ink-3)" }}>لا أحد بهذه الحالة في هذه الحلقة.</div>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    padding: "11px 16px",
                    borderTop: "1px solid var(--line-2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-3)", direction: "ltr" }}>#{r.no}</span>
                    {r.state !== "done" && (
                      <span
                        style={{
                          marginInlineStart: "auto",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          border: "1px solid var(--line)",
                          color: "var(--ink-3)",
                        }}
                      >
                        {r.state === "blank" ? "لم يسمّع اليوم" : "لم يُسجَّل"}
                      </span>
                    )}
                  </div>
                  {r.lines.map((l, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--ink-2)" }}>
                      {l}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        );
      })}

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {canRecord
          ? "بصفتك مدير المعهد يمكنك تسجيل تسميع أي حلقة أو تعديله — ويُسجَّل ذلك في سجل التدقيق."
          : "عرض فقط — لا تعديل من الإدارة على ما سجّله المدرّس."}
      </div>
    </div>
  );
}
