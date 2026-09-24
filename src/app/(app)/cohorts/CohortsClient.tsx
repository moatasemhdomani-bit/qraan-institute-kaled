"use client";

import { useCallback, useEffect, useState, useActionState, useTransition } from "react";
import { updateCohortTiming, addTeacherToCohort, removeTeacherFromCohort, type FormState } from "./actions";
import { cardStyle, primaryButtonStyle } from "@/lib/ui";
import TimeField from "@/components/TimeField";
import DateField from "@/components/DateField";
import Select from "@/components/Select";
import CohortForm, { DeleteCohortButton } from "./CohortForm";

type Cohort = {
  id: string;
  name: string;
  isRotating: boolean;
  time1Start: string;
  time1End: string;
  time2Start: string;
  time2End: string;
  rotationStart: string;
  halaqatCount: number;
  teachers: { id: string; name: string }[];
};

const initialState: FormState = {};

/** «من» ثم الوقت في سطر، و«إلى» ثم الوقت في السطر التالي. */
function TimeRange({ startName, endName, start, end }: { startName: string; endName: string; start: string; end: string }) {
  const label: React.CSSProperties = { width: 28, flex: "none", color: "var(--ink-2)", fontSize: 13 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={label}>من</span>
        <TimeField name={startName} defaultValue={start} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={label}>إلى</span>
        <TimeField name={endName} defaultValue={end} />
      </div>
    </div>
  );
}

export default function CohortsClient({ cohorts, allTeachers }: { cohorts: Cohort[]; allTeachers: { id: string; name: string }[] }) {
  const [adding, setAdding] = useState(false);
  const closeAdding = useCallback(() => setAdding(false), []);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setAdding(true)} style={primaryButtonStyle}>
          + إضافة فوج
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {cohorts.map((c) => (
          <CohortCard key={c.id} cohort={c} allTeachers={allTeachers} />
        ))}
      </div>
      {adding && <CohortForm onClose={closeAdding} />}
    </>
  );
}

function CohortCard({ cohort, allTeachers }: { cohort: Cohort; allTeachers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(updateCohortTiming, initialState);
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{cohort.name}</div>
        <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, border: "1px solid var(--line)", background: "var(--chip)", color: "var(--ink-2)" }}>
          {cohort.isRotating ? "قلّاب" : "ثابت"}
        </span>
        <div style={{ marginInlineStart: "auto" }}>
          <DeleteCohortButton id={cohort.id} name={cohort.name} halaqatCount={cohort.halaqatCount} />
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="hidden" name="id" value={cohort.id} />
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>
            {cohort.isRotating ? "الوقت الأول — بداية ونهاية" : "وقت الدوام — بداية ونهاية"}
          </div>
          <TimeRange startName="time1Start" endName="time1End" start={cohort.time1Start} end={cohort.time1End} />
        </div>

        {cohort.isRotating && (
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>الوقت الثاني — بداية ونهاية (يتبادل مع الأول أسبوعًا بأسبوع)</div>
            <TimeRange startName="time2Start" endName="time2End" start={cohort.time2Start} end={cohort.time2End} />
          </div>
        )}

        {cohort.isRotating && (
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>
              تاريخ بداية التناوب — منه يعرف النظام أي وقت دوام هذا الأسبوع
            </div>
            <DateField name="rotationStart" defaultValue={cohort.rotationStart} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer", opacity: pending ? 0.7 : 1 }}
          >
            {pending ? "جارٍ الحفظ…" : "حفظ التوقيت"}
          </button>
          {savedFlash && <span style={{ fontSize: 12, color: "var(--ink-2)" }}>تم الحفظ ✓</span>}
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
              <Select
                value={pickTeacher}
                onChange={setPickTeacher}
                options={availableTeachers.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="اختر مدرّسًا"
                width={150}
              />
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
