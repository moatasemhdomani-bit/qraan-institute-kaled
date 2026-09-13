"use client";

import { useMemo, useState } from "react";
import { inputStyle, cardStyle } from "@/lib/ui";

type Row = { id: string; who: string; what: string; when: string };

export default function AuditClient({ rows }: { rows: Row[] }) {
  const [qTeacher, setQTeacher] = useState("");
  const [qStudent, setQStudent] = useState("");
  const [qExaminer, setQExaminer] = useState("");

  const filtered = useMemo(() => {
    const terms = [qTeacher, qStudent, qExaminer].map((t) => t.trim()).filter(Boolean);
    if (terms.length === 0) return rows;
    return rows.filter((r) => terms.every((t) => r.who.includes(t) || r.what.includes(t)));
  }, [rows, qTeacher, qStudent, qExaminer]);

  return (
    <div style={{ ...cardStyle, overflow: "auto" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "14px 16px", borderBottom: "1px solid var(--line-2)" }}>
        <input value={qTeacher} onChange={(e) => setQTeacher(e.target.value)} placeholder="بحث باسم مدرّس" style={{ ...inputStyle(), flex: 1, minWidth: 150 }} />
        <input value={qStudent} onChange={(e) => setQStudent(e.target.value)} placeholder="بحث باسم طالب" style={{ ...inputStyle(), flex: 1, minWidth: 150 }} />
        <input value={qExaminer} onChange={(e) => setQExaminer(e.target.value)} placeholder="بحث باسم مختبِر" style={{ ...inputStyle(), flex: 1, minWidth: 150 }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "56px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{rows.length === 0 ? "السجل فارغ" : "لا نتائج مطابقة"}</div>
          <div style={{ color: "var(--ink-2)", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
            {rows.length === 0
              ? "يبدأ السجل فارغًا في اليوم الأول ويتراكم مع أول تعديل يجريه أي إداري: إضافة عامل، تعديل حلقة، تسجيل طالب."
              : "جرّبوا مصطلح بحث مختلفًا."}
          </div>
        </div>
      ) : (
        <>
        <div className="list-table-wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 1fr",
              gap: 12,
              padding: "11px 16px",
              background: "var(--head-grad)",
              fontSize: 12,
              color: "var(--ink-2)",
              fontWeight: 600,
              minWidth: 560,
            }}
          >
            <div>الإداري</div>
            <div>الإجراء</div>
            <div>الوقت</div>
          </div>
          {filtered.map((a) => (
            <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12, padding: "13px 16px", borderTop: "1px solid var(--line-2)", fontSize: 14, alignItems: "center", minWidth: 560 }}>
              <div>{a.who}</div>
              <div style={{ color: "var(--ink-2)", fontSize: 13 }}>{a.what}</div>
              <div style={{ color: "var(--ink-3)", fontSize: 13 }}>{a.when}</div>
            </div>
          ))}
        </div>

        <div className="list-cards">
          {filtered.map((a) => (
            <div key={a.id} style={{ padding: "13px 14px", borderTop: "1px solid var(--line-2)", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{a.who}</span>
                <span style={{ marginInlineStart: "auto", fontSize: 12, color: "var(--ink-3)" }}>{a.when}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{a.what}</div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
