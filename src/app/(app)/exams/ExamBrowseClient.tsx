"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import { resultLabel, passFailLabel, examKindLabel, TYPE_LABELS, type ExamTypeId } from "@/lib/exam";
import { formatDateAr } from "@/lib/daily";
import Drawer from "@/components/Drawer";
import ExamFormDrawer, { type ExistingExam } from "./ExamFormDrawer";

type StudentLite = { id: string; no: number; name: string; halqaName?: string };
type Halqa = { id: string; name: string; teacherName: string; cohortName: string; students: StudentLite[] };
type ExamRow = ExistingExam & { examinerId: string; examinerName: string };

type AwqafRow = { batchDate: string; score: number | null; passed: boolean | null; certLabel: string };

export default function ExamBrowseClient({
  type,
  readOnly,
  currentUserId,
  isDirector,
  halaqat,
  examsByStudent,
  readyStudents,
  awqafByStudent,
  initialHalqaId,
}: {
  type: ExamTypeId;
  readOnly: boolean;
  currentUserId: string;
  isDirector: boolean;
  halaqat: Halqa[];
  examsByStudent: Record<string, ExamRow[]>;
  readyStudents?: { id: string; no: number; name: string; date: string }[];
  awqafByStudent?: Record<string, AwqafRow[]>;
  /** فُتحت الشاشة من «متابعة السبر» على حلقة بعينها */
  initialHalqaId?: string;
}) {
  const [search, setSearch] = useState("");
  // حلقات كل فوج معزولة: يُختار الفوج أولًا، ثم تظهر حلقاته وحدها
  const cohortNames = useMemo(() => [...new Set(halaqat.map((h) => h.cohortName))].sort((a, b) => a.localeCompare(b, "ar")), [halaqat]);
  const initialHalqa = halaqat.find((h) => h.id === initialHalqaId);
  const [openCohort, setOpenCohort] = useState<string | null>(initialHalqa?.cohortName ?? cohortNames[0] ?? null);
  const cohortHalaqat = halaqat.filter((h) => h.cohortName === openCohort);
  const [openHalqa, setOpenHalqa] = useState<string | null>(initialHalqa?.id ?? cohortHalaqat[0]?.id ?? null);
  const [fileStudent, setFileStudent] = useState<StudentLite | null>(null);
  const [formOpen, setFormOpen] = useState<{ existing: ExamRow | null } | null>(null);

  const allStudents = useMemo(() => halaqat.flatMap((h) => h.students.map((s) => ({ ...s, halqaName: h.name }))), [halaqat]);
  const hits = search.trim() ? allStudents.filter((s) => s.name.includes(search.trim()) || String(s.no).includes(search.trim())) : [];

  const activeHalqa = cohortHalaqat.find((h) => h.id === openHalqa) ?? null;
  const label = TYPE_LABELS[type];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {isDirector && (
        <Link href="/exam-monitor" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
          ← رجوع إلى متابعة السبر
        </Link>
      )}
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

      {readyStudents && readyStudents.length > 0 && (
        <div style={{ ...cardStyle, padding: "13px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--ok)" }}>قائمة جاهز للسبر ({readyStudents.length})</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 10 }}>طلاب نجحوا في سبر ترشيح الأوقاف — جاهزون لسبر الأوقاف الفعلي.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {readyStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => setFileStudent({ id: s.id, no: s.no, name: s.name })}
                style={{ textAlign: "start", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(111,191,139,0.35)", background: "rgba(111,191,139,0.08)", color: "var(--ink)", fontSize: 13.5, cursor: "pointer" }}
              >
                <span>{s.name}</span>
                <span style={{ color: "var(--ink-3)", fontSize: 11 }}>#{s.no}</span>
                <span style={{ marginInlineStart: "auto", fontSize: 11.5, color: "var(--ink-3)" }}>{formatDateAr(s.date)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {halaqat.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>لا توجد حلقات بعد.</div>
      ) : (
        <div style={{ ...cardStyle, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>الفوج:</span>
            {cohortNames.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setOpenCohort(c);
                  setOpenHalqa(halaqat.find((h) => h.cohortName === c)?.id ?? null);
                }}
                style={chipStyle(c === openCohort)}
              >
                {c} ({halaqat.filter((h) => h.cohortName === c).length})
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--line-2)" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>الحلقة:</span>
            {cohortHalaqat.map((h) => (
              <button key={h.id} onClick={() => setOpenHalqa(h.id)} style={chipStyle(h.id === openHalqa)}>
                {h.name} <span style={{ fontSize: 11, opacity: 0.75 }}>— {h.teacherName}</span>
              </button>
            ))}
          </div>
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
                  onClick={() => setFileStudent({ ...s, halqaName: activeHalqa.name })}
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
                  <span style={{ marginInlineStart: "auto", fontSize: 12, color: never ? "var(--bad-ink)" : "var(--ink-2)" }}>
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
          subtitle={`#${fileStudent.no}${fileStudent.halqaName ? ` · ${fileStudent.halqaName}` : ""}`}
        >
          {!readOnly && (
            <button onClick={() => setFormOpen({ existing: null })} style={{ ...primaryButtonStyle, width: "100%", minHeight: 48 }}>
              {label} جديد
            </button>
          )}

          {(awqafByStudent?.[fileStudent.id] ?? []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)" }}>سبر الأوقاف الفعلي — مشاهدة فقط</div>
              {awqafByStudent![fileStudent.id].map((a, i) => (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{a.score != null ? `${a.score} / 100` : "بانتظار العلامة"}</span>
                    {a.passed != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: a.passed ? "var(--ok)" : "var(--bad)" }}>{a.passed ? "ناجح" : "إعادة"}</span>
                    )}
                    <span style={{ marginInlineStart: "auto", fontSize: 11.5, color: "var(--ink-3)", direction: "ltr" }}>{a.batchDate}</span>
                  </div>
                  {a.passed && <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{a.certLabel}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {(examsByStudent[fileStudent.id] ?? []).length === 0 && (
              <div style={{ padding: "30px 16px", borderRadius: 12, border: "1px dashed var(--line)", background: "var(--card-2-grad)", textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>
                لا سجل {label} لهذا الطالب بعد.
              </div>
            )}
            {(examsByStudent[fileStudent.id] ?? []).map((e) => {
              const canEdit = !readOnly && (isDirector || e.examinerId === currentUserId);
              const passFail = passFailLabel({
                type,
                localKind: e.localKind,
                resultMark: e.resultMark,
                repeat: e.repeat,
                nominationPresent: e.nominationPresent,
                stage: e.stage,
                grade: e.grade,
              });
              return (
                <div key={e.id} style={{ padding: "13px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {resultLabel({ type, localKind: e.localKind, resultMark: e.resultMark, stage: e.stage, grade: e.grade, repeat: e.repeat })}
                    </span>
                    {passFail && !e.repeat && (
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 700,
                          border: `1px solid ${passFail === "ناجح" ? "rgba(111,191,139,0.5)" : "rgba(224,138,138,0.5)"}`,
                          color: passFail === "ناجح" ? "var(--ok)" : "var(--bad)",
                        }}
                      >
                        {passFail}
                      </span>
                    )}
                    {examKindLabel({ ...e, type }) && (
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "1px solid var(--accent-line)", color: "var(--ink)" }}>
                        {examKindLabel({ ...e, type })}
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
                    <span>{formatDateAr(e.date)}</span>
                  </div>
                  {e.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "pre-line" }}>ملاحظات: {e.notes}</div>}
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
          onClose={() => setFormOpen(null)}
        />
      )}
    </div>
  );
}
