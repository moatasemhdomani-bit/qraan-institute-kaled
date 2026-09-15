"use client";

import { useRouter } from "next/navigation";
import { chipStyle, inputStyle, cardStyle } from "@/lib/ui";

export default function ParentClient({
  family,
  activeId,
  from,
  to,
  child,
  todayLabel,
  todayState,
  recLines,
  recDateLabel,
  attHistory,
  recHistory,
}: {
  family: { id: string; label: string }[];
  activeId: string;
  from: string;
  to: string;
  child: { name: string; meta: string };
  todayLabel: string;
  todayState: { label: string; color: string };
  recLines: string[];
  recDateLabel: string;
  attHistory: { date: string; label: string; color: string }[];
  recHistory: { date: string; blank: boolean; newLine: string; pastLine: string }[];
}) {
  const router = useRouter();
  const go = (child: string, f: string, t: string) => router.push(`/parent?child=${child}&from=${f}&to=${t}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {family.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {family.map((c) => (
            <button key={c.id} onClick={() => go(c.id, from, to)} style={chipStyle(c.id === activeId)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ ...cardStyle, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{child.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{child.meta}</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{todayLabel}</div>
        <div>
          <span
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 700,
              border: `1px solid ${todayState.color}`,
              background: `${todayState.color}22`,
              color: todayState.color,
            }}
          >
            {todayState.label}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid var(--line-2)" }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 2 }}>
            {recDateLabel ? `ما سمّعه في ${recDateLabel}` : "ما سمّعه"}
          </div>
          {recLines.map((l, i) => (
            <div key={i} style={{ fontSize: 14 }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px 14px",
          borderRadius: 13,
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>من</span>
        <input
          type="date"
          defaultValue={from}
          onChange={(e) => e.target.value && go(activeId, e.target.value, to)}
          style={{ ...inputStyle(), width: 160, minHeight: 40, textAlign: "center", direction: "ltr" }}
        />
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>إلى</span>
        <input
          type="date"
          defaultValue={to}
          onChange={(e) => e.target.value && go(activeId, from, e.target.value)}
          style={{ ...inputStyle(), width: 160, minHeight: 40, textAlign: "center", direction: "ltr" }}
        />
      </div>

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)", fontSize: 14, fontWeight: 700 }}>
          جدول الحضور
        </div>
        {attHistory.length === 0 ? (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--ink-2)" }}>لا يوجد حضور مسجَّل في هذه الفترة.</div>
        ) : (
          attHistory.map((h, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}
            >
              <span style={{ fontSize: 13.5, color: "var(--ink-2)", direction: "ltr" }}>{h.date}</span>
              <span
                style={{
                  marginInlineStart: "auto",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  border: `1px solid ${h.color}66`,
                  color: h.color,
                  background: `${h.color}1A`,
                }}
              >
                {h.label}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)", fontSize: 14, fontWeight: 700 }}>
          جدول التسميع
        </div>
        {recHistory.length === 0 ? (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--ink-2)" }}>لا يوجد تسميع مسجَّل في هذه الفترة.</div>
        ) : (
          recHistory.map((h, i) => (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", gap: 6, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}
            >
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", direction: "ltr", textAlign: "right" }}>{h.date}</div>
              {h.blank ? (
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>لم يسمّع في هذا اليوم</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{h.newLine}</div>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{h.pastLine}</div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          borderRadius: 14,
          border: "1px dashed var(--line)",
          background: "var(--card-2-grad)",
          padding: "26px 18px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>جدول الاختبارات والشهادات</div>
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>فارغ حتى المرحلة 3 — تظهر هنا نتائج السبر والشهادات.</div>
      </div>
    </div>
  );
}
