"use client";

import { useMemo, useState } from "react";
import { inputStyle, cardStyle } from "@/lib/ui";

type Row = { id: string; who: string; actorRole: string; what: string; when: string };
type NameRow = { id: string; name: string };

export default function AuditClient({ rows, students, examiners }: { rows: Row[]; students: NameRow[]; examiners: NameRow[] }) {
  const [qAdmin, setQAdmin] = useState("");
  const [qStudent, setQStudent] = useState("");
  const [qExaminer, setQExaminer] = useState("");

  const matchedStudents = useMemo(
    () => (qStudent.trim() ? students.filter((s) => s.name.includes(qStudent.trim())) : []),
    [students, qStudent]
  );
  const matchedExaminers = useMemo(
    () => (qExaminer.trim() ? examiners.filter((e) => e.name.includes(qExaminer.trim())) : []),
    [examiners, qExaminer]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (qAdmin.trim() && !((r.actorRole === "DIRECTOR" || r.actorRole === "ADMIN") && r.who.includes(qAdmin.trim()))) return false;
      if (qStudent.trim() && !matchedStudents.some((s) => r.what.includes(s.name))) return false;
      if (qExaminer.trim() && !(r.actorRole === "EXAMINER" && matchedExaminers.some((e) => e.name === r.who))) return false;
      return true;
    });
  }, [rows, qAdmin, qStudent, qExaminer, matchedStudents, matchedExaminers]);

  const anySearch = qAdmin.trim() || qStudent.trim() || qExaminer.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ ...cardStyle, display: "flex", gap: 10, flexWrap: "wrap", padding: "14px 16px" }}>
        <input value={qAdmin} onChange={(e) => setQAdmin(e.target.value)} placeholder="بحث باسم إداري" style={{ ...inputStyle(), flex: 1, minWidth: 150 }} />
        <input value={qStudent} onChange={(e) => setQStudent(e.target.value)} placeholder="بحث باسم طالب" style={{ ...inputStyle(), flex: 1, minWidth: 150 }} />
        <input value={qExaminer} onChange={(e) => setQExaminer(e.target.value)} placeholder="بحث باسم مختبِر" style={{ ...inputStyle(), flex: 1, minWidth: 150 }} />
      </div>

      {qStudent.trim() && (
        <div style={{ ...cardStyle, padding: "12px 16px", fontSize: 13 }}>
          {matchedStudents.length === 0 ? (
            <span style={{ color: "var(--ink-2)" }}>لا طالب باسم يطابق «{qStudent.trim()}».</span>
          ) : (
            <>
              <span style={{ color: "var(--ink-2)" }}>طلاب مطابقون: </span>
              {matchedStudents.map((s) => (
                <span key={s.id} style={{ display: "inline-block", margin: "2px 6px 2px 0", padding: "3px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--chip)" }}>
                  {s.name}
                </span>
              ))}
            </>
          )}
        </div>
      )}

      {qExaminer.trim() && (
        <div style={{ ...cardStyle, padding: "12px 16px", fontSize: 13 }}>
          {matchedExaminers.length === 0 ? (
            <span style={{ color: "var(--ink-2)" }}>لا مختبِر باسم يطابق «{qExaminer.trim()}».</span>
          ) : (
            <>
              <span style={{ color: "var(--ink-2)" }}>مختبِرون مطابقون: </span>
              {matchedExaminers.map((e) => (
                <span key={e.id} style={{ display: "inline-block", margin: "2px 6px 2px 0", padding: "3px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--chip)" }}>
                  {e.name}
                </span>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ ...cardStyle, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{rows.length === 0 ? "السجل فارغ" : "لا نتائج مطابقة"}</div>
            <div style={{ color: "var(--ink-2)", fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
              {rows.length === 0
                ? "يبدأ السجل فارغًا في اليوم الأول ويتراكم مع أول تعديل يجريه أي إداري: إضافة عامل، تعديل حلقة، تسجيل طالب."
                : anySearch
                  ? "لا تعديلات مطابقة لهذا البحث."
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
              <div>الفاعل</div>
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
    </div>
  );
}
