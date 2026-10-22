"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, chipStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import { today } from "@/lib/daily";
import type { ReviewInputs } from "@/lib/reports";
import type { LogBlock } from "@/lib/recitationLog";
import RecitationLogTable from "@/components/RecitationLogTable";
import IssuedNotice, { PdfButtons } from "../IssuedNotice";
import { previewRecitationLog, issueRecitationLog, type FormState } from "./actions";

const initialState: FormState = {};

export default function RecitationLogReportClient({
  halaqat,
  initial,
}: {
  halaqat: { id: string; name: string; cohortName: string }[];
  initial: ReviewInputs | null;
}) {
  const [from, setFrom] = useState(initial?.from ?? `${today().slice(0, 7)}-01`);
  const [to, setTo] = useState(initial?.to ?? today());
  // الحلقات المختارة — «all» = كل الحلقات
  const [picked, setPicked] = useState<string[] | "all">(initial?.halqaIds ?? "all");
  const [name, setName] = useState(initial?.name ?? "");
  const [blocks, setBlocks] = useState<LogBlock[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();
  const [state, formAction, issuing] = useActionState(issueRecitationLog, initialState);

  const isAll = picked === "all";
  const toggle = (id: string) =>
    setPicked((prev) => {
      const cur = prev === "all" ? [] : prev;
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });

  function loadPreview() {
    setPreviewError("");
    startTransition(async () => {
      const res = await previewRecitationLog(from, to, picked);
      if ("error" in res) {
        setPreviewError(res.error);
        setBlocks(null);
        return;
      }
      setBlocks(res.blocks);
    });
  }

  // «مراجعة التقرير» من السجل: يُعاد إعداده فورًا بنفس الفترة والحلقات
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

      <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <DateField label="تاريخ البداية" value={from} onChange={setFrom} />
          <DateField label="تاريخ النهاية" value={to} onChange={setTo} />
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} placeholder="مثلاً: سجل التسميع — تشرين الأول" />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>
            الحلقات {!isAll && picked.length > 0 && `— المختارة: ${picked.length}`}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setPicked("all")} style={{ ...chipStyle(isAll), padding: "8px 14px" }}>
              {isAll ? "✓ " : ""}كل الحلقات
            </button>
            {halaqat.map((h) => {
              const on = !isAll && picked.includes(h.id);
              return (
                <button key={h.id} type="button" onClick={() => toggle(h.id)} style={{ ...chipStyle(on), padding: "8px 12px" }}>
                  {on ? "✓ " : ""}
                  {h.name} <span style={{ opacity: 0.7, fontSize: 11.5 }}>· {h.cohortName}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={loadPreview} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ التحميل…" : "معاينة"}
          </button>
          {blocks && blocks.length > 0 && (
            <>
              {initial?.id ? (
                <PdfButtons reportId={initial.id} name={initial.name} />
              ) : (
                <button type="submit" form="report-issue-form" disabled={issuing || pending} style={{ ...primaryButtonStyle, opacity: issuing || pending ? 0.7 : 1 }}>
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

      {blocks && blocks.length === 0 && !previewError && (
        <div style={{ ...cardStyle, padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا حلقات في النطاق المختار.</div>
      )}

      {blocks && blocks.length > 0 && (
        <form
          id="report-issue-form"
          action={(fd) => {
            fd.set("from", from);
            fd.set("to", to);
            fd.set("halqaIds", picked === "all" ? "all" : JSON.stringify(picked));
            fd.set("name", name);
            formAction(fd);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {state.error && (
            <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{state.error}</div>
          )}
          {state.ok && state.reportId && <IssuedNotice reportId={state.reportId} name={name} duplicate={state.duplicate} />}

          {blocks.map((b) => (
            <section key={b.halqaId} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, display: "flex", gap: 18, flexWrap: "wrap" }}>
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
              <RecitationLogTable arabic={b.arabic} data={b} />
            </section>
          ))}
        </form>
      )}
    </div>
  );
}
