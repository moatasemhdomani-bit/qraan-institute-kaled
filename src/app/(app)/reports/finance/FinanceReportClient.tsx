"use client";

import { PdfButtons } from "../IssuedNotice";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import { today, monthStart, currentMonthNo } from "@/lib/daily";
import { formatMoney, CURRENCIES, CURRENCY_LABEL, type Currency } from "@/lib/finance";
import type { ReviewInputs, FinanceReport } from "@/lib/reports";
import IssuedNotice from "../IssuedNotice";
import { previewFinanceReport, issueFinanceReport, type FormState } from "./actions";

const initialState: FormState = {};

export default function FinanceReportClient({ initial }: { initial: ReviewInputs | null }) {
  const [from, setFrom] = useState(initial?.from ?? monthStart());
  const [to, setTo] = useState(initial?.to ?? today());
  const [name, setName] = useState(initial?.name ?? `المالية — ${currentMonthNo()}`);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, formAction, issuing] = useActionState(issueFinanceReport, initialState);

  function loadPreview() {
    setPreviewError("");
    startTransition(async () => {
      const res = await previewFinanceReport(from, to);
      if ("error" in res) {
        setPreviewError(res.error);
        setReport(null);
        return;
      }
      setReport(res.report);
    });
  }

  // «مراجعة التقرير» من السجل: يُعاد إعداده فورًا بنفس الفترة
  const reviewed = useRef(false);
  useEffect(() => {
    if (initial && !reviewed.current) {
      reviewed.current = true;
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cell = { padding: 8, textAlign: "center" as const };
  const stat = (label: string, value: number, c: Currency, color?: string) => (
    <div style={{ ...cardStyle, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{formatMoney(value, c)}</div>
    </div>
  );
  const used = report ? CURRENCIES.filter((c) => report.rows.some((r) => r.currency === c)) : [];

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
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} placeholder="مثلاً: المالية — 11/2026" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button type="button" onClick={loadPreview} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1, width: "100%" }}>
            {pending ? "جارٍ التحميل…" : "معاينة"}
          </button>
          {report && (
            <>
              {initial?.id ? (
                <PdfButtons reportId={initial.id} name={initial.name ?? ""} />
              ) : (
                <button type="submit" form="report-issue-form" disabled={issuing || pending} style={{ ...primaryButtonStyle, opacity: issuing || pending ? 0.7 : 1, width: "100%" }}>
                  {issuing ? "جارٍ الإصدار…" : "إصدار التقرير"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {previewError && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{previewError}</div>
      )}

      {report && (
        <form
          id="report-issue-form"
          action={(fd) => {
            fd.set("from", from);
            fd.set("to", to);
            fd.set("name", name);
            formAction(fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {state.error && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{state.error}</div>
          )}
          {state.ok && state.reportId && <IssuedNotice reportId={state.reportId} name={name} duplicate={state.duplicate} />}

          {CURRENCIES.map((c) => (
            <div key={c} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)" }}>{CURRENCY_LABEL[c]}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                {stat("رصيد أول الفترة", report.totals[c].opening, c)}
                {stat("إجمالي الإيداع", report.totals[c].deposits, c, "var(--ok)")}
                {stat("إجمالي السحب", report.totals[c].withdrawals, c, "var(--bad)")}
                {stat("الصندوق آخر الفترة", report.totals[c].closing, c)}
              </div>
            </div>
          ))}

          {report.rows.length === 0 ? (
            <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا عمليات في هذه الفترة.</div>
          ) : (
            <div style={{ ...cardStyle, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 }}>
                <thead>
                  <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
                    <th style={{ padding: 8, width: 40 }}>م</th>
                    <th style={{ padding: 8 }}>التاريخ</th>
                    <th style={{ padding: 8 }}>العملية</th>
                    <th style={{ padding: 8, textAlign: "start" }}>السبب</th>
                    <th style={{ padding: 8 }}>الفاعل</th>
                    <th style={{ padding: 8 }}>إيداع</th>
                    <th style={{ padding: 8 }}>سحب</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--line-2)" }}>
                      <td style={cell}>{i + 1}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{r.date.replace(/-/g, "/")}</td>
                      <td style={{ ...cell, fontWeight: 700, color: r.kind === "DEPOSIT" ? "var(--ok)" : "var(--bad)" }}>{r.kind === "DEPOSIT" ? "إيداع" : "سحب"}</td>
                      <td style={{ padding: 8 }}>{r.reason}</td>
                      <td style={cell}>{r.byName}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{r.kind === "DEPOSIT" ? formatMoney(r.amount, r.currency) : ""}</td>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{r.kind === "WITHDRAW" ? formatMoney(r.amount, r.currency) : ""}</td>
                    </tr>
                  ))}
                  {used.map((c) => (
                    <tr key={c} style={{ borderTop: "2px solid var(--line)", background: "var(--chip)", fontWeight: 700 }}>
                      <td style={{ padding: 8 }} colSpan={5}>
                        المجموع — {CURRENCY_LABEL[c]}
                      </td>
                      <td style={{ ...cell, color: "var(--ok)", whiteSpace: "nowrap" }}>{formatMoney(report.totals[c].deposits, c)}</td>
                      <td style={{ ...cell, color: "var(--bad)", whiteSpace: "nowrap" }}>{formatMoney(report.totals[c].withdrawals, c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
