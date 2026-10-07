"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { cardStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import { today } from "@/lib/daily";
import type { ReviewInputs } from "@/lib/reports";
import IssuedNotice from "../IssuedNotice";
import StudentReportPreview from "./StudentReportPreview";
import { searchStudentsForReport, previewStudentReport, issueStudentReport, type FormState, type StudentPreview } from "./actions";

const initialState: FormState = {};

type PickedStudent = { id: string; no: string; name: string };

export default function StudentReportClient({
  preselected,
  initial,
}: {
  preselected: PickedStudent | null;
  initial: ReviewInputs | null;
}) {
  const [picked, setPicked] = useState<PickedStudent | null>(preselected);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<PickedStudent[]>([]);
  const [from, setFrom] = useState(initial?.from ?? today());
  const [to, setTo] = useState(initial?.to ?? today());
  const [name, setName] = useState(initial?.name ?? (preselected ? `تقرير ${preselected.name}` : ""));
  const [preview, setPreview] = useState<StudentPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [pending, startTransition] = useTransition();

  const [state, formAction, issuing] = useActionState(issueStudentReport, initialState);

  function onSearch(v: string) {
    setSearch(v);
    if (!v.trim()) { setHits([]); return; }
    startTransition(async () => {
      const res = await searchStudentsForReport(v);
      setHits(res);
    });
  }

  function pick(s: PickedStudent) {
    setPicked(s);
    setSearch("");
    setHits([]);
    setName(`تقرير ${s.name}`);
    setPreview(null);
  }

  function loadPreview() {
    if (!picked) return;
    setPreviewError("");
    startTransition(async () => {
      const res = await previewStudentReport(picked.id, from, to);
      if ("error" in res) {
        setPreviewError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res.preview);
    });
  }

  // «مراجعة التقرير» من السجل: يُعاد إعداد تقرير الطالب فورًا بنفس الفترة السابقة
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

      <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>الطالب</label>
          {picked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{picked.name}</span>
              <span style={{ color: "var(--ink-3)", fontSize: 12 }}>#{picked.no}</span>
              <button type="button" onClick={() => { setPicked(null); setPreview(null); }} style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 10px", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
                تغيير
              </button>
            </div>
          ) : (
            <>
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="بحث بالاسم أو الرقم" style={inputStyle()} />
              {hits.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {hits.map((s) => (
                    <button key={s.id} type="button" onClick={() => pick(s)} style={{ textAlign: "start", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--card-2-grad)", color: "var(--ink)", fontSize: 13.5, cursor: "pointer" }}>
                      {s.name} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>#{s.no}</span>
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && hits.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-3)" }}>لا طالب بهذا الاسم أو الرقم.</div>
              )}
            </>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <DateField label="تاريخ البداية" value={from} onChange={setFrom} />
          <DateField label="تاريخ النهاية" value={to} onChange={setTo} />
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button type="button" onClick={loadPreview} disabled={pending || !picked} style={{ ...primaryButtonStyle, opacity: pending || !picked ? 0.7 : 1, width: "100%" }}>
              {pending ? "جارٍ التحميل…" : "معاينة"}
            </button>
            {preview && (
              <button type="submit" form="report-issue-form" disabled={issuing || pending} style={{ ...primaryButtonStyle, opacity: issuing || pending ? 0.7 : 1, width: "100%" }}>
                {issuing ? "جارٍ الإصدار…" : "إصدار التقرير"}
              </button>
            )}
          </div>
        </div>
      </div>

      {previewError && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {previewError}
        </div>
      )}

      {preview && (
        <form
          id="report-issue-form"
          action={(fd) => {
            fd.set("studentId", preview.studentId);
            fd.set("from", from);
            fd.set("to", to);
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

          <StudentReportPreview preview={preview} />
        </form>
      )}
    </div>
  );
}
