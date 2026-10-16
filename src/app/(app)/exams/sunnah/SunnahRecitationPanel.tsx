"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { chipStyle, primaryButtonStyle } from "@/lib/ui";
import { today, formatDateAr } from "@/lib/daily";
import {
  SUNNAH_BOOKS,
  SUNNAH_REPEAT_GRADE,
  SUNNAH_REC_GRADES,
  SUNNAH_NOT_AVAILABLE,
  sunnahBook,
  sunnahSuggest,
  sunnahMode,
  positionFromExams,
  sunnahMaxNo,
  sunnahPositionLabel,
  levelStages,
  stageRange,
  sunnahBookLabel,
  SUNNAH_PASS_STARS,
  SUNNAH_REPEAT_STARS,
  SUNNAH_DAILY_ALERT,
  stageName,
  levelPartCount,
  type SunnahSectionId,
  type SunnahStartPoint,
} from "@/lib/sunnah";
import SunnahStarsField from "./SunnahStarsField";
import type { SunnahExamRow } from "./SunnahClient";
import DateField from "@/components/DateField";
import NumberField from "@/components/NumberField";
import { saveSunnahRecitation, deleteSunnahRecitation, saveSunnahStageExam, saveSunnahStart } from "./actions";

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

const noticeStyle = { padding: "11px 13px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 } as const;
const lockedBtn = { ...chipStyle(false), opacity: 0.55, padding: "8px 14px" } as const;

/**
 * تسميع السنة النبوية لطالب في منهج واحد — يُفتح بحسب موقعه:
 * الإعداد الأول (لم يسمّع بعد) ← تسميع الأحاديث (ناجح / إعادة) ← سبر المرحلة حين يُتمّ أرقامها ← سبر المستوى حين يُتمّ مراحله.
 * لا يُفتح سبر مرحلة ولا سبر مستوى قبل أن يصل الطالب إليه.
 */
export default function SunnahRecitationPanel({
  section,
  dayCounts,
  studentId,
  recitations,
  exams,
  startPoint,
  balance,
  weekDates,
  today: todayStr,
  canRecite,
  canDelete,
  onLevelExam,
}: {
  section: SunnahSectionId;
  /** عدد ما سمّعه الطالب في كل يوم من هذا الأسبوع (المناهج الثلاثة، المحفوظ) */
  dayCounts: Record<string, number>;
  studentId: string;
  recitations: SunnahRecRow[];
  /** سبور الطالب في هذا المنهج — منها موقعه: المستوى والمرحلة */
  exams: SunnahExamRow[];
  /** الإعداد الأول للطالب في هذا المنهج */
  startPoint: SunnahStartPoint | null;
  balance: number;
  weekDates: string[];
  today: string;
  canRecite: boolean;
  canDelete: (r: SunnahRecRow) => boolean;
  /** يفتح نموذج سبر المستوى المحلي لمستوى الطالب الحالي */
  onLevelExam: (level: number) => void;
}) {
  const pos = useMemo(
    () =>
      positionFromExams(
        section,
        exams.map((e) => ({ type: e.type, section: e.section, branch: e.branch, mark: e.mark, repeat: e.repeat, grade: e.grade, stageNo: e.stageNo, createdAt: e.createdAt })),
        startPoint
      ),
    [section, exams, startPoint]
  );
  const mode = sunnahMode(pos, recitations, startPoint, recitations.length > 0 || exams.length > 0);
  const maxNo = sunnahMaxNo(pos);
  const bookInfo = sunnahBook(section, pos.book);
  const unit = bookInfo?.unit ?? "الرقم";

  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [lockMsg, setLockMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const [starsEdit, setStarsEdit] = useState<number | null>(null);
  // سبر المرحلة
  const [stageGrade, setStageGrade] = useState("");
  const [stageDate, setStageDate] = useState(today());
  const [stageStarsEdit, setStageStarsEdit] = useState<number | null>(null);
  const [stageError, setStageError] = useState("");

  // الاقتراح: التالي بعد آخر ما سمّعه (وما كان «إعادة» يبقى ضمن التالي) — يُعاد حسابه كلما تغيّرت البيانات
  const suggestKey = `${pos.level}|${pos.stage}|${recitations.length}|${recitations[0]?.id ?? ""}|${startPoint?.startNo ?? ""}`;
  useEffect(() => {
    const next = sunnahSuggest(pos, recitations, startPoint);
    setItems(next.nos.map((n) => ({ no: String(n), grade: "" })));
    setStarsEdit(null);
    setStageGrade("");
    setStageStarsEdit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestKey]);

  const hasRepeat = items.some((it) => it.grade === SUNNAH_REPEAT_GRADE);
  const stars = starsEdit ?? (hasRepeat ? SUNNAH_REPEAT_STARS : 0);
  const stageStars = stageStarsEdit ?? (!stageGrade ? 0 : stageGrade === SUNNAH_REPEAT_GRADE ? SUNNAH_REPEAT_STARS : SUNNAH_PASS_STARS);

  // تنبيهات النجوم (حتى لو أخذ «إعادة» في بعض الأحاديث)
  const gradedNow = items.filter((it) => it.grade).length;
  const countOn = (d: string) => dayCounts[d] ?? recitations.filter((r) => r.date === d).length;
  const dayCount = countOn(date) + gradedNow;
  const everyDayThisWeek =
    date === todayStr &&
    todayStr === weekDates[weekDates.length - 1] &&
    weekDates.length > 1 &&
    weekDates.every((d) => (d === todayStr ? dayCount > 0 : countOn(d) > 0));
  const recitationNotices = [
    hasRepeat && "سيتم سحب نجمة من رصيد الطالب — عدِّلها إن أردت.",
    dayCount >= SUNNAH_DAILY_ALERT && `لقد سمّع هذا الطالب ${dayCount} ${dayCount > 10 ? "حديثًا" : "أحاديث"} اليوم. زِد نجمة أو نجمتين أو ثلاث نجوم.`,
    everyDayThisWeek && "لقد سمّع هذا الطالب يوميًا هذا الأسبوع. زِد نجمة أو نجمتين.",
  ];

  const setItem = (i: number, patch: Partial<Item>) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const shift = (i: number, d: number) => setItem(i, { no: String(Math.max(1, (parseInt(items[i].no, 10) || 0) + d)) });
  const addNext = () => {
    const max = Math.max(0, ...items.map((it) => parseInt(it.no, 10) || 0));
    if (maxNo != null && max + 1 > maxNo) return setError(`آخر ${unit} في المرحلة الحالية ${maxNo}.`);
    setError("");
    setItems((prev) => [...prev, { no: String(max + 1), grade: "" }]);
  };

  function save() {
    setError("");
    setSaved("");
    if (maxNo != null && items.some((it) => (parseInt(it.no, 10) || 0) > maxNo)) {
      return setError(`لا يُسمَّع بعد ${unit} ${maxNo} حتى ينجح الطالب في سبر ${pos.stage ? stageName(section, pos.level, pos.stage) : "المرحلة"}.`);
    }
    startTransition(async () => {
      const res = await saveSunnahRecitation({
        studentId,
        section,
        book: pos.book,
        items: items.map((it) => ({ no: parseInt(it.no, 10), grade: it.grade })),
        stars,
        date,
      });
      if (res.error) return setError(res.error);
      setSaved("✓ حُفظ التسميع.");
    });
  }

  // سبر المرحلة، أو سبر القسم في المستوى المقسَّم
  const isPartExam = mode === "partExam";
  function saveStage() {
    const target = isPartExam ? pos.awaitingPart : pos.stage;
    if (!target) return;
    setStageError("");
    startTransition(async () => {
      const res = await saveSunnahStageExam({
        studentId,
        section,
        level: pos.level,
        stage: target,
        part: isPartExam,
        stars: stageStars,
        grade: stageGrade,
        date: stageDate,
        notes: "",
      });
      if (res.error) return setStageError(res.error);
      setSaved(isPartExam ? "✓ حُفظ سبر القسم." : "✓ حُفظ سبر المرحلة.");
    });
  }

  // سجلّ التسميع: مجمّع بالتاريخ والكتاب
  const history = useMemo(() => {
    const groups = new Map<string, SunnahRecRow[]>();
    for (const r of recitations) {
      const k = `${r.date}|${r.book}|${r.examinerName}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    return [...groups.values()].map((g) => [...g].sort((a, b) => a.fromNo - b.fromNo)).slice(0, 30);
  }, [recitations]);

  const noStages = !pos.stages;
  // أزرار السبر قبل أن يصل الطالب إليها: معطّلة برسالة
  const lockedExams = canRecite && (mode === "recite") && (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => setLockMsg(noStages ? SUNNAH_NOT_AVAILABLE : `سبر المرحلة يُفتح بعد تسميع أرقامها كلها (${unit} ${pos.stageStart}–${pos.stageEnd}).`)} style={lockedBtn}>
        🔒 سبر المرحلة
      </button>
      {levelPartCount(section, pos.level) > 0 && (
        <button type="button" onClick={() => setLockMsg("سبر القسم يُفتح بعد النجاح في كل مراحل القسم.")} style={lockedBtn}>
          🔒 سبر القسم
        </button>
      )}
      <button type="button" onClick={() => setLockMsg(noStages ? SUNNAH_NOT_AVAILABLE : levelPartCount(section, pos.level) > 0 ? "سبر المستوى يُفتح بعد النجاح في سبر كل أقسام المستوى." : "سبر المستوى يُفتح بعد النجاح في كل مراحل المستوى.")} style={lockedBtn}>
        🔒 سبر المستوى
      </button>
    </div>
  );

  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--accent-line, var(--line))", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>تسميع السنة النبوية</div>
      {saved && <div style={{ fontSize: 13, color: "var(--ok)" }}>{saved}</div>}

      {mode !== "setup" && (
        <div style={{ padding: "9px 12px", borderRadius: 10, background: "var(--card-2-grad)", border: "1px solid var(--line)", fontSize: 13, fontWeight: 600 }}>
          {sunnahPositionLabel(pos)}
        </div>
      )}

      {mode === "setup" && (canRecite ? <SetupForm section={section} studentId={studentId} /> : <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لم يبدأ الطالب في هذا المنهج بعد.</div>)}

      {mode === "finished" && <div style={noticeStyle}>أنهى الطالب كل مستويات هذا المنهج.</div>}
      {mode === "unavailable" && <div style={noticeStyle}>{SUNNAH_NOT_AVAILABLE}</div>}

      {/* سبر المستوى: حين يُتمّ مراحل المستوى */}
      {mode === "levelExam" && canRecite && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={noticeStyle}>أنهى الطالب مراحل المستوى {pos.level} كلها — يُجرى له سبر المستوى، والنجاح فيه (من 80) ينقله إلى المستوى التالي.</div>
          <button type="button" onClick={() => onLevelExam(pos.level)} style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "10px 20px" }}>
            سبر المستوى {pos.level}
          </button>
        </div>
      )}

      {/* سبر المرحلة: حين يُتمّ أرقامها — أو سبر القسم: حين ينجح في كل مراحله */}
      {((mode === "stageExam" && pos.stage != null) || (isPartExam && pos.awaitingPart != null)) && canRecite && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 11, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {isPartExam ? `سبر القسم ${pos.awaitingPart} — أنهى الطالب مراحله كلها` : `سبر ${stageName(section, pos.level, pos.stage as number)} (${unit} ${pos.stageStart}–${pos.stageEnd})`}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {SUNNAH_REC_GRADES.map((g) => (
              <button key={g} type="button" onClick={() => setStageGrade(g)} style={{ ...chipStyle(stageGrade === g), minHeight: 44, padding: "10px 24px" }}>
                {g}
              </button>
            ))}
          </div>
          {stageGrade && (
            <SunnahStarsField
              value={stageStars}
              onChange={setStageStarsEdit}
              balance={balance}
              notices={[stageGrade === SUNNAH_REPEAT_GRADE && "سيتم سحب نجمة من رصيد الطالب — عدِّلها إن أردت."]}
            />
          )}
          <DateField label="تاريخ السبر" value={stageDate} onChange={setStageDate} />
          {stageError && <div style={noticeStyle}>{stageError}</div>}
          <button type="button" onClick={saveStage} disabled={pending || !stageGrade} style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "9px 20px", opacity: pending || !stageGrade ? 0.6 : 1 }}>
            {isPartExam ? "حفظ سبر القسم" : "حفظ سبر المرحلة"}
          </button>
        </div>
      )}

      {/* تسميع الأحاديث */}
      {mode === "recite" && canRecite && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            يظهر التالي بعد آخر ما سمّعه الطالب، وما كان «{SUNNAH_REPEAT_GRADE}» يبقى ضمن التالي — يمكنكم الرجوع والتقدّم بزرّي − و+.
          </div>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: 10, borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
              <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{unit}</span>
              {/* − الرقم + متلاصقة لا تنفصل على شاشة الجوال */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                <button type="button" onClick={() => shift(i, -1)} aria-label="السابق" style={{ ...chipStyle(false), width: 36, minHeight: 36, padding: 0, fontSize: 18, fontWeight: 700 }}>
                  −
                </button>
                <NumberField value={it.no} onChange={(e) => setItem(i, { no: e.target.value })} style={{ width: 52, minHeight: 36, padding: "4px 2px", fontSize: 15, textAlign: "center" }} />
                <button type="button" onClick={() => shift(i, 1)} aria-label="التالي" style={{ ...chipStyle(false), width: 36, minHeight: 36, padding: 0, fontSize: 18, fontWeight: 700 }}>
                  +
                </button>
              </div>
              {SUNNAH_REC_GRADES.map((g) => (
                <button key={g} type="button" onClick={() => setItem(i, { grade: g })} style={{ ...chipStyle(it.grade === g), minHeight: 40, padding: "8px 16px" }}>
                  {g}
                </button>
              ))}
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
          ))}
          <button type="button" onClick={addNext} style={{ ...chipStyle(false), alignSelf: "flex-start", padding: "8px 14px" }}>
            ＋ {unit === "الصفحة" ? "الصفحة التالية" : unit === "البيت" ? "البيت التالي" : unit === "الحديث" ? "الحديث التالي" : "الرقم التالي"}
          </button>
          <SunnahStarsField value={stars} onChange={setStarsEdit} balance={balance} notices={recitationNotices} />
          <DateField label="تاريخ التسميع" value={date} onChange={setDate} />
          {error && <div style={noticeStyle}>{error}</div>}
          <button type="button" onClick={save} disabled={pending} style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "10px 22px", opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ التسميع"}
          </button>
        </div>
      )}

      {lockedExams}
      {lockMsg && mode === "recite" && <div style={noticeStyle}>{lockMsg}</div>}

      {/* سجلّ التسميع */}
      {history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>سجلّ التسميع</div>
          {history.map((g) => {
            const b = sunnahBook(g[0].section, g[0].book);
            return (
              <div key={g[0].id} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ color: "var(--ink-2)" }}>
                  {formatDateAr(g[0].date)} · {b ? sunnahBookLabel(g[0].section, g[0].book) : g[0].book} · {g[0].examinerName}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** الإعداد الأول: الكتاب ← المستوى ← المرحلة ← رقم الحديث الذي يبدأ منه */
export function SetupForm({ section, studentId, reset = false, onDone }: { section: SunnahSectionId; studentId: string; reset?: boolean; onDone?: () => void }) {
  const books = SUNNAH_BOOKS[section];
  const [book, setBook] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [startNo, setStartNo] = useState("");
  const [error, setError] = useState("");
  const [levelMsg, setLevelMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const b = books.find((x) => x.id === book);
  const stages = level ? levelStages(section, level) : null;
  const range =
    level && stages && stage ? stageRange(section, level, stage) : null;

  function save() {
    setError("");
    if (!level) return setError("اختاروا المستوى.");
    startTransition(async () => {
      const res = await saveSunnahStart({ studentId, section, level, stage, startNo: parseInt(startNo, 10) || 0, reset });
      if (res.error) setError(res.error);
      else onDone?.();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
        {reset
          ? "من أين يبدأ الطالب الآن في هذا المنهج؟ ما قبله يُعدّ منجزًا، وسبوره وتسميعه السابقة تبقى في السجل ولا تُحتسب في موقعه."
          : "أول تسميع لهذا الطالب في هذا المنهج — من أين يبدأ؟ (ما قبله يُعدّ منجزًا)"}
      </div>
      <div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>الكتاب</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {books.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                setBook(x.id);
                const only = x.branches.length === 1 && levelStages(section, x.branches[0]) ? x.branches[0] : null;
                setLevelMsg(x.branches.every((l) => !levelStages(section, l)) ? SUNNAH_NOT_AVAILABLE : "");
                setLevel(only);
                setStage(null);
                setStartNo("");
              }}
              style={{ ...chipStyle(book === x.id), padding: "9px 14px" }}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      {b && (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>المستوى</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {b.branches.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  if (!levelStages(section, l)) return setLevelMsg(SUNNAH_NOT_AVAILABLE);
                  setLevelMsg("");
                  setLevel(l);
                  setStage(null);
                  setStartNo("");
                }}
                style={{ ...chipStyle(level === l), minWidth: 48, padding: "9px 14px", opacity: levelStages(section, l) ? 1 : 0.5 }}
              >
                {levelStages(section, l) ? l : `🔒 ${l}`}
              </button>
            ))}
          </div>
        </div>
      )}
      {level && stages && (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>المرحلة</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stages.map((_, k) => {
              const { from, to: end } = stageRange(section, level, k + 1);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setStage(k + 1);
                    setStartNo(String(from));
                  }}
                  style={{ ...chipStyle(stage === k + 1), padding: "9px 14px" }}
                >
                  {stageName(section, level, k + 1)} <span style={{ opacity: 0.7, fontSize: 12 }}>({from}–{end})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {levelMsg && <div style={noticeStyle}>{levelMsg}</div>}
      {level && stages && stage && (
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>رقم {b?.unit ?? "الحديث"} الذي يبدأ منه{range ? ` (${range.from}–${range.to})` : ""}</div>
          <NumberField value={startNo} onChange={(e) => setStartNo(e.target.value)} style={{ width: 110, minHeight: 44, padding: 10, fontSize: 17, textAlign: "center" }} />
        </div>
      )}
      {error && <div style={noticeStyle}>{error}</div>}
      <button type="button" onClick={save} disabled={pending || !level || !startNo} style={{ ...primaryButtonStyle, alignSelf: "flex-start", padding: "10px 22px", opacity: pending || !level || !startNo ? 0.6 : 1 }}>
        {reset ? "حفظ المستوى الجديد" : "ابدأ التسميع"}
      </button>
    </div>
  );
}
