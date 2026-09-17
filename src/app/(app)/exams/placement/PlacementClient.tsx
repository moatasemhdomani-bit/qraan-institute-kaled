"use client";

import { useState } from "react";
import { cardStyle, primaryButtonStyle } from "@/lib/ui";
import { resultLabel } from "@/lib/exam";
import ExamFormDrawer, { type ExistingExam } from "../ExamFormDrawer";

type Row = ExistingExam & { studentName: string; examinerId: string; examinerName: string };

export default function PlacementClient({
  currentUserId,
  isDirector,
  rows,
}: {
  currentUserId: string;
  isDirector: boolean;
  rows: Row[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button onClick={() => setAdding(true)} style={{ ...primaryButtonStyle, width: "100%", minHeight: 52, fontSize: 15 }}>
        سبر تحديد مستوى
      </button>

      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)", fontSize: 14, fontWeight: 700 }}>
          نتائج أُرسلت إلى الإدارة
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: "34px 18px", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>
            لم تُجروا سبر تحديد مستوى بعد.
          </div>
        ) : (
          rows.map((r) => {
            const canEdit = isDirector || r.examinerId === currentUserId;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "flex-start", flexDirection: "column", gap: 6, padding: "13px 16px", borderTop: "1px solid var(--line-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{r.studentName}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{resultLabel({ type: "PLACEMENT", juz: r.juz })}</span>
                  {canEdit && (
                    <button
                      onClick={() => setEditing(r)}
                      style={{ marginInlineStart: "auto", padding: "7px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
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
            );
          })
        )}
        <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--ink-3)", borderTop: "1px solid var(--line-2)" }}>
          هذه النتائج لا تظهر لأحد غير الإدارة حتى يُفرَز الطالب على حلقة — عندها فقط يُنشأ حساب ولي الأمر.
        </div>
      </div>

      {adding && <ExamFormDrawer type="PLACEMENT" student={null} existing={null} tajweedTopics={[]} onClose={() => setAdding(false)} />}
      {editing && (
        <ExamFormDrawer
          type="PLACEMENT"
          student={{ id: editing.studentId, name: editing.studentName }}
          existing={editing}
          tajweedTopics={[]}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
