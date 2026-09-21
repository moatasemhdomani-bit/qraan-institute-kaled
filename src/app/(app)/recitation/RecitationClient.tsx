"use client";

import { useActionState, useEffect, useState } from "react";
import { uploadRecitation, type FormState } from "./actions";
import { GRADES, MIN_PAGE, MAX_PAGE } from "@/lib/daily";
import { chipStyle } from "@/lib/ui";
import NumberField from "@/components/NumberField";

const initialState: FormState = {};

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

function isDone(e: Entry): boolean {
  if (e.none) return true;
  if (e.noNew && e.noPast) return false;
  const ok = (v: string) => {
    const n = parseInt(v, 10);
    return n >= MIN_PAGE && n <= MAX_PAGE;
  };
  const newOk = e.noNew || (ok(e.nf) && ok(e.nt) && parseInt(e.nt, 10) >= parseInt(e.nf, 10) && !!e.gradeNew);
  const pastOk = e.noPast || (ok(e.rf) && ok(e.rt) && parseInt(e.rt, 10) >= parseInt(e.rf, 10) && !!e.gradePast);
  return newOk && pastOk;
}

export default function RecitationClient({
  halqaId,
  date,
  students,
  alreadyUploaded,
}: {
  halqaId: string;
  date: string;
  students: Student[];
  alreadyUploaded: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadRecitation, initialState);
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.saved ?? blank(s)]))
  );
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (state.focusStudentId) setOpen(state.focusStudentId);
  }, [state.focusStudentId]);

  const set = (id: string, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const missing = students.filter((s) => !isDone(entries[s.id]));
  const complete = missing.length === 0 && students.length > 0;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="halqaId" value={halqaId} />
      <input type="hidden" name="date" value={date} />
      {students.map((s) => {
        const e = entries[s.id];
        return (
          <div key={"h-" + s.id}>
            <input type="hidden" name={"none_" + s.id} value={e.none ? "1" : "0"} />
            <input type="hidden" name={"noNew_" + s.id} value={e.noNew ? "1" : "0"} />
            <input type="hidden" name={"noPast_" + s.id} value={e.noPast ? "1" : "0"} />
            <input type="hidden" name={"nf_" + s.id} value={e.nf} />
            <input type="hidden" name={"nt_" + s.id} value={e.nt} />
            <input type="hidden" name={"rf_" + s.id} value={e.rf} />
            <input type="hidden" name={"rt_" + s.id} value={e.rt} />
            <input type="hidden" name={"gn_" + s.id} value={e.gradeNew} />
            <input type="hidden" name={"gp_" + s.id} value={e.gradePast} />
          </div>
        );
      })}

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
          const done = isDone(e);
          const isOpen = open === s.id;

          const newPart = e.noNew ? "لم يسمّع جديدًا" : "تسميع جديد " + e.nf + "→" + e.nt + " (" + e.gradeNew + ")";
          const pastPart = e.noPast ? "لم يقرأ ماضي" : "ماضي " + e.rf + "→" + e.rt + " (" + e.gradePast + ")";
          const summary = e.none ? "لم يسمّع اليوم" : done ? newPart + " · " + pastPart : "لم يُسجّل بعد";

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
                    : done
                      ? "transparent"
                      : "linear-gradient(90deg, rgba(224,138,138,0.10), transparent 60%)",
                }}
              >
                <span
                  style={{ width: 9, height: 9, borderRadius: 99, flex: "none", background: done ? "#6FBF8B" : "#E08A8A" }}
                />
                <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{s.name}</span>
                  <span style={{ fontSize: 12.5, color: done ? "var(--ink-2)" : "#E8A0A0" }}>{summary}</span>
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
                      onClick={() => setOpen(students[idx + 1]?.id ?? null)}
                      style={{
                        marginInlineStart: "auto",
                        minHeight: 44,
                        padding: "10px 18px",
                        borderRadius: 10,
                        border: "1px solid var(--btn-border)",
                        background: "var(--btn-grad)",
                        color: "var(--on-accent)",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "var(--btn-shadow)",
                      }}
                    >
                      {students[idx + 1] ? "التالي" : "إغلاق"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {state.error && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--notice-line)",
            background: "var(--notice-soft)",
            fontSize: 13.5,
          }}
        >
          {state.error}
        </div>
      )}

      {(state.ok || (alreadyUploaded && !state.error)) && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(111,191,139,0.5)",
            background: "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))",
            fontSize: 13.5,
          }}
        >
          تسميع هذا اليوم مرفوع — ظهر لأولياء الأمور.
        </div>
      )}

      <button
        type="submit"
        disabled={pending || students.length === 0}
        onClick={(ev) => {
          if (!complete && missing[0]) {
            ev.preventDefault();
            setOpen(missing[0].id);
          }
        }}
        style={{
          width: "100%",
          minHeight: 48,
          padding: 12,
          borderRadius: 11,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          border: complete ? "1px solid var(--btn-border)" : "1px dashed var(--line)",
          background: complete ? "var(--btn-grad)" : "var(--btn-soft)",
          color: complete ? "var(--on-accent)" : "var(--ink-3)",
          boxShadow: complete ? "var(--btn-shadow)" : undefined,
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "جارٍ الرفع…" : complete ? "رفع التسميع" : "رفع التسميع (" + missing.length + " ناقص)"}
      </button>
    </form>
  );
}
