"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import Select from "@/components/Select";
import type { AwqafMarksRow, ReviewInputs } from "@/lib/reports";
import IssuedNotice from "../IssuedNotice";
import { previewAwqafMarks, issueAwqafMarksReport, type FormState } from "./actions";

const initialState: FormState = {};
const th: React.CSSProperties = { padding: 8 };
const td: React.CSSProperties = { padding: 8, textAlign: "center" };

export default function AwqafMarksClient({
  batches,
  initial,
}: {
  batches: { id: string; label: string }[];
  initial: ReviewInputs | null;
}) {
  const [batchId, setBatchId] = useState(initial?.batchId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [rows, setRows] = useState<AwqafMarksRow[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, formAction, issuing] = useActionState(issueAwqafMarksReport, initialState);

  function loadPreview() {
    setPreviewError("");
    startTransition(async () => {
      const res = await previewAwqafMarks(batchId);
      if ("error" in res) {
        setPreviewError(res.error);
        setRows(null);
        return;
      }
      setRows(res.rows);
    });
  }

  // «مراجعة التقرير» من السجل: يُعاد إعداده فورًا لنفس الدفعة
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

      {batches.length === 0 ? (
        <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>
          لا توجد دفعة سبر أوقاف سُجّلت علاماتها بعد.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>دفعة سبر الأوقاف</label>
            <Select
              value={batchId}
              onChange={(v) => {
                setBatchId(v);
                setRows(null);
              }}
              options={batches.map((b) => ({ value: b.id, label: b.label }))}
              placeholder="اختر دفعة"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} placeholder="مثلاً: علامات دفعة أيلول" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={loadPreview}
              disabled={pending || !batchId}
              style={{ ...primaryButtonStyle, opacity: pending || !batchId ? 0.7 : 1, width: "100%" }}
            >
              {pending ? "جارٍ التحميل…" : "معاينة"}
            </button>
          </div>
        </div>
      )}

      {previewError && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {previewError}
        </div>
      )}

      {rows && (
        <form
          action={(fd) => {
            fd.set("batchId", batchId);
            fd.set("name", name);
            formAction(fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {state.error && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
              {state.error}
            </div>
          )}
          {state.ok && state.reportId && <IssuedNotice reportId={state.reportId} name={name} duplicate={state.duplicate} />}

          <div style={{ ...cardStyle, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 820 }}>
              <thead>
                <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
                  <th style={{ ...th, textAlign: "start" }}>اسم الطالب الكامل</th>
                  <th style={th}>رقمه</th>
                  <th style={th}>نوع السبر</th>
                  <th style={th}>المدرس</th>
                  <th style={th}>الحلقة</th>
                  <th style={th}>الفوج</th>
                  <th style={th}>العلامة</th>
                  <th style={th}>النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} style={{ borderTop: "1px solid var(--line-2)" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.fullName}</td>
                    <td style={td}>{r.studentNo}</td>
                    <td style={td}>{r.examLabel}</td>
                    <td style={td}>{r.teacherName}</td>
                    <td style={td}>{r.halqaName}</td>
                    <td style={td}>{r.cohortName}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{r.score ?? "—"}</td>
                    <td style={{ ...td, fontWeight: 700, color: r.passed == null ? "var(--ink-3)" : r.passed ? "#6FBF8B" : "#E08A8A" }}>
                      {r.passed == null ? "—" : r.passed ? "ناجح" : "راسب"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="submit" disabled={issuing} style={{ ...primaryButtonStyle, alignSelf: "flex-start", opacity: issuing ? 0.7 : 1 }}>
            {issuing ? "جارٍ الإصدار…" : "إصدار التقرير"}
          </button>
        </form>
      )}
    </div>
  );
}
