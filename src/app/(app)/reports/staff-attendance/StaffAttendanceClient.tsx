"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, primaryButtonStyle, inputStyle, softButtonStyle } from "@/lib/ui";
import { monthNoOf } from "@/lib/daily";
import type { StaffAttendanceRow, StaffAttendanceResult } from "@/lib/staffAttendance";
import { previewStaffAttendance, issueStaffAttendance } from "./actions";

type Initial = { id: string; name: string; from: string; to: string; totalDays: number; rows: StaffAttendanceRow[] } | null;

const notice: React.CSSProperties = { padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 };

function ExcelButton({ reportId }: { reportId: string }) {
  return (
    <a href={`/reports/${reportId}/excel`} style={{ ...softButtonStyle, fontSize: 13, padding: "8px 16px", textDecoration: "none" }}>
      تنزيل Excel
    </a>
  );
}

export default function StaffAttendanceClient({ initial }: { initial: Initial }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [nameTouched, setNameTouched] = useState(!!initial);
  const [result, setResult] = useState<Pick<StaffAttendanceResult, "from" | "to" | "totalDays" | "rows"> & Partial<StaffAttendanceResult> | null>(initial);
  const [error, setError] = useState("");
  const [issuedId, setIssuedId] = useState<string | null>(initial?.id ?? null);
  const [pending, startTransition] = useTransition();

  const fd = () => {
    const f = new FormData();
    if (file) f.set("file", file);
    f.set("name", name);
    return f;
  };

  function preview() {
    setError("");
    setIssuedId(null);
    if (!file) return setError("اختاروا ملف البصّامة (.XLS).");
    startTransition(async () => {
      const res = await previewStaffAttendance(fd());
      if ("error" in res) {
        setResult(null);
        return setError(res.error);
      }
      setResult(res.result);
      if (!nameTouched) setName(`حضور الموظفين — ${monthNoOf(res.result.from)}`);
    });
  }

  function issue() {
    setError("");
    startTransition(async () => {
      const res = await issueStaffAttendance(fd());
      if (res.error) return setError(res.error);
      if (res.reportId) setIssuedId(res.reportId);
    });
  }

  const cell = { padding: 8, textAlign: "center" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/reports" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ← رجوع إلى مركز التقارير
      </Link>

      {!initial && (
        <div style={{ ...cardStyle, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>ملف البصّامة (.XLS)</label>
            <input
              type="file"
              accept=".xls,.XLS,application/vnd.ms-excel"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
                setIssuedId(null);
              }}
              style={{ ...inputStyle(), padding: 8 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              style={inputStyle()}
              placeholder="يُملأ من شهر الملف بعد المعاينة"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={preview} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1, width: "100%" }}>
              {pending && !result ? "جارٍ القراءة…" : "معاينة"}
            </button>
            {result && !issuedId && (
              <button type="button" onClick={issue} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1, width: "100%" }}>
                {pending ? "جارٍ الإصدار…" : "إصدار التقرير"}
              </button>
            )}
          </div>
        </div>
      )}

      {error && <div style={notice}>{error}</div>}

      {issuedId && (
        <div style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
          <span style={{ flex: "1 1 220px" }}>{initial ? `«${initial.name}» — صادر سابقًا.` : "تم إصدار التقرير وحُفظ في السجل."}</span>
          <ExcelButton reportId={issuedId} />
        </div>
      )}

      {result && (
        <>
          <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>
            الفترة: {result.from.replace(/-/g, "/")} — {result.to.replace(/-/g, "/")} · أيام الدوام: {result.totalDays} يومًا · الموظفون: {result.rows.length}
          </div>

          {result.unmatched && result.unmatched.length > 0 && (
            <div style={notice}>
              أرقام في البصّامة لها بصمات ولم تُربط بموظف (أضيفوا «رقم البصمة» للموظف من «إدارة المستخدمين»):{" "}
              {result.unmatched.map((u) => `${u.no}${u.name ? ` (${u.name})` : ""}`).join("، ")}
            </div>
          )}
          {result.inactive && result.inactive.length > 0 && (
            <div style={notice}>
              يوجد بصمات لموظف معلَّق أو محذوف (لا يدخل التقرير):{" "}
              {result.inactive.map((u) => `${u.name} — ${u.status}، رقم البصمة ${u.no}، بصم ${u.days} يومًا`).join("؛ ")}
            </div>
          )}
          {result.missing && result.missing.length > 0 && (
            <div style={notice}>موظفون لهم رقم بصمة غير موجود في الملف: {result.missing.join("، ")}</div>
          )}

          {result.rows.length === 0 ? (
            <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>
              لا موظفين مربوطين بأرقام البصمة — أضيفوا «رقم البصمة» للموظفين من «إدارة المستخدمين».
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 820 }}>
                <thead>
                  <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
                    <th style={{ padding: 8, width: 40 }}>م</th>
                    <th style={{ padding: 8, textAlign: "start" }}>اسم الأستاذ</th>
                    <th style={{ padding: 8 }}>عدد أيام الدوام (الكلي {result.totalDays} يوم)</th>
                    <th style={{ padding: 8 }}>الغياب</th>
                    <th style={{ padding: 8 }}>تفصيل التأخير (بالدقائق)</th>
                    <th style={{ padding: 8 }}>إجمالي التأخير</th>
                    <th style={{ padding: 8 }}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={r.fingerprintNo} style={{ borderTop: "1px solid var(--line-2)" }}>
                      <td style={cell}>{i + 1}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>{r.name}</td>
                      <td style={cell}>{r.present}</td>
                      <td style={{ ...cell, color: r.absent ? "var(--bad)" : undefined, fontWeight: 700 }}>{r.absent}</td>
                      <td style={{ ...cell, direction: "ltr" }}>{r.delays.length ? r.delays.join("+") : 0}</td>
                      <td style={{ ...cell, fontWeight: 700 }}>{r.totalDelay}</td>
                      <td style={cell}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
