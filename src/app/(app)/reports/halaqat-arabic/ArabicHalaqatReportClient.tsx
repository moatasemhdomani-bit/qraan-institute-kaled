"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import Select from "@/components/Select";
import { today } from "@/lib/daily";
import type { ReviewInputs, ArabicHalaqatBlock, ArabicExamMark } from "@/lib/reports";
import IssuedNotice from "../IssuedNotice";
import { previewArabicHalaqatReport, issueArabicHalaqatReport, type FormState } from "./actions";

const initialState: FormState = {};

/** أرقام مراحل الاختبارات: الأخضر ناجح والأحمر راسب. */
function ExamStages({ exams }: { exams: ArabicExamMark[] }) {
  if (exams.length === 0) return <span style={{ color: "var(--ink-3)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
      {exams.map((e, i) => (
        <b key={i} style={{ color: e.passed === false ? "var(--bad)" : e.passed ? "var(--ok)" : "var(--ink-2)" }}>
          {e.stage}
        </b>
      ))}
    </span>
  );
}

export default function ArabicHalaqatReportClient({ halaqat, initial }: { halaqat: { id: string; name: string }[]; initial: ReviewInputs | null }) {
  const [from, setFrom] = useState(initial?.from ?? today());
  const [to, setTo] = useState(initial?.to ?? today());
  const [halqaScope, setHalqaScope] = useState(initial?.halqaScope ?? "all");
  const [name, setName] = useState(initial?.name ?? "");
  const [blocks, setBlocks] = useState<ArabicHalaqatBlock[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, formAction, issuing] = useActionState(issueArabicHalaqatReport, initialState);

  const halqaOptions = useMemo(() => [{ value: "all", label: "كل الحلقات معًا" }, ...halaqat.map((h) => ({ value: h.id, label: h.name }))], [halaqat]);

  function loadPreview() {
    setPreviewError("");
    startTransition(async () => {
      const res = await previewArabicHalaqatReport(from, to, halqaScope);
      if ("error" in res) {
        setPreviewError(res.error);
        setBlocks(null);
        return;
      }
      setBlocks(res.blocks);
    });
  }

  // «مراجعة التقرير» من السجل: يُعاد إعداده فورًا بنفس الفترة والنطاق
  const reviewed = useRef(false);
  useEffect(() => {
    if (initial && !reviewed.current) {
      reviewed.current = true;
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/reports" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ← رجوع إلى مركز التقارير
      </Link>

      <div style={{ ...cardStyle, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <DateField label="تاريخ البداية" value={from} onChange={setFrom} />
        <DateField label="تاريخ النهاية" value={to} onChange={setTo} />
        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>نطاق الحلقات</label>
          <Select value={halqaScope} onChange={setHalqaScope} options={halqaOptions} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} placeholder="مثلاً: تسميع القراءة العربية — أيلول" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="button" onClick={loadPreview} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1, width: "100%" }}>
            {pending ? "جارٍ التحميل…" : "معاينة"}
          </button>
        </div>
      </div>

      {previewError && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{previewError}</div>
      )}

      {blocks && blocks.length === 0 && !previewError && (
        <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا طلاب في نطاق الحلقات المختار لهذه الفترة.</div>
      )}

      {blocks && blocks.length > 0 && (
        <form
          action={(fd) => {
            fd.set("from", from);
            fd.set("to", to);
            fd.set("halqaScope", halqaScope);
            fd.set("name", name);
            formAction(fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {state.error && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{state.error}</div>
          )}
          {state.ok && state.reportId && <IssuedNotice reportId={state.reportId} name={name} duplicate={state.duplicate} />}

          {blocks.map((b) => (
            <div key={b.halqaId} style={{ ...cardStyle, overflow: "auto" }}>
              <div style={{ padding: "12px 16px", background: "var(--head-grad)", fontWeight: 700, fontSize: 14.5, display: "flex", gap: 18, flexWrap: "wrap" }}>
                <span>
                  <span style={{ fontWeight: 400, color: "var(--ink-2)" }}>الحلقة: </span>
                  {b.halqaName}
                </span>
                <span>
                  <span style={{ fontWeight: 400, color: "var(--ink-2)" }}>المدرس: </span>
                  {b.teacherName}
                </span>
                <span>
                  <span style={{ fontWeight: 400, color: "var(--ink-2)" }}>الفوج: </span>
                  {b.cohortName}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
                <thead>
                  <tr style={{ background: "var(--card-2-grad)", color: "var(--ink-2)" }}>
                    <th style={{ padding: 8, textAlign: "start" }}>اسم الطالب</th>
                    <th style={{ padding: 8 }}>رقمه</th>
                    <th style={{ padding: 8 }}>من الصفحة</th>
                    <th style={{ padding: 8 }}>إلى الصفحة</th>
                    <th style={{ padding: 8 }}>إجمالي الصفحات</th>
                    <th style={{ padding: 8 }}>الاختبارات</th>
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r) => (
                    <tr key={r.studentId} style={{ borderTop: "1px solid var(--line-2)" }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{r.studentName}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{r.studentNo}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{r.from ?? "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{r.to ?? "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{r.total}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>
                        <ExamStages exams={r.exams} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            الاختبارات بأرقام مراحلها: <b style={{ color: "var(--ok)" }}>الأخضر ناجح</b>، <b style={{ color: "var(--bad)" }}>الأحمر راسب</b>.
          </div>

          <button type="submit" disabled={issuing} style={{ ...primaryButtonStyle, alignSelf: "flex-start", opacity: issuing ? 0.7 : 1 }}>
            {issuing ? "جارٍ الإصدار…" : "إصدار التقرير"}
          </button>
        </form>
      )}
    </div>
  );
}
