"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, chipStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import { today, monthStart, currentMonthNo } from "@/lib/daily";
import type { ReviewInputs } from "@/lib/reports";
import type { CommitmentReport, RecState } from "@/lib/teacherCommitment";

const REC_LABELS: Record<RecState, string> = { full: "مرفوع", partial: "غير مكتمل", none: "لم يُرفع" };
import IssuedNotice, { PdfButtons } from "../IssuedNotice";
import { previewTeacherCommitment, issueTeacherCommitment, type FormState } from "./actions";

const initialState: FormState = {};

const REC_STYLE: Record<RecState, React.CSSProperties> = {
  full: { color: "var(--ok)" },
  partial: { color: "var(--gold)" },
  none: { color: "var(--bad)" },
};

export default function TeacherCommitmentClient({ teachers, initial }: { teachers: { id: string; name: string }[]; initial: ReviewInputs | null }) {
  const [from, setFrom] = useState(initial?.from ?? monthStart());
  const [to, setTo] = useState(initial?.to ?? today());
  const [picked, setPicked] = useState<string[] | "all">(initial?.teacherIds ?? "all");
  const [name, setName] = useState(initial?.name ?? `التزام المدرّسين بالموقع — ${currentMonthNo()}`);
  const [report, setReport] = useState<CommitmentReport | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, formAction, issuing] = useActionState(issueTeacherCommitment, initialState);

  const isAll = picked === "all";
  const toggle = (id: string) =>
    setPicked((prev) => {
      const cur = prev === "all" ? [] : prev;
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });

  function loadPreview() {
    setPreviewError("");
    startTransition(async () => {
      const res = await previewTeacherCommitment(from, to, picked);
      if ("error" in res) {
        setPreviewError(res.error);
        setReport(null);
        return;
      }
      setReport(res.report);
    });
  }

  const reviewed = useRef(false);
  useEffect(() => {
    if (initial && !reviewed.current) {
      reviewed.current = true;
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const th: React.CSSProperties = { padding: "7px 8px", fontSize: 11.5, fontWeight: 700, color: "var(--ink-2)", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap", textAlign: "center" };
  const td: React.CSSProperties = { padding: "6px 8px", fontSize: 11.5, borderBottom: "1px solid var(--line)", textAlign: "center", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/reports" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ← رجوع إلى مركز التقارير
      </Link>

      <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <DateField label="تاريخ البداية" value={from} onChange={setFrom} />
          <DateField label="تاريخ النهاية" value={to} onChange={setTo} />
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>
            المدرّسون {!isAll && picked.length > 0 && `— المختارون: ${picked.length}`}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setPicked("all")} style={{ ...chipStyle(isAll), padding: "8px 14px" }}>
              {isAll ? "✓ " : ""}كل المدرّسين
            </button>
            {teachers.map((t) => {
              const on = !isAll && picked.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggle(t.id)} style={{ ...chipStyle(on), padding: "8px 12px" }}>
                  {on ? "✓ " : ""}
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={loadPreview} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ التحميل…" : "معاينة"}
          </button>
          {report && report.rows.length > 0 &&
            (initial?.id ? (
              <PdfButtons reportId={initial.id} name={initial.name} />
            ) : (
              <button type="submit" form="report-issue-form" disabled={issuing || pending} style={{ ...primaryButtonStyle, opacity: issuing || pending ? 0.7 : 1 }}>
                {issuing ? "جارٍ الإصدار…" : "إصدار التقرير"}
              </button>
            ))}
        </div>
      </div>

      {previewError && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{previewError}</div>
      )}

      {report && report.rows.length === 0 && !previewError && (
        <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا حلقات للمدرّسين المختارين، أو لا أيام دوام في الفترة.</div>
      )}

      {report && report.rows.length > 0 && (
        <form
          id="report-issue-form"
          action={(fd) => {
            fd.set("from", from);
            fd.set("to", to);
            fd.set("teacherIds", picked === "all" ? "all" : JSON.stringify(picked));
            fd.set("name", name);
            formAction(fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          {state.error && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{state.error}</div>
          )}
          {state.ok && state.reportId && <IssuedNotice reportId={state.reportId} name={name} duplicate={state.duplicate} />}

          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            أيام الدوام في الفترة: {report.days.length}
            {report.truncated ? " (عُرض أول 62 يومًا)" : ""} — في كل خانة: الحضور ثم التسميع.
          </div>
          <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 13, background: "var(--card)" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "start" }}>المدرّس</th>
                  <th style={{ ...th, textAlign: "start" }}>الحلقة</th>
                  {report.days.map((d) => (
                    <th key={d.date} style={th}>
                      {d.label}
                    </th>
                  ))}
                  <th style={th}>رفع الحضور</th>
                  <th style={th}>لم يرفع الحضور</th>
                  <th style={th}>التسميع مرفوع</th>
                  <th style={th}>غير مكتمل</th>
                  <th style={th}>لم يرفع التسميع</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.halqaId}>
                    <td style={{ ...td, textAlign: "start", fontWeight: 600 }}>{r.teacherName}</td>
                    <td style={{ ...td, textAlign: "start" }}>
                      {r.halqaName} <span style={{ color: "var(--ink-3)" }}>· {r.cohortName}</span>
                    </td>
                    {report.days.map((d) => {
                      const c = r.cells[d.date];
                      return (
                        <td key={d.date} style={td}>
                          <div style={{ color: c.att ? "var(--ok)" : "var(--bad)", fontWeight: 600 }}>{c.att ? "رفع" : "لم يرفع"}</div>
                          <div style={REC_STYLE[c.rec]}>{REC_LABELS[c.rec]}</div>
                        </td>
                      );
                    })}
                    <td style={{ ...td, color: "var(--ok)", fontWeight: 700 }}>{r.totals.attUp}</td>
                    <td style={{ ...td, color: "var(--bad)", fontWeight: 700 }}>{r.totals.attNo}</td>
                    <td style={{ ...td, color: "var(--ok)", fontWeight: 700 }}>{r.totals.recFull}</td>
                    <td style={{ ...td, color: "var(--gold)", fontWeight: 700 }}>{r.totals.recPartial}</td>
                    <td style={{ ...td, color: "var(--bad)", fontWeight: 700 }}>{r.totals.recNone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </div>
  );
}
