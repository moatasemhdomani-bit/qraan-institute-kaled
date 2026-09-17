"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle } from "@/lib/ui";
import { resultLabel, TYPE_LABELS, type ExamTypeId } from "@/lib/exam";
import ExamFormDrawer, { type ExistingExam } from "../exams/ExamFormDrawer";

type Row = ExistingExam & { type: ExamTypeId; studentName: string; examinerId: string; examinerName: string; localTotal: number | null };
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
  currentUserId,
  banksByExaminer,
  blocks,
}: {
  canEdit: boolean;
  isDirector: boolean;
  currentUserId: string;
  banksByExaminer: Record<string, { id: string; text: string }[]>;
  blocks: Block[];
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | ExamTypeId>("all");
  const [examinerFilter, setExaminerFilter] = useState("all");
  const [editing, setEditing] = useState<{ row: Row; halqaName: string } | null>(null);

  const examinerNames = useMemo(() => {
    const names = new Set<string>();
    blocks.forEach((b) => b.rows.forEach((r) => names.add(r.examinerName)));
    return Array.from(names);
  }, [blocks]);

  const filteredBlocks = blocks.map((b) => ({
    ...b,
    rows: b.rows.filter((r) => (typeFilter === "all" || r.type === typeFilter) && (examinerFilter === "all" || r.examinerName === examinerFilter)),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "LOCAL", "WAQF_NOMINATION"] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={chipStyle(typeFilter === t)}>
              {t === "all" ? "كل الأنواع" : TYPE_LABELS[t]}
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

      {filteredBlocks.length === 0 && <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>لا توجد حلقات بعد.</div>}

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
            b.rows.map((r) => (
              <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "11px 16px", borderTop: "1px solid var(--line-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>{TYPE_LABELS[r.type]}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{resultLabel(r)}</span>
                  {canEdit && (isDirector || r.examinerId === currentUserId) && (
                    <button
                      onClick={() => setEditing({ row: r, halqaName: b.name })}
                      style={{ marginInlineStart: "auto", padding: "6px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ink-2)" }}>
                  <span>المختبِر: {r.examinerName}</span>
                  <span style={{ direction: "ltr" }}>{r.date}</span>
                </div>
                {r.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>ملاحظات: {r.notes}</div>}
              </div>
            ))
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
          bank={banksByExaminer[editing.row.examinerId] ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
