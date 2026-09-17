"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { saveExam, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import { JUZ, MIN_PAGE, MAX_PAGE, NOMINATION_PARTS, LOCAL_KINDS, LOCAL_KIND_LABELS, tajweedJuzCap, type ExamTypeId, type LocalKindId } from "@/lib/exam";
import Drawer from "@/components/Drawer";

const initialState: FormState = {};

export type ExamAnswerRow = { topicId: string; text: string; mark: number };

export type ExistingExam = {
  id: string;
  studentId: string;
  date: string;
  localKind: LocalKindId | null;
  juz: number | null;
  pageFrom: number | null;
  pageTo: number | null;
  resultMark: number | null;
  nominationPresent: boolean | null;
  nominationParts: number | null;
  notes: string | null;
  answers: ExamAnswerRow[];
};

export default function ExamFormDrawer({
  type,
  student,
  existing,
  tajweedTopics,
  onClose,
  onSaved,
}: {
  type: ExamTypeId;
  /** null فقط عند إضافة طالب جديد ضمن تحديد المستوى */
  student: { id: string; name: string } | null;
  existing: ExistingExam | null;
  tajweedTopics: { id: string; juz: number; text: string }[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveExam, initialState);

  const [name, setName] = useState("");
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10));
  const [localKind, setLocalKind] = useState<LocalKindId | "">(existing?.localKind ?? "");
  const [juz, setJuz] = useState<number | null>(existing?.juz ?? null);
  const [pageFrom, setPageFrom] = useState(existing?.pageFrom != null ? String(existing.pageFrom) : "");
  const [pageTo, setPageTo] = useState(existing?.pageTo != null ? String(existing.pageTo) : "");
  const [resultMark, setResultMark] = useState(existing?.resultMark != null ? String(existing.resultMark) : "");
  const [nominationPresent, setNominationPresent] = useState<boolean | null>(existing?.nominationPresent ?? null);
  const [nominationParts, setNominationParts] = useState<number | null>(existing?.nominationParts ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [answers, setAnswers] = useState<ExamAnswerRow[]>(existing?.answers ?? []);
  const [topicSearch, setTopicSearch] = useState("");

  useEffect(() => {
    if (state.ok) {
      onSaved?.();
      onClose();
    }
  }, [state.ok, onClose, onSaved]);

  const cappedJuz = juz ? tajweedJuzCap(juz) : 0;
  const topicHits = useMemo(
    () =>
      tajweedTopics
        .filter((t) => t.juz <= cappedJuz)
        .filter((t) => !topicSearch.trim() || t.text.includes(topicSearch.trim()))
        .filter((t) => !answers.some((a) => a.topicId === t.id)),
    [tajweedTopics, cappedJuz, topicSearch, answers]
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
        <input type="hidden" name="localKind" value={localKind} />
        <input type="hidden" name="juz" value={juz ?? ""} />
        <input type="hidden" name="pageFrom" value={pageFrom} />
        <input type="hidden" name="pageTo" value={pageTo} />
        <input type="hidden" name="resultMark" value={resultMark} />
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

        {type === "PLACEMENT" && (
          <div style={{ padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>الجزء الذي يبدأ منه الطالب</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 10 }}>
              لا يُختبَر في جزء معيّن — نتيجة السبر هي فرزه على أحد الأجزاء الثلاثين ليبدأ حفظه منه.
            </div>
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
          <>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع السبر المحلي</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LOCAL_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLocalKind(k)}
                    style={{ ...chipStyle(localKind === k), minHeight: 44, padding: "10px 20px" }}
                  >
                    {LOCAL_KIND_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            {localKind && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>أرقام الصفحات التي سُبر فيها الطالب</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 300 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5 }}>من صفحة</label>
                    <input
                      type="number"
                      min={MIN_PAGE}
                      max={MAX_PAGE}
                      value={pageFrom}
                      onChange={(e) => setPageFrom(e.target.value)}
                      style={{ ...inputStyle(), textAlign: "center", direction: "ltr" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5 }}>إلى صفحة</label>
                    <input
                      type="number"
                      min={MIN_PAGE}
                      max={MAX_PAGE}
                      value={pageTo}
                      onChange={(e) => setPageTo(e.target.value)}
                      style={{ ...inputStyle(), textAlign: "center", direction: "ltr" }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-3)" }}>الصفحات بين {MIN_PAGE} و{MAX_PAGE}.</div>
              </div>
            )}

            {(localKind === "GHAYBAN" || localKind === "AMMA_GHAYBAN") && (
              <div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>العلامة</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={resultMark}
                  onChange={(e) => setResultMark(e.target.value)}
                  placeholder="0 — 100"
                  style={{ width: 120, minHeight: 46, padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 17, textAlign: "center", direction: "ltr" }}
                />
              </div>
            )}

            {localKind === "HADIRAN" && (
              <>
                <div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>الجزء (لعرض أسئلة التجويد المناسبة له)</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {JUZ.map((j) => (
                      <button key={j} type="button" onClick={() => setJuz(j)} style={{ ...chipStyle(juz === j), width: 42, minHeight: 40, padding: 0 }}>
                        {j}
                      </button>
                    ))}
                  </div>
                  {juz != null && juz > 20 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-3)" }}>الأجزاء بعد العشرين تعرض أسئلة الجزء 20 فما دون تراكميًا.</div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>أسئلة هذا السبر</div>
                    {answers.length === 0 && (
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>لم تُضف أسئلة بعد — اختاروا الجزء ثم أسئلة من بنك التجويد أدناه.</div>
                    )}
                    {answers.map((a, idx) => (
                      <div key={a.topicId} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px", borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--card-grad)" }}>
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

                  {juz != null && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 14, borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>بنك أسئلة التجويد</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>أسئلة الجزء {cappedJuz} فما دون — ثابتة من خطة المعلم.</div>
                      <input value={topicSearch} onChange={(e) => setTopicSearch(e.target.value)} placeholder="بحث في الأسئلة" style={inputStyle()} />
                      {topicHits.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>لا سؤال مطابق، أو أُضيفت كل الأسئلة المتاحة بالفعل.</div>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 210, overflow: "auto" }}>
                        {topicHits.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAnswers((prev) => [...prev, { topicId: t.id, text: t.text, mark: 0 }])}
                            style={{ width: "100%", textAlign: "start", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--card-grad)", color: "var(--ink)", fontSize: 13, cursor: "pointer" }}
                          >
                            {t.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {type === "WAQF_NOMINATION" && (
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>العلامة</div>
            <input
              type="number"
              min={0}
              max={100}
              value={resultMark}
              onChange={(e) => setResultMark(e.target.value)}
              placeholder="0 — 100"
              style={{ width: 120, minHeight: 46, padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 17, textAlign: "center", direction: "ltr" }}
            />
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
