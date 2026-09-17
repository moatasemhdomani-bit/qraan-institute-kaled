"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import { resultLabel, LOCAL_KIND_LABELS, type ExamTypeId } from "@/lib/exam";
import Drawer from "@/components/Drawer";
import ExamFormDrawer, { type ExistingExam } from "./ExamFormDrawer";

type StudentLite = { id: string; no: number; name: string };
type Halqa = { id: string; name: string; teacherName: string; cohortName: string; students: StudentLite[] };
type ExamRow = ExistingExam & { examinerId: string; examinerName: string; localTotal: number | null };

export default function ExamBrowseClient({
  type,
  readOnly,
  currentUserId,
  isDirector,
  tajweedTopics,
  halaqat,
  examsByStudent,
}: {
  type: ExamTypeId;
  readOnly: boolean;
  currentUserId: string;
  isDirector: boolean;
  tajweedTopics: { id: string; juz: number; text: string }[];
  halaqat: Halqa[];
  examsByStudent: Record<string, ExamRow[]>;
}) {
  const [search, setSearch] = useState("");
  const [openHalqa, setOpenHalqa] = useState<string | null>(halaqat[0]?.id ?? null);
  const [fileStudent, setFileStudent] = useState<StudentLite | null>(null);
  const [formOpen, setFormOpen] = useState<{ existing: ExamRow | null } | null>(null);

  const allStudents = useMemo(() => halaqat.flatMap((h) => h.students.map((s) => ({ ...s, halqaName: h.name }))), [halaqat]);
  const hits = search.trim() ? allStudents.filter((s) => s.name.includes(search.trim()) || String(s.no).includes(search.trim())) : [];

  const activeHalqa = halaqat.find((h) => h.id === openHalqa) ?? null;
  const label = type === "LOCAL" ? "سبر محلي" : "ترشيح الأوقاف";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...cardStyle, padding: "12px 14px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث مباشر عن طالب بالاسم أو الرقم — من خارج الحلقات"
          style={inputStyle()}
        />
        {hits.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {hits.map((s) => (
              <button
                key={s.id}
                onClick={() => setFileStudent(s)}
                style={{ textAlign: "start", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--line-2)", background: "var(--card-2-grad)", color: "var(--ink)", fontSize: 13.5, cursor: "pointer" }}
              >
                {s.name} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>#{s.no} · {s.halqaName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {halaqat.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>لا توجد حلقات بعد.</div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {halaqat.map((h) => (
            <button key={h.id} onClick={() => setOpenHalqa(h.id)} style={chipStyle(h.id === openHalqa)}>
              {h.name}
            </button>
          ))}
        </div>
      )}

      {activeHalqa && (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{activeHalqa.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
              {activeHalqa.teacherName} · {activeHalqa.cohortName} · {activeHalqa.students.length} طالبًا
            </div>
          </div>
          {activeHalqa.students.length === 0 ? (
            <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--ink-2)" }}>لا يوجد طلاب في هذه الحلقة بعد.</div>
          ) : (
            activeHalqa.students.map((s) => {
              const exams = examsByStudent[s.id] ?? [];
              const never = exams.length === 0;
              return (
                <button
                  key={s.id}
                  onClick={() => setFileStudent(s)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    textAlign: "start",
                    padding: "12px 16px",
                    border: 0,
                    borderTop: "1px solid var(--line-2)",
                    cursor: "pointer",
                    background: never ? "linear-gradient(90deg, rgba(224,138,138,0.08), transparent 60%)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", direction: "ltr" }}>#{s.no}</span>
                  <span style={{ marginInlineStart: "auto", fontSize: 12, color: never ? "#E8A0A0" : "var(--ink-2)" }}>
                    {never ? `لم يُسبَر ${label} بعد` : `${exams.length} سبر مسجَّل`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {fileStudent && (
        <Drawer
          open
          onClose={() => setFileStudent(null)}
          title={fileStudent.name}
          subtitle={`#${fileStudent.no}`}
        >
          {!readOnly && (
            <button onClick={() => setFormOpen({ existing: null })} style={{ ...primaryButtonStyle, width: "100%", minHeight: 48 }}>
              {label} جديد
            </button>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(examsByStudent[fileStudent.id] ?? []).length === 0 && (
              <div style={{ padding: "30px 16px", borderRadius: 12, border: "1px dashed var(--line)", background: "var(--card-2-grad)", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>
                لا سجل {label} لهذا الطالب بعد.
              </div>
            )}
            {(examsByStudent[fileStudent.id] ?? []).map((e) => {
              const canEdit = !readOnly && (isDirector || e.examinerId === currentUserId);
              return (
                <div key={e.id} style={{ padding: "13px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {resultLabel({ type, localKind: e.localKind, localTotal: e.localTotal, resultMark: e.resultMark })}
                    </span>
                    {type === "LOCAL" && e.localKind && (
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>
                        {LOCAL_KIND_LABELS[e.localKind]}
                      </span>
                    )}
                    {type === "LOCAL" && e.pageFrom != null && e.pageTo != null && (
                      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                        صفحات {e.pageFrom}-{e.pageTo}
                      </span>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => setFormOpen({ existing: e })}
                        style={{ marginInlineStart: "auto", padding: "7px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                      >
                        تعديل
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ink-2)" }}>
                    <span>المختبِر: {e.examinerName}</span>
                    <span style={{ direction: "ltr" }}>{e.date}</span>
                  </div>
                  {e.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>ملاحظات: {e.notes}</div>}
                </div>
              );
            })}
          </div>
        </Drawer>
      )}

      {formOpen && fileStudent && (
        <ExamFormDrawer
          type={type}
          student={fileStudent}
          existing={formOpen.existing}
          tajweedTopics={tajweedTopics}
          onClose={() => setFormOpen(null)}
        />
      )}
    </div>
  );
}
