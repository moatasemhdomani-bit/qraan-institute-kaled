"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { cardStyle, chipStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import type { OrphanStatus } from "@/lib/reports";
import IssuedNotice from "../IssuedNotice";
import { formatDateAr } from "@/lib/daily";
import { issueOrphansReport, type FormState } from "./actions";

const initialState: FormState = {};

const STATUS_OPTIONS: { id: OrphanStatus; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "active", label: "نشط" },
  { id: "inactive", label: "منقطع" },
];

export default function OrphansReportClient({
  orphans,
  initialName,
  initialStatus,
  frozen,
}: {
  orphans: { name: string; active: boolean }[];
  initialName: string;
  initialStatus: OrphanStatus;
  frozen: { names: string[]; date: string } | null;
}) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<OrphanStatus>(initialStatus);
  // يبقى عرض قائمة يوم الإصدار حتى يغيّر المستخدم الفلتر، فتظهر القائمة الحالية بحسبه
  const [showFrozen, setShowFrozen] = useState(!!frozen);
  const matches = (o: { active: boolean }, s: OrphanStatus) => s === "all" || (s === "active" ? o.active : !o.active);
  const counts = useMemo(
    () => Object.fromEntries(STATUS_OPTIONS.map((opt) => [opt.id, orphans.filter((o) => matches(o, opt.id)).length])) as Record<OrphanStatus, number>,
    [orphans]
  );
  const names = showFrozen && frozen ? frozen.names : orphans.filter((o) => matches(o, status)).map((o) => o.name);
  const reviewDate = showFrozen && frozen ? frozen.date : null;
  const [state, formAction, issuing] = useActionState(issueOrphansReport, initialState);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/reports" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        ← رجوع إلى مركز التقارير
      </Link>

      {reviewDate && (
        <div style={{ padding: "10px 14px", borderRadius: 11, border: "1px solid var(--accent-line)", background: "var(--chip)", fontSize: 13 }}>
          تعرضون القائمة كما صدرت بتاريخ {formatDateAr(reviewDate)} — إصدار تقرير جديد من هنا يأخذ قائمة الأيتام الحالية.
        </div>
      )}

      <form
        action={(fd) => {
          fd.set("name", name);
          fd.set("status", status);
          formAction(fd);
        }}
        style={{ ...cardStyle, padding: 18, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
      >
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>حالة الطالب</div>
          <div style={{ display: "flex", gap: 6 }}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setStatus(opt.id);
                  setShowFrozen(false);
                }}
                style={chipStyle(status === opt.id)}
              >
                {opt.label} ({counts[opt.id]})
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: "1 1 240px" }}>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم التقرير في السجل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} placeholder="مثلاً: الأيتام — أيلول" />
        </div>
        <button type="submit" disabled={issuing} style={{ ...primaryButtonStyle, opacity: issuing ? 0.7 : 1 }}>
          {issuing ? "جارٍ الإصدار…" : "إصدار التقرير"}
        </button>
      </form>

      {state.error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error}
        </div>
      )}
      {state.ok && state.reportId && <IssuedNotice reportId={state.reportId} name={name} duplicate={state.duplicate} />}

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 12 }}>
          عدد الطلاب الأيتام: <b style={{ color: "var(--ink)", fontSize: 16 }}>{names.length}</b>
        </div>
        {names.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)" }}>
            لا طلاب أيتام نشطون — يُحدَّد «يتيم» من نموذج الطالب في شاشة الطلاب.
          </div>
        ) : (
          <ol style={{ columnCount: 2, columnGap: 28, columnRule: "1px solid var(--line-2)", margin: 0, paddingInlineStart: 26, fontSize: 14 }}>
            {names.map((n, i) => (
              <li key={i} style={{ breakInside: "avoid", padding: "6px 4px", borderBottom: "1px dotted var(--line-2)" }}>
                {n}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
