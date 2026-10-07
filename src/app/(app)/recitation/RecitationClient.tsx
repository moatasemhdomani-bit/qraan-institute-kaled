"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveStudentRecitation, saveStudentNote } from "./actions";
import { GRADES, REPEAT_GRADE } from "@/lib/daily";
import { pageRange, surahsFor, type TrackId, type RecitationMode } from "@/lib/track";
import { validateEntry, validateSurahEntry } from "@/lib/recitation";
import { chipStyle } from "@/lib/ui";
import NumberField from "@/components/NumberField";
import Select from "@/components/Select";
import { PAST_KINDS, JUZ_COUNT, pastItemLabel, pastJuzTotal, formatJuz, type PastKind } from "@/lib/pastRecitation";

/** بند ماضٍ في النموذج: النوع، ورقم الجزء نصًّا (فارغ = لم يُختر بعد)، وتقديره. */
type PastRow = { kind: PastKind; juz: string; grade: string };

type Entry = {
  none: boolean;
  noNew: boolean;
  noPast: boolean;
  nf: string;
  nt: string;
  gradeNew: string;
  /** صفحة واحدة (من = إلى): «تمت الصفحة» — بدونه لا تُحسب مسمَّعة */
  pageDone: boolean;
  /** الماضي لطلاب القرآن: حزب 1 / حزب 2 / جزء من الأجزاء 1–30، لكل بند تقديره */
  past: PastRow[];
  /** تسميع بالسور: أسماء السور مفصولة بـ | (نص لا مصفوفة كي تبقى المقارنة بالحفظ بسيطة) */
  surahs: string;
};

type Student = {
  id: string;
  no: number;
  name: string;
  /** طريقة تسميعه: قرآن (جديد وماضٍ)، قراءة عربية (جديد فقط)، أو سور (عمَّ غيباً / بينة للناس) */
  mode: RecitationMode;
  saved: Entry | null;
  lastNewTo: number | null;
  /** «ملاحظة الطالب» الخاصة بالمدرّس — null = لا تظهر (المدير) */
  note: string | null;
};

/**
 * «تسميع جديد — من» يبدأ من الصفحة التالية لأعلى صفحة جديدة سُمِّعت من قبل (التسميع المقدَّر «إعادة» لا يُحرّكه)
 * — قابل للتعديل، ويجوز تسميع صفحة سابقة.
 * «ماضي — من» يُترك فارغًا عمدًا: الماضي مراجعة، لا يُشترط أن يكمل من حيث انتهى آخر مرة، ويجوز
 * الرجوع لأي صفحة سابقة.
 */
const blank = (s: Student, track: TrackId): Entry => ({
  none: false,
  noNew: false,
  // القراءة العربية والسور: جديد فقط بلا ماضٍ، ويبدأ طالب القراءة العربية الجديد من أول صفحة في الكتاب
  noPast: s.mode !== "quran",
  nf:
    s.mode === "surah"
      ? ""
      : s.lastNewTo
        ? String(Math.min(s.lastNewTo + 1, pageRange(track).max))
        : s.mode === "quran"
          ? ""
          : String(pageRange(track).min),
  nt: "",
  gradeNew: "",
  pageDone: false,
  past: [],
  surahs: "",
});

/** صفحة واحدة: «من» = «إلى» */
const singlePage = (e: Entry) => e.nf.trim() !== "" && pageNumOf(e.nf) === pageNumOf(e.nt);
const pageNumOf = (v: string) => (v.trim() ? Number(v.trim()) : NaN);

const surahList = (e: Entry) => (e.surahs ? e.surahs.split("|") : []);

const span = (a: string, b: string, track: TrackId) => {
  const x = parseInt(a, 10);
  const y = parseInt(b, 10);
  const { min, max } = pageRange(track);
  return x >= min && y <= max && y >= x ? y - x + 1 : 0;
};

const pageNum = (v: string): number | null => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const sameEntry = (a: Entry | undefined, b: Entry) =>
  !!a && (Object.keys(b) as (keyof Entry)[]).every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));

const JUZ_OPTIONS = Array.from({ length: JUZ_COUNT }, (_, i) => ({ value: String(i + 1), label: `الجزء ${i + 1}` }));
const GRADE_OPTIONS = GRADES.map((g) => ({ value: g, label: g }));
const pastRowsToItems = (rows: PastRow[]) =>
  rows.map((p) => ({ kind: p.kind, juz: p.juz ? parseInt(p.juz, 10) : null, grade: p.grade }));

/** سبب رفض سطر الطالب (نفس قواعد الخادم تمامًا)، أو null إن كان جاهزًا للحفظ. */
function entryProblem(s: Student, e: Entry, track: TrackId): string | null {
  if (s.mode === "surah") return validateSurahEntry({ none: e.none, surahs: surahList(e), gradeNew: e.gradeNew || null }, track);
  return validateEntry(
    {
      studentId: s.id,
      none: e.none,
      noNew: e.noNew,
      noPast: e.noPast,
      newFrom: pageNum(e.nf),
      newTo: pageNum(e.nt),
      gradeNew: e.gradeNew || null,
      pastItems: pastRowsToItems(e.past),
    },
    track
  );
}

function summaryOf(e: Entry, mode: RecitationMode): string {
  if (e.none) return "لم يسمّع اليوم";
  if (mode === "surah") return `سور: ${surahList(e).join("، ")} (${e.gradeNew})`;
  const newPart = e.noNew ? "لم يسمّع جديدًا" : `تسميع جديد ${e.nf}←${e.nt} (${e.gradeNew})`;
  if (mode === "arabic") return `من الصفحة ${e.nf} إلى ${e.nt} (${e.gradeNew})`;
  const pastPart = e.noPast
    ? "لم يقرأ ماضي"
    : `ماضي: ${e.past.map((p) => `${pastItemLabel({ kind: p.kind, juz: parseInt(p.juz, 10) })} (${p.grade})`).join("، ")}`;
  return `${newPart} · ${pastPart}`;
}

/**
 * كل طالب يُحفظ وحده بزر «حفظ» في بطاقته. لا يُفحص الإدخال ولا تظهر رسالة خطأ إلا عند الضغط على الزر؛
 * والرسالة تبقى كما هي حتى الضغطة التالية.
 */
export default function RecitationClient({
  halqaId,
  track = "QURAN",
  date,
  students,
}: {
  halqaId: string;
  track?: TrackId;
  date: string;
  students: Student[];
  alreadyUploaded: boolean;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.saved ?? blank(s, track)]))
  );
  // آخر نسخة محفوظة فعلًا على الخادم لكل طالب
  const [savedEntries, setSavedEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.filter((s) => s.saved).map((s) => [s.id, s.saved as Entry]))
  );
  const [open, setOpen] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [errorTick, setErrorTick] = useState(0);
  // «ملاحظة الطالب»: تُحفظ وحدها عند مغادرة الخانة، مستقلة عن حفظ التسميع
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.filter((s) => s.note !== null).map((s) => [s.id, s.note as string]))
  );
  const [savedNotes, setSavedNotes] = useState<Record<string, string>>(notes);
  const [noteStatus, setNoteStatus] = useState<Record<string, string>>({});

  async function persistNote(id: string) {
    const text = (notes[id] ?? "").trim();
    if (text === (savedNotes[id] ?? "").trim()) return;
    setNoteStatus((p) => ({ ...p, [id]: "جارٍ حفظ الملاحظة…" }));
    const res = await saveStudentNote(id, text);
    if (res.error) {
      setNoteStatus((p) => ({ ...p, [id]: `لم تُحفظ الملاحظة — ${res.error}` }));
      return;
    }
    setSavedNotes((p) => ({ ...p, [id]: text }));
    setNoteStatus((p) => ({ ...p, [id]: "حُفظت الملاحظة ✓" }));
  }
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorTick) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errorTick]);

  const set = (id: string, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const isSaved = (id: string) => sameEntry(savedEntries[id], entries[id]);
  const savedCount = students.filter((s) => isSaved(s.id)).length;

  function fail(id: string, message: string) {
    setErrors((prev) => ({ ...prev, [id]: message }));
    setErrorTick((t) => t + 1);
  }

  function save(s: Student, idx: number) {
    const e = entries[s.id];
    setJustSaved(null);
    const problem = entryProblem(s, e, track);
    if (problem) {
      fail(s.id, problem);
      return;
    }
    setSavingId(s.id);
    startTransition(async () => {
      const res = await saveStudentRecitation({ halqaId, date, studentId: s.id, ...e, past: pastRowsToItems(e.past) });
      setSavingId(null);
      if (res.error) {
        fail(s.id, res.error);
        return;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
      setSavedEntries((prev) => ({ ...prev, [s.id]: e }));
      setJustSaved(s.id);
      // الانتقال إلى أول طالب بعده لم يُحفظ بعد
      const nextStudent = students.slice(idx + 1).find((x) => !sameEntry(savedEntries[x.id], entries[x.id]));
      setOpen(nextStudent?.id ?? null);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--line)",
          background: "var(--card-grad)",
          overflow: "hidden",
          boxShadow: "var(--glow)",
        }}
      >
        {students.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-2)", fontSize: 14 }}>
            لا يوجد طلاب في هذه الحلقة بعد.
          </div>
        )}

        {students.map((s, idx) => {
          const e = entries[s.id];
          const withPast = s.mode === "quran";
          const isSurah = s.mode === "surah";
          const saved = isSaved(s.id);
          const isOpen = open === s.id;
          const savedEntry = savedEntries[s.id];
          const summary = saved
            ? summaryOf(e, s.mode)
            : savedEntry
              ? "عُدّل ولم يُحفظ التعديل بعد"
              : "لم يُحفظ بعد";

          return (
            <div key={s.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "start",
                  padding: "12px 14px",
                  border: 0,
                  borderTop: "1px solid var(--line-2)",
                  cursor: "pointer",
                  background: isOpen
                    ? "var(--chip)"
                    : saved
                      ? "transparent"
                      : "linear-gradient(90deg, rgba(224,138,138,0.10), transparent 60%)",
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 99, flex: "none", background: saved ? "var(--ok)" : "var(--bad)" }} />
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                  <span style={{ fontSize: 12.5, color: saved ? "var(--ink-2)" : "var(--bad-ink)" }}>
                    {summary}
                    {justSaved === s.id && saved ? " — تم الحفظ ✓" : ""}
                  </span>
                  {s.note !== null && (savedNotes[s.id] ?? "").trim() && (
                    <span style={{ fontSize: 12, color: "var(--gold)" }}>ملاحظة: {savedNotes[s.id]}</span>
                  )}
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    background: "var(--card-2-grad)",
                    borderTop: "1px solid var(--line-2)",
                  }}
                >
                  {s.note !== null && (
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>ملاحظة الطالب: (اختيارية — تظهر لك وحدك)</label>
                      <textarea
                        value={notes[s.id] ?? ""}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          setNotes((p) => ({ ...p, [s.id]: v }));
                          setNoteStatus((p) => ({ ...p, [s.id]: "" }));
                        }}
                        onBlur={() => persistNote(s.id)}
                        rows={2}
                        maxLength={1000}
                        placeholder="الملاحظة التي تعمل على تصحيحها للطالب — لتتذكّر على ماذا تركّز معه"
                        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 13.5, lineHeight: 1.6, fontFamily: "inherit", resize: "vertical" }}
                      />
                      {noteStatus[s.id] && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{noteStatus[s.id]}</div>}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => set(s.id, { none: !e.none, noNew: false, noPast: false })}
                      style={{ ...chipStyle(e.none), minHeight: 40 }}
                    >
                      لم يسمّع اليوم
                    </button>
                    {withPast && (
                    <button
                      type="button"
                      disabled={e.none}
                      onClick={() => set(s.id, { noNew: !e.noNew })}
                      style={{ ...chipStyle(e.noNew), minHeight: 40, opacity: e.none ? 0.45 : 1 }}
                    >
                      لم يسمّع جديدًا اليوم
                    </button>
                    )}
                    {withPast && (
                    <button
                      type="button"
                      disabled={e.none}
                      onClick={() => set(s.id, { noPast: !e.noPast })}
                      style={{ ...chipStyle(e.noPast), minHeight: 40, opacity: e.none ? 0.45 : 1 }}
                    >
                      لم يقرأ ماضي اليوم
                    </button>
                    )}
                  </div>

                  {!e.none && isSurah && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>
                        {s.mode === "surah" && track === "ARABIC" ? "بينة للناس — السور المسمَّعة" : "السور المسمَّعة"} (سورة أو أكثر)
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {surahsFor(track).map((name) => {
                          const on = surahList(e).includes(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                const next = on ? surahList(e).filter((x) => x !== name) : [...surahList(e), name];
                                // بترتيب السور في المصحف
                                set(s.id, { surahs: surahsFor(track).filter((x) => next.includes(x)).join("|") });
                              }}
                              style={chipStyle(on)}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!e.none && (
                    <>
                      {!isSurah && (
                      <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {(
                          [
                            { label: withPast ? "تسميع جديد — من صفحة" : "من الصفحة", key: "nf", off: e.noNew },
                            { label: withPast ? "تسميع جديد — إلى صفحة" : "إلى الصفحة", key: "nt", off: e.noNew },
                          ] as const
                        ).map((f) => (
                          <div key={f.key}>
                            <label style={{ display: "block", fontSize: 11.5, color: "var(--ink-2)", marginBottom: 5 }}>
                              {f.label}
                            </label>
                            <NumberField
                              disabled={f.off}
                              dim={f.off}
                              value={e[f.key]}
                              onChange={(ev) => set(s.id, { [f.key]: ev.target.value } as Partial<Entry>)}
                              style={{ opacity: f.off ? 0.5 : 1 }}
                            />
                          </div>
                        ))}
                      </div>
                      {!e.noNew && singlePage(e) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => set(s.id, { pageDone: !e.pageDone })}
                            style={{ ...chipStyle(e.pageDone), minHeight: 42, padding: "9px 18px" }}
                          >
                            {e.pageDone ? "✓ تمت الصفحة" : "تمت الصفحة"}
                          </button>
                          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                            {e.pageDone ? "تُحسب الصفحة مسمَّعة." : "صفحة واحدة — لا تُحسب مسمَّعة ولا يتقدّم العدّاد إلا عند الضغط على «تمت الصفحة»."}
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        {withPast ? "تسميع جديد «من» مُلئ تلقائيًا بعد آخر صفحة سُمِّعت جديدًا، ويجوز تعديله لتسميع صفحة سابقة." : "«من الصفحة» مُلئ تلقائيًا بعد آخر صفحة سُمِّعت، ويجوز تعديله لتسميع صفحة سابقة."}
                        {" التقدير «إعادة» لا تُحسب صفحاته ولا يتقدّم به العدّاد."}
                        {` الصفحات بين ${pageRange(track).min} و${pageRange(track).max}.`}
                      </div>
                      </>
                      )}

                      {!e.noNew && (
                        <div>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>{withPast ? "تقدير التسميع الجديد" : "تقدير التسميع"}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {GRADES.map((g) => (
                              <button key={g} type="button" onClick={() => set(s.id, { gradeNew: g })} style={chipStyle(e.gradeNew === g)}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {withPast && !e.noPast && (
                        <div>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>
                            الماضي — اختاروا الجزء وتقديره تحت كل نوع (يمكن أكثر من نوع، وتكرار النوع لأجزاء مختلفة)
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                            {PAST_KINDS.map((k) => {
                              const usedJuz = e.past.filter((p) => p.kind === k.id).map((p) => p.juz);
                              return (
                                <div key={k.id} style={{ display: "flex", flexDirection: "column", gap: 7, padding: 8, borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-grad)", minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, textAlign: "center" }}>{k.label}</div>
                                  {e.past.map((p, i) =>
                                    p.kind !== k.id ? null : (
                                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 6, borderTop: "1px solid var(--line-2)" }}>
                                        {/* لا يتكرّر البند نفسه: الأجزاء المختارة لهذا النوع تُحذف من قوائمه الأخرى */}
                                        <Select
                                          value={p.juz}
                                          placeholder="الجزء"
                                          options={JUZ_OPTIONS.filter((o) => o.value === p.juz || !usedJuz.includes(o.value))}
                                          onChange={(v) => set(s.id, { past: e.past.map((x, j) => (j === i ? { ...x, juz: v } : x)) })}
                                        />
                                        <Select
                                          value={p.grade}
                                          placeholder="التقدير"
                                          options={GRADE_OPTIONS}
                                          onChange={(v) => set(s.id, { past: e.past.map((x, j) => (j === i ? { ...x, grade: v } : x)) })}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => set(s.id, { past: e.past.filter((_, j) => j !== i) })}
                                          style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(224,138,138,0.45)", background: "transparent", color: "var(--bad-ink)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}
                                        >
                                          حذف
                                        </button>
                                      </div>
                                    )
                                  )}
                                  <button
                                    type="button"
                                    disabled={usedJuz.length >= JUZ_COUNT}
                                    onClick={() => set(s.id, { past: [...e.past, { kind: k.id, juz: "", grade: "" }] })}
                                    style={{ marginTop: "auto", padding: "7px 6px", borderRadius: 9, border: "1px dashed var(--accent-line)", background: "var(--chip)", color: "var(--ink)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    + {k.label}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {errors[s.id] && (
                    <div
                      ref={errorRef}
                      role="alert"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--notice-line)",
                        background: "var(--notice-soft)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      لم يتم الحفظ — {errors[s.id]}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                        {isSurah
                          ? `عدد السور: ${e.none ? 0 : surahList(e).length}`
                          : `${withPast ? "صفحات الجديد" : "إجمالي صفحات اليوم"}: ${e.none || e.noNew || e.gradeNew === REPEAT_GRADE || (singlePage(e) && !e.pageDone) ? 0 : span(e.nf, e.nt, track)}`}
                      </span>
                      {withPast && (
                        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                          الماضي: {e.none || e.noPast ? 0 : formatJuz(pastJuzTotal(e.past))} جزء
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={savingId !== null}
                      onClick={() => save(s, idx)}
                      style={{
                        marginInlineStart: "auto",
                        minHeight: 44,
                        padding: "10px 22px",
                        borderRadius: 10,
                        border: "1px solid var(--btn-border)",
                        background: "var(--btn-grad)",
                        color: "var(--on-accent)",
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        boxShadow: "var(--btn-shadow)",
                        opacity: savingId === s.id ? 0.7 : 1,
                      }}
                    >
                      {savingId === s.id ? "جارٍ الحفظ…" : "حفظ"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {students.length > 0 && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            fontSize: 13.5,
            border: savedCount === students.length ? "1px solid rgba(111,191,139,0.5)" : "1px dashed var(--line)",
            background:
              savedCount === students.length
                ? "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))"
                : "var(--btn-soft)",
            color: savedCount === students.length ? "var(--ink)" : "var(--ink-2)",
          }}
        >
          {savedCount === students.length
            ? "تسميع هذا اليوم محفوظ لكل الطلاب — ظهر لأولياء الأمور."
            : `حُفظ تسميع ${savedCount} من ${students.length} طالبًا — افتح بطاقة كل طالب واضغط «حفظ».`}
        </div>
      )}
    </div>
  );
}
