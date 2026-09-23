"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import { today } from "@/lib/daily";
import { previewTeachersReport, issueTeachersReport, type FormState, type PreviewRow } from "./actions";

const initialState: FormState = {};

function passFailCell(pass: number, fail: number) {
  return (
    <span>
      <b style={{ color: "#6FBF8B" }}>{pass}</b> / <b style={{ color: "#E08A8A" }}>{fail}</b>
    </span>
  );
}

export default function TeachersReportClient() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [name, setName] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();

  const [state, formAction, issuing] = useActionState(issueTeachersReport, initialState);

  function loadPreview() {
    setPreviewError("");
    startTransition(async () => {
      const res = await previewTeachersReport(from, to);
      if ("error" in res) {
        setPreviewError(res.error);
        setRows(null);
        return;
      }
      setRows(res.rows);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/reports" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ← رجوع إلى مركز التقارير
      </Link>

      <div style={{ ...cardStyle, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <DateField label="تاريخ البداية" value={from} onChange={setFrom} />
        <DateField label="تاريخ النهاية" value={to} onChange={setTo} />
        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} placeholder="مثلاً: التقرير الشهري — أيلول" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="button" onClick={loadPreview} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1, width: "100%" }}>
            {pending ? "جارٍ التحميل…" : "معاينة"}
          </button>
        </div>
      </div>

      {previewError && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {previewError}
        </div>
      )}

      {rows && rows.length === 0 && !previewError && (
        <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا مدرّسون بحلقات فعلية بعد.</div>
      )}

      {rows && rows.length > 0 && (
        <form
          action={(fd) => {
            fd.set("from", from);
            fd.set("to", to);
            fd.set("name", name);
            fd.set("notesJson", JSON.stringify(notes));
            formAction(fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {state.error && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
              {state.error}
            </div>
          )}
          {state.ok && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)", fontSize: 13 }}>
              {state.duplicate ? "يوجد تقرير سابق بنفس المعطيات — فُتح بدل إصدار تقرير جديد" : "تم إصدار التقرير وحُفظ في السجل"} —{" "}
              <a href={`/reports/${state.reportId}/pdf`} target="_blank" rel="noreferrer" style={{ color: "#e8c65a" }}>فتح PDF</a>
            </div>
          )}

          <div style={{ ...cardStyle, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 900 }}>
              <thead>
                <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
                  <th style={{ padding: 8, textAlign: "start" }}>المدرس</th>
                  <th style={{ padding: 8 }}>الحلقة</th>
                  <th style={{ padding: 8 }}>صفحات جديد لكل الطلاب</th>
                  <th style={{ padding: 8 }}>صفحات ماضٍ لكل الطلاب</th>
                  <th style={{ padding: 8 }}>اختبارات محلية</th>
                  <th style={{ padding: 8 }}>اختبارات الأوقاف</th>
                  <th style={{ padding: 8 }}>عدد الطلاب</th>
                  <th style={{ padding: 8, minWidth: 200 }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.teacherId} style={{ borderTop: "1px solid var(--line-2)" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.teacherName}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.halqaNames}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.newPages}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.pastPages}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.locPass, r.locFail)}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.awqPass, r.awqFail)}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.count}</td>
                    <td style={{ padding: 6 }}>
                      <input
                        value={notes[r.teacherId] ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.teacherId]: e.target.value }))}
                        style={inputStyle()}
                      />
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
