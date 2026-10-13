"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { chipStyle, primaryButtonStyle } from "@/lib/ui";
import { GRADES, today, formatDateAr } from "@/lib/daily";
import {
  SUNNAH_SECTIONS,
  SUNNAH_BOOKS,
  SUNNAH_REPEAT_GRADE,
  sunnahBook,
  sunnahSuggest,
  positionFromExams,
  sunnahMaxNo,
  sunnahPositionLabel,
  SUNNAH_PASS_STARS,
  SUNNAH_REPEAT_STARS,
  SUNNAH_DAILY_ALERT,
  type SunnahSectionId,
} from "@/lib/sunnah";
import SunnahStarsField from "./SunnahStarsField";
import { ARABIC_GRADES } from "@/lib/exam";
import type { SunnahExamRow } from "./SunnahClient";
import Select from "@/components/Select";
import DateField from "@/components/DateField";
import NumberField from "@/components/NumberField";
import { saveSunnahRecitation, deleteSunnahRecitation, saveSunnahStageExam } from "./actions";

export type SunnahRecRow = {
  id: string;
  studentId: string;
  section: string;
  book: string;
  fromNo: number;
  toNo: number;
  grade: string;
  date: string;
  createdAt: string;
  notes: string | null;
  examinerId: string;
  examinerName: string;
};

type Item = { no: string; grade: string };

/**
 * تسميع السنة النبوية بالأرقام: يختار المختبِر أحد المناهج الثلاثة، فيظهر له التالي بعد آخر ما سمّعه الطالب
 * (وما كان «إعادة» يبقى ضمن التالي) — للمساعدة فقط، ويمكنه الرجوع والتقدّم. أكثر من رقم في الجلسة، لكل رقم تقديره.
 */
export default function SunnahRecitationPanel({
  section: fixedSection,
  dayCounts,
  studentId,
  recitations,
  exams,
  balance,
  weekDates,
  today: todayStr,
  canRecite,
  canDelete,
}: {
  /** المنهج — كل منهج واجهة مستقلة */
  section: SunnahSectionId;
  /** عدد ما سمّعه الطالب في كل يوم من هذا الأسبوع (المناهج الثلاثة، المحفوظ) */
  dayCounts: Record<string, number>;
  studentId: string;
  recitations: SunnahRecRow[];
  /** سبور الطالب في السنة النبوية — منها موقعه: المستوى والمرحلة */
  exams: SunnahExamRow[];
  /** رصيد نجوم الطالب */
  balance: number;
  /** أيام الدوام في هذا الأسبوع — لتنبيه «سمّع يوميًا هذا الأسبوع» */
  weekDates: string[];
  today: string;
  canRecite: boolean;
  canDelete: (r: SunnahRecRow) => boolean;
}) {
  const [section, setSection] = useState<SunnahSectionId | null>(null);
  // بعد الحفظ: يُعاد الاقتراح حين تصل البيانات الجديدة من الخادم
  const [refreshAfterSave, setRefreshAfterSave] = useState(false);
  // واجهة منهج واحد: يُفتح التسميع مباشرة بالتالي المقترح
  useEffect(() => {
    if (section === null && canRecite) pick(fixedSection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, fixedSection, canRecite]);
  useEffect(() => {
    if (!refreshAfterSave) return;
    setRefreshAfterSave(false);
    pick(fixedSection, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recitations, exams]);
  const [book, setBook] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  // سبر المرحلة
  const [stageOpen, setStageOpen] = useState(false);
  const [stageGrade, setStageGrade] = useState("");
  const [stageDate, setStageDate] = useState(today());
  const [stageNotes, setStageNotes] = useState("");
  const [stageError, setStageError] = useState("");
  // نجوم المختبِر (−2 … 10) — تلقائيًا ما لم يعدّلها: الجلسة فيها «إعادة» −1، وسبر المرحلة نجاح +3 / إعادة −1
  const [starsEdit, setStarsEdit] = useState<number | null>(null);
  const [stageStarsEdit, setStageStarsEdit] = useState<number | null>(null);
  const hasRepeat = items.some((it) => it.grade === SUNNAH_REPEAT_GRADE);
  const stars = starsEdit ?? (hasRepeat ? SUNNAH_REPEAT_STARS : 0);
  const stageStars = stageStarsEdit ?? (!stageGrade ? 0 : stageGrade === SUNNAH_REPEAT_GRADE ? SUNNAH_REPEAT_STARS : SUNNAH_PASS_STARS);

  // تنبيهات للمختبِر (حتى لو أخذ «إعادة» في بعض الأحاديث)
  const gradedNow = items.filter((it) => it.grade).length;
  // المحفوظ في المناهج الثلاثة (من الخادم) لأيام هذا الأسبوع، وإلا ما في هذا المنهج
  const countOn = (d: string) => dayCounts[d] ?? recitations.filter((r) => r.date === d).length;
  const dayCount = countOn(date) + gradedNow;
  const lastWorkDay = weekDates[weekDates.length - 1];
  const everyDayThisWeek =
    date === todayStr &&
    todayStr === lastWorkDay &&
    weekDates.length > 1 &&
    weekDates.every((d) => (d === todayStr ? dayCount > 0 : countOn(d) > 0));
  const recitationNotices = [
    hasRepeat && "سيتم سحب نجمة من رصيد الطالب — عدِّلها إن أردت.",
    dayCount >= SUNNAH_DAILY_ALERT && `لقد سمّع هذا الطالب ${dayCount} ${dayCount > 10 ? "حديثًا" : "أحاديث"} اليوم. زِد نجمة أو نجمتين أو ثلاث نجوم.`,
    everyDayThisWeek && "لقد سمّع هذا الطالب يوميًا هذا الأسبوع. زِد نجمة أو نجمتين.",
  ];

  const posOf = (sec: SunnahSectionId) =>
    positionFromExams(
      sec,
      exams.map((e) => ({ type: e.type, section: e.section, branch: e.branch, mark: e.mark, repeat: e.repeat, grade: e.grade, stageNo: e.stageNo }))
    );
  const pos = section ? posOf(section) : null;
  const maxNo = pos ? sunnahMaxNo(pos) : null;

  function pick(sec: SunnahSectionId, keepSaved = false) {
    const next = sunnahSuggest(posOf(sec), recitations);
    setSection(sec);
    setBook(next.book);
    setItems(next.nos.map((n) => ({ no: String(n), grade: "" })));
    setError("");
    if (!keepSaved) setSaved(false);
    setStageOpen(false);
    setStarsEdit(null);
    setStageStarsEdit(null);
    setStageGrade("");
    setStageNotes("");
    setStageError("");
  }

  function saveStage() {
    if (!section || !pos?.stage) return;
    setStageError("");
    startTransition(async () => {
      const res = await saveSunnahStageExam({
        studentId,
        section,
        level: pos.level,
        stage: pos.stage as number,
        stars: stageStars,
        grade: stageGrade,
        date: stageDate,
        notes: stageNotes,
      });
      if (res.error) return setStageError(res.error);
      setSaved(true);
      setRefreshAfterSave(true);
    });
  }

  const bookInfo = section ? sunnahBook(section, book) : undefined;
  const unit = bookInfo?.unit ?? "الرقم";

  const setItem = (i: number, patch: Partial<Item>) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const shift = (i: number, d: number) => {
    const n = parseInt(items[i].no, 10) || 0;
    setItem(i, { no: String(Math.max(1, n + d)) });
  };
  const addNext = () => {
    const max = Math.max(0, ...items.map((it) => parseInt(it.no, 10) || 0));
    if (maxNo != null && max + 1 > maxNo) return setError(`آخر ${unit} في المرحلة الحالية ${maxNo}.`);
    setItems((prev) => [...prev, { no: String(max + 1), grade: "" }]);
  };

  function save() {
    if (!section) return;
    setError("");
    setSaved(false);
    if (maxNo != null && items.some((it) => (parseInt(it.no, 10) || 0) > maxNo)) {
      return setError(`لا يُسمَّع بعد ${unit} ${maxNo} حتى ينجح الطالب في ${pos?.awaitingLevelExam ? "سبر المستوى" : `سبر المرحلة ${pos?.stage}`}.`);
    }
    startTransition(async () => {
      const res = await saveSunnahRecitation({
        studentId,
        section,
        book,
        items: items.map((it) => ({ no: parseInt(it.no, 10), grade: it.grade })),
        stars,
        date,
        notes,
      });
      if (res.error) return setError(res.error);
      setSaved(true);
      setNotes("");
      setStarsEdit(null);
      setRefreshAfterSave(true);
    });
  }

  // سجلّ المنهج المختار: مجمّع بالتاريخ والكتاب
  const history = useMemo(() => {
    const rows = recitations.filter((r) => !section || r.section === section);
    const groups = new Map<string, SunnahRecRow[]>();
    for (const r of rows) {
      const k = `${r.date}|${r.section}|${r.book}|${r.examinerName}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    return [...groups.values()].map((g) => [...g].sort((a, b) => a.fromNo - b.fromNo)).slice(0, 30);
  }, [recitations, section]);

  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--accent-line, var(--line))", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>تسميع السنة النبوية</div>

      {saved && <div style={{ fontSize: 13, color: "var(--ok)" }}>✓ حُفظ التسميع.</div>}

      {section && canRecite && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pos && (
            <div style={{ padding: "9px 12px", borderRadius: 10, background: "var(--card-2-grad)", border: "1px solid var(--line)", fontSize: 13, fontWeight: 600 }}>
              {sunnahPositionLabel(pos)}
            </div>
          )}
          {pos?.awaitingLevelExam && (
            <div style={{ padding: "11px 13px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
              أنهى الطالب مراحل المستوى {pos.level} كلها — يُجرى له سبر المستوى من «＋ سبر المستوى» ثم ينتقل إلى المستوى التالي.
            </div>
          )}
          {pos?.stage != null && items.length === 0 && (
            <div style={{ padding: "11px 13px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
              سمّع الطالب أرقام المرحلة {pos.stage} كلها — يُجرى له سبر المرحلة.
            </div>
          )}

          {pos?.stage != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" onClick={() => setStageOpen((v) => !v)} style={{ ...chipStyle(stageOpen), alignSelf: "flex-start", padding: "8px 14px" }}>
                سبر المرحلة {pos.stage} ({unit} {pos.stageStart}–{pos.stageEnd})
              </button>
              {stageOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 11, border: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {ARABIC_GRADES.map((g) => (
                      <button key={g} type="button" onClick={() => setStageGrade(g)} style={{ ...chipStyle(stageGrade === g), minHeight: 40, padding: "8px 16px" }}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>«إعادة» يُعيد المرحلة؛ غيرها نجاح يفتح المرحلة التالية ويمنح الطالب 3 نجوم.</div>
                  {stageGrade && (
                    <SunnahStarsField
                      value={stageStars}
                      onChange={setStageStarsEdit}
                      balance={balance}
                      notices={[stageGrade === SUNNAH_REPEAT_GRADE && "سيتم سحب نجمة من رصيد الطالب — عدِّلها إن أردت."]}
                    />
                  )}
                  <DateField label="تاريخ السبر" value={stageDate} onChange={setStageDate} />
                  <input
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    placeholder="ملاحظات (اختياري)"
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14 }}
                  />
                  {stageError && (
                    <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{stageError}</div>
                  )}
                  <button type="button" onClick={saveStage} disabled={pending} style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "9px 20px", opacity: pending ? 0.7 : 1 }}>
                    حفظ سبر المرحلة
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>الكتاب</div>
            <Select
              disabled={!!pos?.stages}
              value={book}
              onChange={(v) => {
                setBook(v);
                if (v !== book) setItems([{ no: "1", grade: "" }]);
              }}
              options={SUNNAH_BOOKS[section].map((b) => ({ value: b.id, label: b.label }))}
            />
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            يظهر التالي بعد آخر ما سمّعه الطالب، وما كان «{SUNNAH_REPEAT_GRADE}» يبقى ضمن التالي — يمكنكم الرجوع والتقدّم بالسهمين.
          </div>

          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 7, padding: 10, borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{unit}</span>
                <button type="button" onClick={() => shift(i, -1)} aria-label="السابق" style={{ ...chipStyle(false), padding: "6px 12px" }}>
                  ▶
                </button>
                <NumberField value={it.no} onChange={(e) => setItem(i, { no: e.target.value })} style={{ width: 80, minHeight: 40, padding: 8, fontSize: 17, textAlign: "center" }} />
                <button type="button" onClick={() => shift(i, 1)} aria-label="التالي" style={{ ...chipStyle(false), padding: "6px 12px" }}>
                  ◀
                </button>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                    style={{ marginInlineStart: "auto", border: "none", background: "transparent", color: "var(--ink-3)", fontSize: 13, cursor: "pointer" }}
                  >
                    إزالة ✕
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {GRADES.map((g) => (
                  <button key={g} type="button" onClick={() => setItem(i, { grade: g })} style={chipStyle(it.grade === g)}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={addNext} style={{ ...chipStyle(false), alignSelf: "flex-start", padding: "8px 14px" }}>
            ＋ {unit === "الصفحة" ? "الصفحة التالية" : unit === "البيت" ? "البيت التالي" : unit === "الحديث" ? "الحديث التالي" : "الرقم التالي"}
          </button>

          <SunnahStarsField value={stars} onChange={setStarsEdit} balance={balance} notices={recitationNotices} />
          <DateField label="تاريخ التسميع" value={date} onChange={setDate} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="ملاحظات (اختياري)"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14, resize: "vertical" }}
          />
          {error && (
            <div style={{ padding: "11px 13px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>
          )}
          <button type="button" onClick={save} disabled={pending} style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "10px 22px", opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ التسميع"}
          </button>
        </div>
      )}

      {/* سجلّ التسميع */}
      {history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>سجلّ التسميع{section ? ` — ${SUNNAH_SECTIONS.find((s) => s.id === section)?.label}` : ""}</div>
          {history.map((g) => {
            const b = sunnahBook(g[0].section, g[0].book);
            return (
              <div key={g[0].id} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ color: "var(--ink-2)" }}>
                  {formatDateAr(g[0].date)} · {b?.label ?? g[0].book} · {g[0].examinerName}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {g.map((r) => {
                    const bad = r.grade === SUNNAH_REPEAT_GRADE;
                    return (
                      <span
                        key={r.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 9px",
                          borderRadius: 999,
                          border: `1px solid color-mix(in srgb, ${bad ? "var(--bad)" : "var(--ok)"} 45%, transparent)`,
                          color: bad ? "var(--bad)" : "var(--ink)",
                        }}
                      >
                        {r.fromNo} — {r.grade}
                        {canDelete(r) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`حذف تسميع الرقم ${r.fromNo}؟`)) startTransition(async () => void (await deleteSunnahRecitation(r.id)));
                            }}
                            aria-label="حذف"
                            style={{ border: "none", background: "transparent", color: "var(--ink-3)", cursor: "pointer", padding: 0, fontSize: 12 }}
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
                {g[0].notes && <div style={{ color: "var(--ink-2)" }}>ملاحظات: {g[0].notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
