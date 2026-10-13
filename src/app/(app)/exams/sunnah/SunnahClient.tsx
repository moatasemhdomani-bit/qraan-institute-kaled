"use client";

import { useMemo, useState, useTransition } from "react";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import { today, formatDateAr } from "@/lib/daily";
import { TYPE_LABELS } from "@/lib/exam";
import { SUNNAH_SECTIONS, SUNNAH_PASS_MARK, branchOrdinal, sunnahBranchLabel, sunnahProgressWarning, levelExamBlock, sunnahReadyForAwqaf, SUNNAH_PASS_STARS, SUNNAH_REPEAT_STARS, type SunnahSectionId, type SunnahLevelExamType } from "@/lib/sunnah";
import Drawer from "@/components/Drawer";
import DateField from "@/components/DateField";
import NumberField from "@/components/NumberField";
import DeleteExamButton from "../DeleteExamButton";
import { saveSunnahExam } from "./actions";
import SunnahRecitationPanel, { type SunnahRecRow } from "./SunnahRecitationPanel";
import SunnahStarsField from "./SunnahStarsField";

export type SunnahExamRow = {
  id: string;
  studentId: string;
  type: "SUNNAH" | "SUNNAH_NOMINATION" | "SUNNAH_AWQAF" | "SUNNAH_STAGE";
  section: SunnahSectionId;
  branch: number;
  date: string;
  mark: number | null;
  repeat: boolean;
  /** سبر المرحلة: التقدير ورقم المرحلة */
  grade: string | null;
  stageNo: number | null;
  notes: string | null;
  examinerId: string;
  examinerName: string;
};
type StudentRow = { id: string; name: string; no: number; stars: number; halqaName: string | null };

/** نجاح في سبر المستوى (محلي أو أوقاف) */
const passed = (e: SunnahExamRow) => e.type !== "SUNNAH_STAGE" && !e.repeat && e.mark != null && e.mark >= SUNNAH_PASS_MARK;
const stageOk = (e: SunnahExamRow) => e.type === "SUNNAH_STAGE" && !!e.grade && e.grade !== "إعادة";

export default function SunnahClient({
  students,
  exams,
  recitations,
  canRecite,
  weekDates,
  today: todayStr,
  canLocal,
  canAwqaf,
  isDirector,
  canDeleteAny,
  currentUserId,
}: {
  students: StudentRow[];
  exams: SunnahExamRow[];
  recitations: SunnahRecRow[];
  canRecite: boolean;
  /** أيام الدوام في هذا الأسبوع (بلا العطل) */
  weekDates: string[];
  today: string;
  canLocal: boolean;
  canAwqaf: boolean;
  isDirector: boolean;
  canDeleteAny: boolean;
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<{ existing: SunnahExamRow | null; preset?: { type: SunnahLevelExamType; section: SunnahSectionId; branch: number } } | null>(null);
  // قائمة الجاهزين لسبر الأوقاف: الناجحون في سبر ترشيح الأوقاف ولم تُدخل نتيجة أوقافهم بعد
  const ready = useMemo(() => sunnahReadyForAwqaf(exams), [exams]);

  const student = students.find((s) => s.id === studentId) ?? null;
  const studentExams = useMemo(() => exams.filter((e) => e.studentId === studentId), [exams, studentId]);
  const nameOf = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s.name])), [students]);

  const matches = useMemo(() => {
    const q = toWesternDigits(search.trim());
    if (!q) return [];
    return students.filter((s) => s.name.includes(q) || String(s.no) === q).slice(0, 15);
  }, [students, search]);

  const canEditRow = (e: SunnahExamRow) =>
    e.type !== "SUNNAH_STAGE" && (isDirector || e.examinerId === currentUserId) && (e.type === "SUNNAH_AWQAF" ? canAwqaf : canLocal);
  const canDeleteRow = (e: SunnahExamRow) => canDeleteAny || e.examinerId === currentUserId;

  const examLine = (e: SunnahExamRow, showStudent: boolean) => {
    const ok = e.type === "SUNNAH_STAGE" ? stageOk(e) : passed(e);
    return (
      <div key={e.id} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {showStudent && <span style={{ fontSize: 14, fontWeight: 700 }}>{nameOf[e.studentId] ?? ""}</span>}
          <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, border: "1px solid var(--line)", color: "var(--ink-2)" }}>{TYPE_LABELS[e.type]}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {sunnahBranchLabel(e.section, e.branch)}
            {e.type === "SUNNAH_STAGE" ? ` — المرحلة ${e.stageNo}` : ""}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{e.type === "SUNNAH_STAGE" ? e.grade : e.repeat ? "إعادة" : `${e.mark} / 100`}</span>
          {!e.repeat && e.type !== "SUNNAH_STAGE" && (
            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: ok ? "var(--ok)" : "var(--bad)", border: `1px solid color-mix(in srgb, ${ok ? "var(--ok)" : "var(--bad)"} 50%, transparent)` }}>
              {ok ? "ناجح" : "إعادة"}
            </span>
          )}
          {canEditRow(e) && (
            <button
              type="button"
              onClick={() => {
                setStudentId(e.studentId);
                setForm({ existing: e });
              }}
              style={{ ...softButtonStyle, marginInlineStart: "auto", padding: "6px 13px", fontSize: 12 }}
            >
              تعديل
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--ink-2)", alignItems: "center" }}>
          <span>{e.type === "SUNNAH_AWQAF" ? `أدخله: ${e.examinerName}` : `المختبِر: ${e.examinerName}`}</span>
          <span>{formatDateAr(e.date)}</span>
          {canDeleteRow(e) && (
            <span style={{ marginInlineStart: "auto" }}>
              <DeleteExamButton examId={e.id} />
            </span>
          )}
        </div>
        {e.notes && <div style={{ fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "pre-line" }}>ملاحظات: {e.notes}</div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>اختيار الطالب</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اكتبوا اسم الطالب أو رقمه — كل طلاب المعهد" style={inputStyle()} />
        {search.trim() && matches.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب بهذا الاسم أو الرقم.</div>}
        {matches.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setStudentId(s.id);
              setSearch("");
            }}
            style={{ ...chipStyle(s.id === studentId), textAlign: "start", display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px" }}
          >
            <span>
              {s.name} <span style={{ opacity: 0.7, fontSize: 12 }}>#{s.no}</span>
            </span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{s.halqaName ?? "غير مفروز"}</span>
          </button>
        ))}
      </div>

      {student && (
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {student.name} <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500 }}>#{student.no}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{student.halqaName ?? "غير مفروز"}</div>
            </div>
            {(canLocal || canAwqaf) && (
              <button type="button" onClick={() => setForm({ existing: null })} style={{ ...primaryButtonStyle, padding: "10px 18px" }}>
                ＋ سبر جديد
              </button>
            )}
          </div>

          <SunnahRecitationPanel
            key={student.id}
            studentId={student.id}
            recitations={recitations.filter((r) => r.studentId === student.id)}
            exams={studentExams}
            balance={student.stars}
            weekDates={weekDates}
            today={todayStr}
            canRecite={canRecite}
            canDelete={(r) => canDeleteAny || r.examinerId === currentUserId}
          />

          <div style={{ fontSize: 14.5, fontWeight: 700 }}>سبر الفروع</div>
          {/* تقدّم الطالب في كل قسم: الفروع الناجحة، والإعادة، وما لم يُسبر بعد */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {SUNNAH_SECTIONS.map((sec) => {
              // تقدّم المستويات: السبر المحلي للمستوى (أو الأوقاف) — لا المراحل ولا الترشيح
              const mine = studentExams.filter((e) => e.section === sec.id && (e.type === "SUNNAH" || e.type === "SUNNAH_AWQAF"));
              const passedBranches = new Set(mine.filter(passed).map((e) => e.branch));
              const top = Math.max(0, ...passedBranches);
              const next = top < sec.branches.length ? top + 1 : null;
              return (
                <div key={sec.id} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{sec.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>
                    {top ? `آخر فرع ناجح: ${branchOrdinal(top)}` : "لم ينجح في أي فرع بعد"}
                    {next ? ` · التالي: ${branchOrdinal(next)}` : " · أنهى القسم"}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {sec.branches.map((name, i) => {
                      const b = i + 1;
                      const ok = passedBranches.has(b);
                      const tried = mine.some((e) => e.branch === b);
                      const tone = ok ? "var(--ok)" : tried ? "var(--bad)" : "var(--ink-3)";
                      return (
                        <span
                          key={b}
                          title={`${branchOrdinal(b)}: ${name}${ok ? " — ناجح" : tried ? " — إعادة" : ""}`}
                          style={{
                            minWidth: 30,
                            textAlign: "center",
                            padding: "4px 6px",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: tone,
                            border: `1px solid color-mix(in srgb, ${tone} 45%, transparent)`,
                            background: ok ? "color-mix(in srgb, var(--ok) 12%, transparent)" : "transparent",
                          }}
                        >
                          {b}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>الأخضر: ناجح · الأحمر: إعادة · الرمادي: لم يُسبر بعد.</div>

          {studentExams.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا سبر في السنة النبوية لهذا الطالب بعد.</div>
          ) : (
            studentExams.map((e) => examLine(e, false))
          )}
        </div>
      )}

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>الجاهزون لسبر الأوقاف ({ready.length})</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>الناجحون في سبر ترشيح الأوقاف — يخرج الطالب من القائمة عند إدخال نتيجة سبر الأوقاف لمستواه.</div>
        {ready.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طلاب جاهزون الآن.</div>}
        {ready.map((n) => (
          <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{nameOf[n.studentId] ?? ""}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                {sunnahBranchLabel(n.section, n.branch)} · ترشيح {n.mark} / 100 · {formatDateAr(n.date)}
              </div>
            </div>
            {canAwqaf && (
              <button
                type="button"
                onClick={() => {
                  setStudentId(n.studentId);
                  setForm({ existing: null, preset: { type: "SUNNAH_AWQAF", section: n.section, branch: n.branch } });
                }}
                style={{ ...softButtonStyle, padding: "8px 14px" }}
              >
                إدخال نتيجة الأوقاف
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>آخر السبورات</div>
        {exams.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا سبر في السنة النبوية بعد.</div>}
        {exams.slice(0, 40).map((e) => examLine(e, true))}
      </div>

      {form && student && (
        <SunnahExamForm
          student={student}
          existing={form.existing}
          preset={form.preset}
          balance={student.stars}
          history={studentExams}
          canLocal={canLocal}
          canAwqaf={canAwqaf}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

function SunnahExamForm({
  student,
  existing,
  preset,
  balance,
  history,
  canLocal,
  canAwqaf,
  onClose,
}: {
  student: StudentRow;
  existing: SunnahExamRow | null;
  preset?: { type: SunnahLevelExamType; section: SunnahSectionId; branch: number };
  balance: number;
  history: SunnahExamRow[];
  canLocal: boolean;
  canAwqaf: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<SunnahLevelExamType | "">(
    (existing?.type as SunnahLevelExamType | undefined) ?? preset?.type ?? (!canLocal && canAwqaf ? "SUNNAH_AWQAF" : "")
  );
  const [section, setSection] = useState<SunnahSectionId | "">(existing?.section ?? preset?.section ?? "");
  const [branch, setBranch] = useState<number | null>(existing?.branch ?? preset?.branch ?? null);
  const [date, setDate] = useState(existing?.date ?? today());
  const [outcome, setOutcome] = useState<"pass" | "repeat" | "">(existing ? (existing.repeat ? "repeat" : "pass") : "");
  const [mark, setMark] = useState(existing?.mark != null ? String(existing.mark) : "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // نجوم المختبِر (−2 … 10): تلقائيًا نجاح +3 وإعادة −1 ما لم يعدّلها — لا نجوم لسبر الأوقاف ولا عند التعديل
  const [starsEdit, setStarsEdit] = useState<number | null>(null);
  const withStars = !existing && type !== "" && type !== "SUNNAH_AWQAF";
  const stars = starsEdit ?? (outcome === "pass" ? SUNNAH_PASS_STARS : outcome === "repeat" ? SUNNAH_REPEAT_STARS : 0);

  const sec = SUNNAH_SECTIONS.find((s) => s.id === section);
  // تحذير التدرّج فقط — لا يمنع الحفظ (السبر نفسه عند التعديل لا يُحتسب)
  const warning =
    section && branch
      ? sunnahProgressWarning(
          history.filter((h) => h.id !== existing?.id).map((h) => ({ section: h.section, branch: h.branch })),
          section,
          branch
        )
      : null;
  // شرط سبر المستوى (يمنع الحفظ): المحلي بعد كل المراحل، والأوقاف بعد النجاح في المحلي
  const block =
    section && branch && type
      ? levelExamBlock(
          type,
          section,
          branch,
          history
            .filter((h) => h.id !== existing?.id)
            .map((h) => ({ type: h.type, section: h.section, branch: h.branch, mark: h.mark, repeat: h.repeat, grade: h.grade, stageNo: h.stageNo }))
        )
      : null;

  function submit() {
    setError("");
    if (block) return setError(block);
    startTransition(async () => {
      const res = await saveSunnahExam({
        id: existing?.id ?? null,
        studentId: student.id,
        type: type as SunnahLevelExamType,
        section: section as SunnahSectionId,
        branch: branch ?? 0,
        date,
        outcome,
        mark: mark ? parseInt(mark, 10) : null,
        notes,
        stars: withStars ? stars : 0,
      });
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={existing ? "تعديل سبر السنة النبوية" : "سبر السنة النبوية"}
      subtitle={`${student.name} #${student.no}`}
      footer={
        <>
          <button type="button" onClick={submit} disabled={pending || !!block} style={{ ...primaryButtonStyle, flex: 1, opacity: pending || block ? 0.6 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ السبر"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}
          >
            إلغاء
          </button>
        </>
      }
    >
      {canLocal || existing ? (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع السبر</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canLocal && (
              <>
                <button type="button" onClick={() => setType("SUNNAH")} style={{ ...chipStyle(type === "SUNNAH"), minHeight: 44, padding: "10px 20px" }}>
                  سبر المستوى المحلي
                </button>
                <button type="button" onClick={() => setType("SUNNAH_NOMINATION")} style={{ ...chipStyle(type === "SUNNAH_NOMINATION"), minHeight: 44, padding: "10px 20px" }}>
                  سبر ترشيح الأوقاف
                </button>
              </>
            )}
            {canAwqaf && (
              <button type="button" onClick={() => setType("SUNNAH_AWQAF")} style={{ ...chipStyle(type === "SUNNAH_AWQAF"), minHeight: 44, padding: "10px 20px" }}>
                سبر الأوقاف
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>سبر الأوقاف — لمن نجح في سبر ترشيح الأوقاف للمستوى</div>
      )}

      <div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>القسم</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUNNAH_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSection(s.id);
                setBranch(null);
              }}
              style={{ ...chipStyle(section === s.id), minHeight: 44, padding: "10px 18px" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {sec && (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>الفرع</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sec.branches.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setBranch(i + 1)}
                style={{ ...chipStyle(branch === i + 1), textAlign: "start", padding: "9px 12px", display: "flex", gap: 8 }}
              >
                <b style={{ minWidth: 92 }}>{branchOrdinal(i + 1)}</b>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {block && (
        <div style={{ padding: "11px 13px", borderRadius: 11, border: "1px solid color-mix(in srgb, var(--bad) 50%, transparent)", background: "color-mix(in srgb, var(--bad) 10%, transparent)", fontSize: 13 }}>{block}</div>
      )}
      {!block && warning && (
        <div style={{ padding: "11px 13px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{warning}</div>
      )}

      <DateField label="تاريخ السبر" value={date} onChange={setDate} />

      <div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نتيجة السبر</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setOutcome("pass")} style={{ ...chipStyle(outcome === "pass"), minHeight: 44, padding: "10px 24px" }}>
            ناجح
          </button>
          <button
            type="button"
            onClick={() => {
              setOutcome("repeat");
              setMark("");
            }}
            style={{ ...chipStyle(outcome === "repeat"), minHeight: 44, padding: "10px 24px" }}
          >
            إعادة
          </button>
        </div>
      </div>
      {outcome === "pass" && (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>العلامة</div>
          <NumberField value={mark} onChange={(e) => setMark(e.target.value)} placeholder={`${SUNNAH_PASS_MARK} — 100`} style={{ width: 120, minHeight: 46, padding: 11, fontSize: 17 }} />
          <div style={{ marginTop: 7, fontSize: 12, color: "var(--ink-3)" }}>علامات النجاح من {SUNNAH_PASS_MARK} إلى 100.</div>
        </div>
      )}

      {withStars && outcome && (
        <SunnahStarsField
          value={stars}
          onChange={setStarsEdit}
          balance={balance}
          notices={[outcome === "repeat" && "سيتم سحب نجمة من رصيد الطالب — عدِّلها إن أردت."]}
        />
      )}

      <div>
        <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>ملاحظات (اختياري)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14, lineHeight: 1.6, resize: "vertical" }}
        />
      </div>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>
      )}
    </Drawer>
  );
}
