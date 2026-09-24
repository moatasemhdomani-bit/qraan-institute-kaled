"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveStudentRecitation } from "./actions";
import { GRADES, MIN_PAGE, MAX_PAGE } from "@/lib/daily";
import { validateEntry } from "@/lib/recitation";
import { chipStyle } from "@/lib/ui";
import NumberField from "@/components/NumberField";

type Entry = {
  none: boolean;
  noNew: boolean;
  noPast: boolean;
  nf: string;
  nt: string;
  rf: string;
  rt: string;
  gradeNew: string;
  gradePast: string;
};

type Student = {
  id: string;
  no: number;
  name: string;
  saved: Entry | null;
  lastNewTo: number | null;
  lastPastTo: number | null;
};

/**
 * «تسميع جديد — من» يبدأ من الصفحة التالية لأعلى صفحة جديدة سُمِّعت من قبل — قابل للتعديل، لكن لا يجوز
 * النزول تحتها (لا يُعاد تسميع صفحة سُمِّعت جديدًا من قبل).
 * «ماضي — من» يُترك فارغًا عمدًا: الماضي مراجعة، لا يُشترط أن يكمل من حيث انتهى آخر مرة، ويجوز
 * الرجوع لأي صفحة سابقة.
 */
const blank = (s: Student): Entry => ({
  none: false,
  noNew: false,
  noPast: false,
  nf: s.lastNewTo ? String(Math.min(s.lastNewTo + 1, MAX_PAGE)) : "",
  nt: "",
  rf: "",
  rt: "",
  gradeNew: "",
  gradePast: "",
});

const span = (a: string, b: string) => {
  const x = parseInt(a, 10);
  const y = parseInt(b, 10);
  return x >= MIN_PAGE && y <= MAX_PAGE && y >= x ? y - x + 1 : 0;
};

const pageNum = (v: string): number | null => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const sameEntry = (a: Entry | undefined, b: Entry) =>
  !!a && (Object.keys(b) as (keyof Entry)[]).every((k) => a[k] === b[k]);

/** سبب رفض سطر الطالب (نفس قواعد الخادم تمامًا)، أو null إن كان جاهزًا للحفظ. */
function entryProblem(s: Student, e: Entry): string | null {
  return validateEntry(
    {
      studentId: s.id,
      none: e.none,
      noNew: e.noNew,
      noPast: e.noPast,
      newFrom: pageNum(e.nf),
      newTo: pageNum(e.nt),
      pastFrom: pageNum(e.rf),
      pastTo: pageNum(e.rt),
      gradeNew: e.gradeNew || null,
      gradePast: e.gradePast || null,
    },
    s.lastNewTo
  );
}

function summaryOf(e: Entry): string {
  if (e.none) return "لم يسمّع اليوم";
  const newPart = e.noNew ? "لم يسمّع جديدًا" : `تسميع جديد ${e.nf}→${e.nt} (${e.gradeNew})`;
  const pastPart = e.noPast ? "لم يقرأ ماضي" : `ماضي ${e.rf}→${e.rt} (${e.gradePast})`;
  return `${newPart} · ${pastPart}`;
}

/**
 * كل طالب يُحفظ وحده بزر «حفظ» في بطاقته. لا يُفحص الإدخال ولا تظهر رسالة خطأ إلا عند الضغط على الزر؛
 * والرسالة تبقى كما هي حتى الضغطة التالية.
 */
export default function RecitationClient({
  halqaId,
  date,
  students,
}: {
  halqaId: string;
  date: string;
  students: Student[];
  alreadyUploaded: boolean;
}) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.saved ?? blank(s)]))
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
    const problem = entryProblem(s, e);
    if (problem) {
      fail(s.id, problem);
      return;
    }
    setSavingId(s.id);
    startTransition(async () => {
      const res = await saveStudentRecitation({ halqaId, date, studentId: s.id, ...e });
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
          const saved = isSaved(s.id);
          const isOpen = open === s.id;
          const savedEntry = savedEntries[s.id];
          const summary = saved
            ? summaryOf(e)
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
                <span style={{ width: 9, height: 9, borderRadius: 99, flex: "none", background: saved ? "#6FBF8B" : "#E08A8A" }} />
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                  <span style={{ fontSize: 12.5, color: saved ? "var(--ink-2)" : "#E8A0A0" }}>
                    {summary}
                    {justSaved === s.id && saved ? " — تم الحفظ ✓" : ""}
                  </span>
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
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => set(s.id, { none: !e.none, noNew: false, noPast: false })}
                      style={{ ...chipStyle(e.none), minHeight: 40 }}
                    >
                      لم يسمّع اليوم
                    </button>
                    <button
                      type="button"
                      disabled={e.none}
                      onClick={() => set(s.id, { noNew: !e.noNew })}
                      style={{ ...chipStyle(e.noNew), minHeight: 40, opacity: e.none ? 0.45 : 1 }}
                    >
                      لم يسمّع جديدًا اليوم
                    </button>
                    <button
                      type="button"
                      disabled={e.none}
                      onClick={() => set(s.id, { noPast: !e.noPast })}
                      style={{ ...chipStyle(e.noPast), minHeight: 40, opacity: e.none ? 0.45 : 1 }}
                    >
                      لم يقرأ ماضي اليوم
                    </button>
                  </div>

                  {!e.none && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {(
                          [
                            { label: "تسميع جديد — من صفحة", key: "nf", off: e.noNew },
                            { label: "تسميع جديد — إلى صفحة", key: "nt", off: e.noNew },
                            { label: "ماضي — من صفحة", key: "rf", off: e.noPast },
                            { label: "ماضي — إلى صفحة", key: "rt", off: e.noPast },
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
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        تسميع جديد «من» مُلئ تلقائيًا بعد آخر صفحة سُمِّعت جديدًا — لا يجوز النزول تحتها. الماضي مراجعة حرّة، لأي صفحة سابقة
                        {s.lastPastTo ? ` (آخر ماضٍ وصل إلى صفحة ${s.lastPastTo})` : ""}. الصفحات بين {MIN_PAGE} و{MAX_PAGE}.
                      </div>

                      {!e.noNew && (
                        <div>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>تقدير التسميع الجديد</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {GRADES.map((g) => (
                              <button key={g} type="button" onClick={() => set(s.id, { gradeNew: g })} style={chipStyle(e.gradeNew === g)}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {!e.noPast && (
                        <div>
                          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>تقدير الماضي</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {GRADES.map((g) => (
                              <button key={g} type="button" onClick={() => set(s.id, { gradePast: g })} style={chipStyle(e.gradePast === g)}>
                                {g}
                              </button>
                            ))}
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
                        صفحات الجديد: {e.none || e.noNew ? 0 : span(e.nf, e.nt)}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                        صفحات الماضي: {e.none || e.noPast ? 0 : span(e.rf, e.rt)}
                      </span>
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
