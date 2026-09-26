"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cardStyle, chipStyle, inputStyle } from "@/lib/ui";
import { resultLabel, passFailLabel, TYPE_LABELS, LOCAL_KIND_LABELS, type ExamTypeId } from "@/lib/exam";
import { awqafPassed, certCycleLabel } from "@/lib/awqaf";
import ExamFormDrawer, { type ExistingExam } from "../exams/ExamFormDrawer";

type RowType = ExamTypeId | "AWQAF_ACTUAL";
type Row = ExistingExam & {
  type: RowType;
  studentName: string;
  examinerId: string;
  examinerName: string;
  batchId: string | null;
  certArrived: boolean;
  certArchived: boolean;
  certDelivered: boolean;
};
type Block = {
  id: string;
  name: string;
  meta: string;
  rows: Row[];
  neverLabel: string;
};

export default function ExamMonitorClient({
  canEdit,
  isDirector,
  canManageAwqaf,
  currentUserId,
  tajweedTopics,
  blocks,
}: {
  canEdit: boolean;
  isDirector: boolean;
  canManageAwqaf: boolean;
  currentUserId: string;
  tajweedTopics: { id: string; juz: number; text: string }[];
  blocks: Block[];
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | RowType>("all");
  const [examinerFilter, setExaminerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ row: Row & { type: ExamTypeId }; halqaName: string } | null>(null);

  const examinerNames = useMemo(() => {
    const names = new Set<string>();
    blocks.forEach((b) => b.rows.forEach((r) => names.add(r.examinerName)));
    return Array.from(names);
  }, [blocks]);

  const q = search.trim();
  const filteredBlocks = blocks
    .map((b) => ({
      ...b,
      rows: b.rows.filter(
        (r) =>
          (typeFilter === "all" || r.type === typeFilter) &&
          (examinerFilter === "all" || r.examinerName === examinerFilter) &&
          (!q || r.studentName.includes(q))
      ),
    }))
    // عند البحث باسم طالب تُخفى الحلقات التي لا نتيجة فيها
    .filter((b) => !q || b.rows.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن طالب باسمه"
          style={inputStyle()}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "LOCAL", "WAQF_NOMINATION", "AWQAF_ACTUAL"] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={chipStyle(typeFilter === t)}>
              {t === "all" ? "كل الأنواع" : t === "AWQAF_ACTUAL" ? "سبر الأوقاف الفعلي" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setExaminerFilter("all")} style={chipStyle(examinerFilter === "all")}>
            كل المختبِرين
          </button>
          {examinerNames.map((n) => (
            <button key={n} onClick={() => setExaminerFilter(n)} style={chipStyle(examinerFilter === n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {filteredBlocks.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          {q ? `لا سبر مسجّل لطالب باسم «${q}».` : "لا توجد حلقات بعد."}
        </div>
      )}

      {filteredBlocks.map((b) => (
        <div key={b.id} style={{ ...cardStyle, overflow: "hidden", border: b.neverLabel ? "1px solid rgba(224,138,138,0.5)" : undefined }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{b.meta}</div>
            {b.neverLabel && <div style={{ fontSize: 12, color: "#F0B4B4", marginTop: 6 }}>{b.neverLabel}</div>}
          </div>
          {b.rows.length === 0 ? (
            <div style={{ padding: "16px", fontSize: 13, color: "var(--ink-3)" }}>لا نتائج مطابقة للفلاتر الحالية.</div>
          ) : (
            b.rows.map((r) => {
              const isAwqafActual = r.type === "AWQAF_ACTUAL";
              const examRow = r as Row & { type: ExamTypeId };
              const passFail = isAwqafActual
                ? awqafPassed(r.resultMark, r.nominationPresent ?? false) === null
                  ? null
                  : awqafPassed(r.resultMark, r.nominationPresent ?? false)
                    ? "ناجح"
                    : "راسب"
                : passFailLabel(examRow);
              const resultText = isAwqafActual
                ? r.resultMark != null ? `${r.resultMark} / 100` : "بانتظار العلامة"
                : resultLabel(examRow);
              return (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{r.studentName}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>
                    {isAwqafActual ? "سبر الأوقاف الفعلي" : TYPE_LABELS[r.type as ExamTypeId]}
                    {r.localKind ? ` — ${LOCAL_KIND_LABELS[r.localKind]}` : ""}
                    {isAwqafActual ? ` — ${r.nominationPresent ? "حاضرًا" : "غيبًا"}` : ""}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{resultText}</span>
                  {passFail && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        border: `1px solid ${passFail === "ناجح" ? "rgba(111,191,139,0.5)" : "rgba(224,138,138,0.5)"}`,
                        color: passFail === "ناجح" ? "#6FBF8B" : "#E08A8A",
                      }}
                    >
                      {passFail}
                    </span>
                  )}
                  {isAwqafActual && passFail === "ناجح" && (
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{certCycleLabel(r)}</span>
                  )}
                  {r.pages != null && r.pages.length > 0 && (
                    <span style={{ fontSize: 12, color: "var(--ink-2)", direction: "ltr" }}>
                      صفحات: {r.pages.join("، ")}
                    </span>
                  )}
                  {!isAwqafActual && canEdit && (isDirector || r.examinerId === currentUserId) && (
                    <button
                      onClick={() => setEditing({ row: r as Row & { type: ExamTypeId }, halqaName: b.name })}
                      style={{ marginInlineStart: "auto", padding: "6px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                  )}
                  {isAwqafActual && canManageAwqaf && r.batchId && (
                    <Link
                      href={`/exams/awqaf-batches/${r.batchId}`}
                      style={{ marginInlineStart: "auto", padding: "6px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, textDecoration: "none" }}
                    >
                      فتح الدفعة
                    </Link>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ink-2)" }}>
                  {!isAwqafActual && <span>المختبِر: {r.examinerName}</span>}
                  <span style={{ direction: "ltr" }}>{r.date}</span>
                </div>
                {r.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>ملاحظات: {r.notes}</div>}
              </div>
              );
            })
          )}
        </div>
      ))}

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {canEdit
          ? "بصفتكم مدير المعهد يمكنكم إضافة سبر أو تعديل أي سبر أجراه أي مختبِر — بنفس شاشة السبر التي يستعملها هو."
          : "عرض فقط — كما في متابعة الحضور والتسميع."}
      </div>

      {editing && (
        <ExamFormDrawer
          type={editing.row.type}
          student={{ id: editing.row.studentId, name: editing.row.studentName }}
          existing={editing.row}
          tajweedTopics={tajweedTopics}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
