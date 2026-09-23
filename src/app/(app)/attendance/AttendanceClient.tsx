"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { uploadAttendance, type FormState } from "./actions";
import { ATT_STATES } from "@/lib/daily";
import { chipStyle } from "@/lib/ui";

const initialState: FormState = {};

type Student = { id: string; no: number; name: string };

export default function AttendanceClient({
  halqaId,
  date,
  students,
  saved,
  alreadyUploaded,
}: {
  halqaId: string;
  date: string;
  students: Student[];
  saved: Record<string, string>;
  alreadyUploaded: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadAttendance, initialState);
  const [marks, setMarks] = useState<Record<string, string>>(saved);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state.error]);

  const missing = useMemo(() => students.filter((s) => !marks[s.id]), [students, marks]);
  const done = students.length - missing.length;
  const shown = onlyMissing ? missing : students;
  const complete = missing.length === 0 && students.length > 0;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="halqaId" value={halqaId} />
      <input type="hidden" name="date" value={date} />
      {students.map((s) => (
        <input key={s.id} type="hidden" name={`att_${s.id}`} value={marks[s.id] || ""} />
      ))}

      <div
        style={{
          padding: 14,
          borderRadius: 13,
          border: "1px solid var(--line)",
          background: "var(--card-grad)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>سُجِّل</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {done} من {students.length} طالبًا
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: "var(--line-2)", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              background: "var(--btn-grad)",
              width: students.length ? `${Math.round((done / students.length) * 100)}%` : "0%",
              transition: "width .2s",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setOnlyMissing(false)} style={chipStyle(!onlyMissing)}>
            الكل ({students.length})
          </button>
          <button type="button" onClick={() => setOnlyMissing(true)} style={chipStyle(onlyMissing)}>
            ما زال ناقصًا ({missing.length})
          </button>
        </div>
      </div>

      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "var(--card-grad)",
          overflow: "hidden",
          boxShadow: "var(--glow)",
        }}
      >
        {shown.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-2)", fontSize: 14 }}>
            {students.length === 0 ? "لا يوجد طلاب في هذه الحلقة بعد." : "لا أحد ناقص — الجميع مسجَّل."}
          </div>
        )}
        {shown.map((s) => {
          const cur = marks[s.id];
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "12px 14px",
                borderTop: "1px solid var(--line-2)",
                background: cur ? undefined : "linear-gradient(90deg, rgba(224,138,138,0.10), transparent 60%)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", direction: "ltr" }}>#{s.no}</span>
                {!cur && (
                  <span
                    style={{
                      marginInlineStart: "auto",
                      padding: "3px 9px",
                      borderRadius: 999,
                      fontSize: 11,
                      border: "1px solid rgba(224,138,138,0.6)",
                      color: "#F0B4B4",
                    }}
                  >
                    بلا حالة
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {ATT_STATES.map((a) => {
                  const on = cur === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setMarks({ ...marks, [s.id]: a.id })}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 44,
                        padding: "8px 4px",
                        borderRadius: 10,
                        fontSize: 13,
                        cursor: "pointer",
                        border: on ? `1px solid ${a.color}` : "1px solid var(--line)",
                        background: on ? a.color : "var(--btn-soft)",
                        color: on ? "#0A192F" : "var(--ink-2)",
                        fontWeight: on ? 700 : 400,
                      }}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {state.error && (
        <div
          ref={errorRef}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--notice-line)",
            background: "var(--notice-soft)",
            fontSize: 13.5,
          }}
        >
          {state.error}
        </div>
      )}

      {(state.ok || (alreadyUploaded && !state.error)) && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(111,191,139,0.5)",
            background: "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))",
            fontSize: 13.5,
          }}
        >
          حضور هذا اليوم مرفوع — ظهر للإدارة ولأولياء الأمور. أي تعديل بعد الرفع يُسجَّل في سجل التدقيق.
        </div>
      )}

      <button
        type="submit"
        disabled={pending || students.length === 0}
        onClick={(e) => {
          if (!complete) {
            e.preventDefault();
            setOnlyMissing(true);
          }
        }}
        style={{
          width: "100%",
          minHeight: 48,
          padding: 12,
          borderRadius: 11,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          border: complete ? "1px solid var(--btn-border)" : "1px dashed var(--line)",
          background: complete ? "var(--btn-grad)" : "var(--btn-soft)",
          color: complete ? "var(--on-accent)" : "var(--ink-3)",
          boxShadow: complete ? "var(--btn-shadow)" : undefined,
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "جارٍ الرفع…" : complete ? "رفع القائمة" : `رفع القائمة (${missing.length} ناقص)`}
      </button>
    </form>
  );
}
