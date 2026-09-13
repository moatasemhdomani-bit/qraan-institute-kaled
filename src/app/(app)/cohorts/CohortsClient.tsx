"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import { updateCohortTiming, addTeacherToCohort, removeTeacherFromCohort, type FormState } from "./actions";
import { chipStyle, inputStyle, cardStyle } from "@/lib/ui";

type Cohort = {
  id: string;
  name: string;
  isRotating: boolean;
  time1: string;
  time2: string;
  cycle: string;
  teachers: { id: string; name: string }[];
};

const initialState: FormState = {};

export default function CohortsClient({ cohorts, allTeachers }: { cohorts: Cohort[]; allTeachers: { id: string; name: string }[] }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {cohorts.map((c) => (
          <CohortCard key={c.id} cohort={c} allTeachers={allTeachers} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>الأفواج الخمسة ثابتة الأسماء: لا تُضاف ولا تُحذف — يُحدَّد توقيتها فقط.</div>
    </>
  );
}

function CohortCard({ cohort, allTeachers }: { cohort: Cohort; allTeachers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(updateCohortTiming, initialState);
  const [cycle, setCycle] = useState(cohort.cycle);
  const [pickTeacher, setPickTeacher] = useState("");
  const [, startTransition] = useTransition();
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1800);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  const availableTeachers = allTeachers.filter((t) => !cohort.teachers.some((ct) => ct.id === t.id));

  return (
    <div style={{ ...cardStyle, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{cohort.name}</div>
        <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, border: "1px solid var(--line)", background: "var(--chip)", color: "var(--ink-2)" }}>
          {cohort.isRotating ? "قلّاب" : "ثابت"}
        </span>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="hidden" name="id" value={cohort.id} />
        <input type="hidden" name="cycle" value={cohort.isRotating ? cycle : ""} />
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>
            {cohort.isRotating ? "وقتان يتبادلان دوريًا" : "وقت واحد يُحدَّد ولا يتغيّر"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input name="time1" defaultValue={cohort.time1} placeholder="مثال 08:30" style={{ ...inputStyle(), flex: 1, minWidth: 0, textAlign: "center" }} />
            {cohort.isRotating && (
              <input name="time2" defaultValue={cohort.time2} placeholder="مثال 16:00" style={{ ...inputStyle(), flex: 1, minWidth: 0, textAlign: "center" }} />
            )}
          </div>
        </div>

        {cohort.isRotating && (
          <div style={{ display: "flex", gap: 6 }}>
            {["أسبوعي", "نصف شهري"].map((cy) => (
              <button key={cy} type="button" onClick={() => setCycle(cy)} style={chipStyle(cycle === cy)}>
                {cy}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="submit"
            disabled={pending}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer", opacity: pending ? 0.7 : 1 }}
          >
            {pending ? "جارٍ الحفظ…" : "حفظ التوقيت"}
          </button>
          {savedFlash && <span style={{ fontSize: 12, color: "var(--ink-2)" }}>تم الحفظ ✓</span>}
          {state.error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{state.error}</span>}
        </div>
      </form>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>المدرّسون المُسندون</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {cohort.teachers.map((t) => (
            <span
              key={t.id}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 6px 5px 11px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}
            >
              {t.name}
              <button
                type="button"
                onClick={() => startTransition(() => removeTeacherFromCohort(cohort.id, t.id))}
                style={{ background: "transparent", border: 0, color: "var(--ink-3)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
                title="إزالة الإسناد"
              >
                ×
              </button>
            </span>
          ))}

          {availableTeachers.length > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <select
                value={pickTeacher}
                onChange={(e) => setPickTeacher(e.target.value)}
                style={{ padding: "5px 8px", borderRadius: 999, border: "1px dashed var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12 }}
              >
                <option value="">اختر مدرّسًا</option>
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!pickTeacher}
                onClick={() => {
                  if (!pickTeacher) return;
                  startTransition(() => addTeacherToCohort(cohort.id, pickTeacher));
                  setPickTeacher("");
                }}
                style={{ padding: "5px 11px", borderRadius: 999, background: "transparent", border: "1px dashed var(--line)", color: "var(--ink-2)", fontSize: 12, cursor: pickTeacher ? "pointer" : "not-allowed" }}
              >
                + إسناد
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
