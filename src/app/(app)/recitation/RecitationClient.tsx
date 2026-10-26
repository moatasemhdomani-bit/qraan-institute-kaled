"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveStudentRecitation, saveStudentNote } from "./actions";
import { GRADES, REPEAT_GRADE } from "@/lib/daily";
import { pageRange, surahsFor, type TrackId, type RecitationMode } from "@/lib/track";
import { validateEntry, validateSurahEntry, surahsLabel } from "@/lib/recitation";
import { chipStyle } from "@/lib/ui";
import NumberField from "@/components/NumberField";
import { PAST_KINDS, JUZ_COUNT, pastItemLabel, pastJuzTotal, formatJuz, validatePastItems, type PastKind } from "@/lib/pastRecitation";

/** بند ماضٍ في النموذج: النوع، ورقم الجزء نصًّا (فارغ = لم يُختر بعد)، وتقديره. */
type PastRow = { kind: PastKind; juz: string; grade: string };

type Entry = {
  none: boolean;
  noNew: boolean;
  /** «تحضير للسبر» مكان الجديد (طلاب القرآن) — معه noNew، بلا صفحات ولا تقدير */
  examPrep: boolean;
  noPast: boolean;
  nf: string;
  nt: string;
  gradeNew: string;
  /** صفحة واحدة (من = إلى): «أنهى الصفحة» — بدونه لا تُحسب مسمَّعة */
  pageDone: boolean;
  /** الماضي لطلاب القرآن: حزب 1 / حزب 2 / جزء من الأجزاء 1–30، لكل بند تقديره */
  past: PastRow[];
  /** تسميع بالسور: أسماء السور مفصولة بـ | (نص لا مصفوفة كي تبقى المقارنة بالحفظ بسيطة) */
  surahs: string;
  /** السور التي أنهاها («أنهى السورة») مفصولة بـ | — وحدها تُحسب مسمَّعة */
  surahsDone: string;
};

type Student = {
  id: string;
  no: number;
  name: string;
  /** طريقة تسميعه: قرآن (جديد وماضٍ)، قراءة عربية (جديد فقط)، أو سور (عمَّ غيباً / بينة للناس) */
  mode: RecitationMode;
  saved: Entry | null;
  lastNewTo: number | null;
  /** التسميع بالسور: السور التي أنهاها قبل هذا اليوم (تظهر بلون كحلي باهت) */
  surahsBefore: string[];
  /** «ملاحظة الطالب» الخاصة بالمدرّس — null = لا تظهر (المدير) */
  note: string | null;
  /** «كل الحلقات»: حلقة الطالب ومستواها، واسمها عنوانًا قبل طلابها */
  halqaId?: string;
  track?: TrackId;
  group?: string;
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
  examPrep: false,
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
  surahsDone: "",
});

/** صفحة واحدة: «من» = «إلى» */
const singlePage = (e: Entry) => e.nf.trim() !== "" && pageNumOf(e.nf) === pageNumOf(e.nt);
const pageNumOf = (v: string) => (v.trim() ? Number(v.trim()) : NaN);

const surahList = (e: Entry) => (e.surahs ? e.surahs.split("|") : []);
const doneList = (e: Entry) => (e.surahsDone ? e.surahsDone.split("|") : []);

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
      examPrep: e.examPrep,
      noPast: e.noPast,
      newFrom: pageNum(e.nf),
      newTo: pageNum(e.nt),
      gradeNew: e.gradeNew || null,
      pastItems: pastRowsToItems(e.past),
    },
    track
  );
}

/** فحص جزء واحد قبل «حفظ جديد» أو «حفظ الماضي» (نفس قواعد الخادم) */
function partProblem(e: Entry, part: "new" | "past", track: TrackId): string | null {
  if (part === "new") {
    if (e.noNew) return null;
    return validateEntry(
      { studentId: "", none: false, noNew: false, noPast: true, newFrom: pageNum(e.nf), newTo: pageNum(e.nt), gradeNew: e.gradeNew || null, pastItems: [] },
      track
    );
  }
  if (e.noPast) return null;
  return validatePastItems(pastRowsToItems(e.past));
}

function summaryOf(e: Entry, mode: RecitationMode): string {
  if (e.none) return "لم يسمّع اليوم";
  if (mode === "surah") return `سور: ${surahsLabel(surahList(e), doneList(e))} (${e.gradeNew})`;
  const newPart = e.examPrep ? "تحضير للسبر" : e.noNew ? "لم يسمّع جديدًا" : !e.nf ? "الجديد لم يُحفظ بعد" : `تسميع جديد ${e.nf}←${e.nt} (${e.gradeNew})`;
  if (mode === "arabic") return `من الصفحة ${e.nf} إلى ${e.nt} (${e.gradeNew})`;
  const pastPart = e.noPast
    ? "لم يقرأ ماضي"
    : e.past.length === 0
      ? "الماضي لم يُحفظ بعد"
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
  // حلقة الطالب ومستواها (في «كل الحلقات» لكل طالب حلقته)
  const sh = (s: Student) => s.halqaId ?? halqaId;
  const tr = (s: Student): TrackId => s.track ?? track;
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.saved ?? blank(s, tr(s))]))
  );
  // آخر نسخة محفوظة فعلًا على الخادم لكل طالب
  const [savedEntries, setSavedEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.filter((s) => s.saved).map((s) => [s.id, s.saved as Entry]))
  );
  const [open, setOpen] = useState<string | null>(null);
  // الماضي: النوع المختار (حزب 1 / حزب 2 / جزء) لكل طالب قبل الضغط على رقم الجزء
  const [pastKind, setPastKind] = useState<Record<string, PastKind>>({});
  // نافذة «تسميع الماضي»: الطالب المفتوحة له
  const [pastOpen, setPastOpen] = useState<string | null>(null);
  // «+ ماضٍ آخر»: إظهار اختيار النوع والرقم من جديد
  const [pastAdding, setPastAdding] = useState<Record<string, boolean>>({});
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
  /** طالب القرآن لا يُحسب محفوظًا حتى يُحفظ الجديد والماضي معًا (أو «لم يسمّع اليوم») */
  const bothParts = (st: Student) => {
    const se = savedEntries[st.id];
    if (st.mode !== "quran" || !se || se.none) return true;
    return (se.noNew || !!se.nf) && (se.noPast || se.past.length > 0);
  };
  const isComplete = (st: Student) => isSaved(st.id) && bothParts(st);
  const savedCount = students.filter((st) => isComplete(st)).length;
  // ما حُفظ تسميعه (الأخضر) في الأعلى، وما لم يُسمَّع بعد في الأسفل — مع بقاء طلاب كل حلقة معًا في «كل الحلقات»
  const groupOrder = [...new Set(students.map((st) => st.group ?? ""))];
  const ordered = students
    .map((st, i) => ({ st, i }))
    .sort(
      (x, y) =>
        groupOrder.indexOf(x.st.group ?? "") - groupOrder.indexOf(y.st.group ?? "") ||
        Number(isComplete(x.st)) * -1 - Number(isComplete(y.st)) * -1 ||
        x.i - y.i
    )
    .map((x) => x.st);

  function fail(id: string, message: string) {
    setErrors((prev) => ({ ...prev, [id]: message }));
    setErrorTick((t) => t + 1);
  }

  /**
   * part: لطلاب القرآن «حفظ جديد» يحفظ الجديد وحده و«حفظ الماضي» الماضي وحده — والجزء الآخر يبقى كما حُفظ.
   * بلا part (القراءة العربية والسور، و«لم يسمّع اليوم»): يُحفظ السطر كاملًا.
   */
  function save(s: Student, idx: number, part?: "new" | "past", onDone?: () => void) {
    const e = entries[s.id];
    setJustSaved(null);
    const problem = part ? partProblem(e, part, tr(s)) : entryProblem(s, e, tr(s));
    if (problem) {
      fail(s.id, problem);
      return;
    }
    setSavingId(`${s.id}|${part ?? ""}`);
    startTransition(async () => {
      const res = await saveStudentRecitation({ halqaId: sh(s), date, studentId: s.id, ...e, past: pastRowsToItems(e.past), part });
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
      setSavedEntries((prev) => {
        if (!part) return { ...prev, [s.id]: e };
        // حُفظ جزء واحد: الجزء الآخر يبقى كما كان محفوظًا (أو فارغًا)
        const base: Entry = prev[s.id] && !prev[s.id].none ? prev[s.id] : { ...e, noNew: false, examPrep: false, nf: "", nt: "", gradeNew: "", pageDone: false, noPast: false, past: [] };
        const merged: Entry =
          part === "new"
            ? { ...base, none: false, noNew: e.noNew, examPrep: e.examPrep, nf: e.nf, nt: e.nt, gradeNew: e.gradeNew, pageDone: e.pageDone }
            : { ...base, none: false, noPast: e.noPast, past: e.past };
        return { ...prev, [s.id]: merged };
      });
      setJustSaved(s.id);
      onDone?.();
      // «حفظ جديد» و«حفظ الماضي»: تبقى بطاقة الطالب مفتوحة لإكمال الجزء الآخر — و«حفظ» (السطر كاملًا) يغلقها
      if (!part) setOpen(null);
    });
  }

  /** واجهة الماضي: النوع ← رقم الجزء من 1 إلى 30 ← التقدير */
  const pastEditor = (s: Student, e: Entry) => {
    const kind = pastKind[s.id] ?? "JUZ";
    const usedJuz = e.past.filter((x) => x.kind === kind).map((x) => x.juz);
    // رقم واحد في كل مرة: بعد اختياره تختفي الشبكة، و«+ ماضٍ آخر» يعيد اختيار النوع والرقم
    const choosing = e.past.length === 0 || pastAdding[s.id] === true;
    const picker = (
      <>
        <div style={{ fontSize: 13, fontWeight: 700 }}>اختاروا النوع ثم رقم الجزء</div>
        <div style={{ display: "flex", gap: 8 }}>
          {PAST_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setPastKind((prev) => ({ ...prev, [s.id]: k.id }))}
              style={{ ...chipStyle(kind === k.id), flex: 1, minHeight: 46, fontSize: 15, fontWeight: 700 }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
          {Array.from({ length: JUZ_COUNT }, (_, i) => String(i + 1)).map((j) => {
            const used = usedJuz.includes(j);
            return (
              <button
                key={j}
                type="button"
                disabled={used}
                onClick={() => {
                  set(s.id, { past: [...e.past, { kind, juz: j, grade: "" }] });
                  setPastAdding((prev) => ({ ...prev, [s.id]: false }));
                }}
                style={{ ...chipStyle(used), minHeight: 48, fontSize: 18, fontWeight: 700, padding: 0, opacity: used ? 0.55 : 1 }}
              >
                {j}
              </button>
            );
          })}
        </div>
      </>
    );
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 10, borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-grad)" }}>
        {e.past.map((x, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "8px 10px", borderRadius: 10, border: `1px solid ${x.grade ? "var(--line)" : "var(--accent-line)"}`, background: "var(--card-2-grad)" }}>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 150 }}>{pastItemLabel({ kind: x.kind, juz: parseInt(x.juz, 10) })}</span>
            {GRADES.map((g) => (
              <button key={g} type="button" onClick={() => set(s.id, { past: e.past.map((y, k) => (k === i ? { ...y, grade: g } : y)) })} style={{ ...chipStyle(x.grade === g), minHeight: 40 }}>
                {g}
              </button>
            ))}
            <button
              type="button"
              onClick={() => set(s.id, { past: e.past.filter((_, k) => k !== i) })}
              style={{ marginInlineStart: "auto", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(224,138,138,0.45)", background: "transparent", color: "var(--bad-ink)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              حذف
            </button>
          </div>
        ))}
        {choosing ? (
          <>
            {picker}
            {e.past.length > 0 && (
              <button type="button" onClick={() => setPastAdding((prev) => ({ ...prev, [s.id]: false }))} style={{ ...chipStyle(false), alignSelf: "flex-start", padding: "7px 14px" }}>
                إلغاء
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPastAdding((prev) => ({ ...prev, [s.id]: true }))}
            style={{ alignSelf: "flex-start", padding: "9px 18px", borderRadius: 10, border: "1px dashed var(--accent-line)", background: "var(--chip)", color: "var(--ink)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
          >
            + ماضٍ آخر
          </button>
        )}
      </div>
    );
  };

  const pastStudentIdx = students.findIndex((x) => x.id === pastOpen);
  const pastStudent = pastStudentIdx >= 0 ? students[pastStudentIdx] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {pastStudent && (
        <div
          onClick={() => setPastOpen(null)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(6,12,24,0.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 10px", overflow: "auto" }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{ width: "min(620px, 100%)", borderRadius: 16, border: "1px solid var(--line)", background: "var(--card-grad), var(--panel-solid)", boxShadow: "var(--glow)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>تسميع الماضي</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{pastStudent.name}</div>
              </div>
              {/* أعلى اليسار */}
              <button
                type="button"
                onClick={() => setPastOpen(null)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
              >
                إغلاق النافذة ✕
              </button>
            </div>
            <button
              type="button"
              onClick={() => set(pastStudent.id, { noPast: !entries[pastStudent.id].noPast, none: false })}
              style={{ ...chipStyle(entries[pastStudent.id].noPast), alignSelf: "flex-start", minHeight: 40 }}
            >
              لم يقرأ ماضي اليوم
            </button>
            {!entries[pastStudent.id].noPast && pastEditor(pastStudent, entries[pastStudent.id])}
            {errors[pastStudent.id] && (
              <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13, fontWeight: 600 }}>
                لم يتم الحفظ — {errors[pastStudent.id]}
              </div>
            )}
            <button
              type="button"
              disabled={savingId !== null}
              onClick={() => save(pastStudent, pastStudentIdx, "past", () => setPastOpen(null))}
              style={{ minHeight: 48, padding: "12px 22px", borderRadius: 11, border: "1px solid var(--btn-border)", background: "var(--btn-grad)", color: "var(--on-accent)", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", boxShadow: "var(--btn-shadow)", opacity: savingId === `${pastStudent.id}|past` ? 0.7 : 1 }}
            >
              {savingId === `${pastStudent.id}|past` ? "جارٍ الحفظ…" : "حفظ الماضي"}
            </button>
          </div>
        </div>
      )}
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

        {ordered.map((s, idx) => {
          const e = entries[s.id];
          const withPast = s.mode === "quran";
          const isSurah = s.mode === "surah";
          const saved = isComplete(s);
          const isOpen = open === s.id;
          const savedEntry = savedEntries[s.id];
          // طلاب القرآن: الجديد والماضي يُحفظ كلٌّ وحده — الحالة تبيّن أيّهما حُفظ
          const newSaved = !!savedEntry && !savedEntry.none && (savedEntry.noNew || !!savedEntry.nf);
          const pastSaved = !!savedEntry && !savedEntry.none && (savedEntry.noPast || savedEntry.past.length > 0);
          const summary = saved
            ? summaryOf(e, s.mode)
            : isSaved(s.id) && savedEntry
              ? summaryOf(savedEntry, s.mode)
            : withPast && savedEntry && !savedEntry.none && newSaved !== pastSaved
              ? summaryOf(savedEntry, s.mode)
              : savedEntry
                ? "عُدّل ولم يُحفظ التعديل بعد"
                : "لم يُحفظ بعد";

          // «كل الحلقات»: اسم الحلقة قبل أول طالب منها
          const heading = s.group && s.group !== ordered[idx - 1]?.group ? s.group : null;
          return (
            <div key={s.id}>
              {heading && (
                <div style={{ padding: "9px 14px", fontSize: 13.5, fontWeight: 700, background: "var(--card-2-grad)", borderTop: idx ? "1px solid var(--line)" : undefined }}>{heading}</div>
              )}
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
                      onClick={() => set(s.id, { none: !e.none, noNew: false, examPrep: false, noPast: false })}
                      style={{ ...chipStyle(e.none), minHeight: 40 }}
                    >
                      لم يسمّع اليوم
                    </button>
                    {withPast && (
                    <button
                      type="button"
                      disabled={e.none}
                      onClick={() => set(s.id, e.examPrep ? { examPrep: false, noNew: true } : { noNew: !e.noNew })}
                      style={{ ...chipStyle(e.noNew && !e.examPrep), minHeight: 40, opacity: e.none ? 0.45 : 1 }}
                    >
                      لم يسمّع جديدًا اليوم
                    </button>
                    )}
                  </div>
                  {withPast && (
                    <div style={{ display: "flex" }}>
                      <button
                        type="button"
                        disabled={e.none}
                        onClick={() => set(s.id, { examPrep: !e.examPrep, noNew: !e.examPrep })}
                        style={{ ...chipStyle(e.examPrep), minHeight: 40, opacity: e.none ? 0.45 : 1 }}
                      >
                        {e.examPrep ? "✓ " : ""}تحضير للسبر
                      </button>
                    </div>
                  )}

                  {!e.none && isSurah && (
                    <div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>
                        {s.mode === "surah" && tr(s) === "ARABIC" ? "بينة للناس — السور المسمَّعة" : "السور المسمَّعة"} (سورة أو أكثر)
                      </div>
                      {s.surahsBefore.length > 0 && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 7 }}>الباهت ✓: سُمِّعت من قبل — يمكن اختيارها لإعادة تسميعها.</div>
                      )}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {surahsFor(tr(s)).map((name) => {
                          const on = surahList(e).includes(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                const next = on ? surahList(e).filter((x) => x !== name) : [...surahList(e), name];
                                // بترتيب السور في المصحف
                                set(s.id, {
                                  surahs: surahsFor(tr(s)).filter((x) => next.includes(x)).join("|"),
                                  surahsDone: doneList(e).filter((x) => next.includes(x)).join("|"),
                                });
                              }}
                              title={!on && s.surahsBefore.includes(name) ? "سُمِّعت من قبل — يمكن إعادة تسميعها" : undefined}
                              style={
                                !on && s.surahsBefore.includes(name)
                                  ? { ...chipStyle(false), background: "color-mix(in srgb, #0f2a4d 18%, transparent)", borderColor: "color-mix(in srgb, #0f2a4d 35%, transparent)", color: "var(--ink-2)" }
                                  : chipStyle(on)
                              }
                            >
                              {!on && s.surahsBefore.includes(name) ? "✓ " : ""}
                              {name}
                            </button>
                          );
                        })}
                      </div>
                      {surahList(e).length > 0 && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>لا تُحسب السورة مسمَّعة إلا عند الضغط على «أنهى السورة».</div>
                          {surahList(e).map((name) => {
                            const done = doneList(e).includes(name);
                            return (
                              <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ minWidth: 80, fontSize: 13.5, fontWeight: 600 }}>{name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    set(s.id, {
                                      surahsDone: surahList(e)
                                        .filter((x) => (x === name ? !done : doneList(e).includes(x)))
                                        .join("|"),
                                    })
                                  }
                                  style={{ ...chipStyle(done), minHeight: 38, padding: "7px 14px" }}
                                >
                                  {done ? "✓ أنهى السورة" : "أنهى السورة"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {!e.none && (
                    <>
                      {e.examPrep && (
                        <div style={{ padding: "14px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-grad)", textAlign: "center", fontSize: 15, fontWeight: 700 }}>
                          تحضير للسبر
                        </div>
                      )}
                      {!isSurah && !e.examPrep && (
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
                            {e.pageDone ? "✓ أنهى الصفحة" : "أنهى الصفحة"}
                          </button>
                          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                            {e.pageDone ? "تُحسب الصفحة مسمَّعة." : "صفحة واحدة — لا تُحسب مسمَّعة ولا يتقدّم العدّاد إلا عند الضغط على «أنهى الصفحة»."}
                          </span>
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        {withPast ? "تسميع جديد «من» مُلئ تلقائيًا بعد آخر صفحة سُمِّعت جديدًا، ويجوز تعديله لتسميع صفحة سابقة." : "«من الصفحة» مُلئ تلقائيًا بعد آخر صفحة سُمِّعت، ويجوز تعديله لتسميع صفحة سابقة."}
                        {" التقدير «إعادة» لا تُحسب صفحاته ولا يتقدّم به العدّاد."}
                        {` الصفحات بين ${pageRange(tr(s)).min} و${pageRange(tr(s)).max}.`}
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

                      {/* الماضي في نافذة مستقلة: «تسميع الماضي» */}
                      {withPast && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
                          <button
                            type="button"
                            onClick={() => setPastOpen(s.id)}
                            style={{ minHeight: 44, padding: "10px 20px", borderRadius: 10, border: "1px solid var(--btn-border)", background: "var(--btn-grad)", color: "var(--on-accent)", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
                          >
                            تسميع الماضي
                          </button>
                          <span style={{ fontSize: 13, color: "var(--ink-2)", flex: 1, minWidth: 160 }}>
                            {e.noPast
                              ? "لم يقرأ ماضي اليوم"
                              : e.past.length
                                ? `الماضي: ${e.past.map((x) => `${pastItemLabel({ kind: x.kind, juz: parseInt(x.juz, 10) })}${x.grade ? ` (${x.grade})` : ""}`).join("، ")}`
                                : "لم يُختر الماضي بعد"}
                          </span>
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
                          ? `السور المنتهية: ${e.none ? 0 : doneList(e).length}`
                          : `${withPast ? "صفحات الجديد" : "إجمالي صفحات اليوم"}: ${e.none || e.noNew || e.gradeNew === REPEAT_GRADE || (singlePage(e) && !e.pageDone) ? 0 : span(e.nf, e.nt, tr(s))}`}
                      </span>
                      {withPast && (
                        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                          الماضي: {e.none || e.noPast ? 0 : formatJuz(pastJuzTotal(e.past))} جزء
                        </span>
                      )}
                    </div>
                    {/* طلاب القرآن: «حفظ جديد» و«حفظ الماضي» كلٌّ وحده — و«لم يسمّع اليوم» والقراءة العربية والسور بزر واحد */}
                    <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(withPast && !e.none ? (["new"] as const) : ([undefined] as const)).map((part) => {
                        const key = `${s.id}|${part ?? ""}`;
                        const label = part === "new" ? "حفظ جديد" : part === "past" ? "حفظ الماضي" : "حفظ";
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={savingId !== null}
                            onClick={() => save(s, idx, part)}
                            style={{
                              minHeight: 44,
                              padding: "10px 20px",
                              borderRadius: 10,
                              border: "1px solid var(--btn-border)",
                              background: "var(--btn-grad)",
                              color: "var(--on-accent)",
                              fontSize: 14,
                              fontWeight: 700,
                              fontFamily: "inherit",
                              cursor: "pointer",
                              boxShadow: "var(--btn-shadow)",
                              opacity: savingId === key ? 0.7 : 1,
                            }}
                          >
                            {savingId === key ? "جارٍ الحفظ…" : label}
                          </button>
                        );
                      })}
                    </div>
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
            : `حُفظ تسميع ${savedCount} من ${students.length} طالبًا — افتح بطاقة كل طالب واحفظ تسميعه.`}
        </div>
      )}
    </div>
  );
}
