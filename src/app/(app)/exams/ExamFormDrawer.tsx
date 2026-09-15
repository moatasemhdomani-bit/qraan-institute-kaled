"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { saveExam, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import { GRADES } from "@/lib/daily";
import { JUZ, LEVELS, NOMINATION_PARTS, EVAL_MODE_LABELS, type EvalModeId, type ExamTypeId } from "@/lib/exam";
import Drawer from "@/components/Drawer";

const initialState: FormState = {};

export type ExamAnswerRow = { questionId?: string; text: string; mark: number };

export type ExistingExam = {
  id: string;
  studentId: string;
  date: string;
  juz: number | null;
  resultMark: number | null;
  resultGrade: string | null;
  resultLevel: string | null;
  nominationPresent: boolean | null;
  nominationParts: number | null;
  notes: string | null;
  answers: ExamAnswerRow[];
};

export default function ExamFormDrawer({
  type,
  student,
  existing,
  mode,
  bank,
  onClose,
  onSaved,
}: {
  type: ExamTypeId;
  /** null فقط عند إضافة طالب جديد ضمن تحديد المستوى */
  student: { id: string; name: string } | null;
  existing: ExistingExam | null;
  mode: EvalModeId;
  bank: { id: string; text: string }[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveExam, initialState);

  const [name, setName] = useState("");
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [juz, setJuz] = useState<number | null>(existing?.juz ?? null);
  const [resultMark, setResultMark] = useState(existing?.resultMark != null ? String(existing.resultMark) : "");
  const [resultGrade, setResultGrade] = useState(existing?.resultGrade ?? "");
  const [resultLevel, setResultLevel] = useState(existing?.resultLevel ?? "");
  const [nominationPresent, setNominationPresent] = useState<boolean | null>(existing?.nominationPresent ?? null);
  const [nominationParts, setNominationParts] = useState<number | null>(existing?.nominationParts ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [answers, setAnswers] = useState<ExamAnswerRow[]>(existing?.answers ?? []);
  const [bankSearch, setBankSearch] = useState("");
  const [newQ, setNewQ] = useState("");

  useEffect(() => {
    if (state.ok) {
      onSaved?.();
      onClose();
    }
  }, [state.ok, onClose, onSaved]);

  const bankHits = useMemo(
    () => bank.filter((b) => !bankSearch.trim() || b.text.includes(bankSearch.trim())),
    [bank, bankSearch]
  );

  const total = useMemo(() => {
    if (answers.length === 0) return 0;
    return Math.round((answers.reduce((sum, a) => sum + (a.mark || 0), 0) / answers.length) * 10);
  }, [answers]);

  const titles: Record<ExamTypeId, string> = {
    LOCAL: "سبر محلي",
    WAQF_NOMINATION: "ترشيح الأوقاف",
    PLACEMENT: "تحديد مستوى",
  };

  const partsOptions = nominationPresent == null ? [] : NOMINATION_PARTS[nominationPresent ? "present" : "absent"];

  return (
    <Drawer
      open
      onClose={onClose}
      title={existing ? `تعديل ${titles[type]}` : titles[type]}
      subtitle={student ? student.name : "طالب جديد — الاسم فقط"}
      footer={
        <>
          <button form="exam-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, flex: 1, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ السبر"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
        </>
      }
    >
      {state.error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error}
        </div>
      )}

      <form id="exam-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="id" value={existing?.id ?? ""} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="studentId" value={student?.id ?? ""} />
        <input type="hidden" name="juz" value={juz ?? ""} />
        <input type="hidden" name="resultMark" value={resultMark} />
        <input type="hidden" name="resultGrade" value={resultGrade} />
        <input type="hidden" name="resultLevel" value={resultLevel} />
        <input type="hidden" name="nominationPresent" value={nominationPresent == null ? "" : nominationPresent ? "1" : "0"} />
        <input type="hidden" name="nominationParts" value={nominationParts ?? ""} />
        <input type="hidden" name="answersJson" value={JSON.stringify(answers)} />

        {type === "PLACEMENT" && !student && (
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>اسم الطالب</label>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم فقط — بقية بياناته تُستكمل عند الفرز"
              style={inputStyle()}
            />
          </div>
        )}

        {type === "WAQF_NOMINATION" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع السبر</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => { setNominationPresent(true); setNominationParts(null); }} style={{ ...chipStyle(nominationPresent === true), minHeight: 44, padding: "10px 22px" }}>
                  حاضرًا
                </button>
                <button type="button" onClick={() => { setNominationPresent(false); setNominationParts(null); }} style={{ ...chipStyle(nominationPresent === false), minHeight: 44, padding: "10px 22px" }}>
                  غيبًا
                </button>
              </div>
              <div style={{ marginTop: 7, fontSize: 12, color: "var(--ink-3)" }}>
                اختيار «حاضرًا» أو «غيبًا» يقفل الاختيار الآخر فورًا.
              </div>
            </div>
            {nominationPresent != null && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>عدد الأجزاء</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {partsOptions.map((n) => (
                    <button key={n} type="button" onClick={() => setNominationParts(n)} style={chipStyle(nominationParts === n)}>
                      {n} أجزاء
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(type === "LOCAL" || type === "PLACEMENT") && (
          <div style={type === "PLACEMENT" ? { padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" } : undefined}>
            <div style={{ fontSize: type === "PLACEMENT" ? 13 : 12.5, fontWeight: type === "PLACEMENT" ? 700 : 400, color: type === "PLACEMENT" ? "var(--ink)" : "var(--ink-2)", marginBottom: type === "PLACEMENT" ? 4 : 8 }}>
              {type === "PLACEMENT" ? "الجزء الذي يبدأ منه الطالب" : "الجزء المختبَر فيه"}
            </div>
            {type === "PLACEMENT" && (
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 10 }}>
                نتيجة تحديد المستوى تشمل هذا الاختيار بالإضافة إلى التقييم أدناه.
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {JUZ.map((j) => (
                <button key={j} type="button" onClick={() => setJuz(j)} style={{ ...chipStyle(juz === j), width: 42, minHeight: 40, padding: 0 }}>
                  {j}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === "LOCAL" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>أسئلة هذا السبر</div>
              {answers.length === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>لم تُضف أسئلة بعد — اختاروها من بنككم أدناه أو اكتبوا سؤالًا جديدًا.</div>
              )}
              {answers.map((a, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--card-grad)" }}>
                  <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>سؤال {idx + 1}</span>
                    <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{a.text}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={a.mark}
                    onChange={(e) => {
                      const mark = Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0));
                      setAnswers((prev) => prev.map((p, i) => (i === idx ? { ...p, mark } : p)));
                    }}
                    placeholder="/10"
                    style={{ width: 64, flex: "none", minHeight: 44, padding: 9, borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 16, textAlign: "center", direction: "ltr" }}
                  />
                  <button
                    type="button"
                    onClick={() => setAnswers((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ flex: "none", width: 34, height: 44, borderRadius: 9, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-3)", fontSize: 16, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div style={{ paddingTop: 9, borderTop: "1px solid var(--line-2)" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>العلامة الكلية المحسوبة: {total} / 100</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>متوسط علامات الأسئلة × 10 — محسوبة تلقائيًا، لا تُختار.</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>بنك أسئلتك</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>بنكك الخاص: {bank.length} سؤالًا — لا يراه مختبِر آخر</div>
              <input value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} placeholder="بحث في البنك" style={inputStyle()} />
              {bankHits.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>لا سؤال مطابق — اكتبوه أدناه وسيُضاف إلى بنككم.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 210, overflow: "auto" }}>
                {bankHits.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setAnswers((prev) => [...prev, { questionId: b.id, text: b.text, mark: 0 }])}
                    style={{ width: "100%", textAlign: "start", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--card-grad)", color: "var(--ink)", fontSize: 13, cursor: "pointer" }}
                  >
                    {b.text}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 9, borderTop: "1px solid var(--line-2)" }}>
                <input
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  placeholder="اكتبوا سؤالًا جديدًا"
                  style={{ flex: 1, minWidth: 170, minHeight: 44, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = newQ.trim();
                    if (!text) return;
                    setAnswers((prev) => [...prev, { text, mark: 0 }]);
                    setNewQ("");
                  }}
                  style={{ minHeight: 44, padding: "10px 18px", borderRadius: 10, border: "1px solid var(--btn-border)", background: "var(--btn-grad)", color: "var(--on-accent)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        )}

        {(type === "PLACEMENT" || type === "WAQF_NOMINATION") && (
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>
              {EVAL_MODE_LABELS[mode]} — الشكل الذي ضبطته الإدارة
            </div>
            {mode === "MARK100" && (
              <input
                type="number"
                min={0}
                max={100}
                value={resultMark}
                onChange={(e) => setResultMark(e.target.value)}
                placeholder="0 — 100"
                style={{ width: 120, minHeight: 46, padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 17, textAlign: "center", direction: "ltr" }}
              />
            )}
            {mode === "GRADE" && (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {GRADES.map((g) => (
                  <button key={g} type="button" onClick={() => setResultGrade(g)} style={{ ...chipStyle(resultGrade === g), minHeight: 42 }}>
                    {g}
                  </button>
                ))}
              </div>
            )}
            {mode === "LEVEL" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LEVELS.map((l) => (
                  <button key={l.id} type="button" onClick={() => setResultLevel(l.id)} style={{ ...chipStyle(resultLevel === l.id), minHeight: 42 }}>
                    {l.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>تاريخ السبر</label>
            <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle(), textAlign: "center", direction: "ltr" }} />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>ملاحظات المختبِر</label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="ما يحتاج المدرّس أن يعرفه"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14, lineHeight: 1.6, resize: "vertical" }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-3)" }}>تصل هذه الملاحظات تلقائيًا إلى مدرّس الطالب.</div>
        </div>
      </form>
    </Drawer>
  );
}
