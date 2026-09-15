"use client";

import { useActionState, useState } from "react";
import { saveEvalSettings, type SettingsState } from "./actions";
import { cardStyle, chipStyle, primaryButtonStyle } from "@/lib/ui";
import { EVAL_MODES, EVAL_MODE_LABELS, type EvalModeId } from "@/lib/exam";

const initialState: SettingsState = {};

export default function EvalSettingsClient({
  placementMode: initialPlacement,
  awqafMode: initialAwqaf,
}: {
  placementMode: EvalModeId;
  awqafMode: EvalModeId;
}) {
  const [state, formAction, pending] = useActionState(saveEvalSettings, initialState);
  const [placementMode, setPlacementMode] = useState(initialPlacement);
  const [awqafMode, setAwqafMode] = useState(initialAwqaf);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="placementMode" value={placementMode} />
      <input type="hidden" name="awqafMode" value={awqafMode} />

      {state.error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error}
        </div>
      )}

      <SettingCard title="تحديد مستوى" note="شكل النتيجة الإضافية إلى جانب الجزء الذي يبدأ منه الطالب." value={placementMode} onChange={setPlacementMode} />
      <SettingCard title="ترشيح الأوقاف" note="نجاحه يتيح الطالب لسبر الأوقاف الفعلي في المرحلة 4." value={awqafMode} onChange={setAwqafMode} />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
          {pending ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        {state.ok && <span style={{ fontSize: 13, color: "#8FD3A8" }}>تم الحفظ ✓</span>}
      </div>

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        سبر محلي علامته محسوبة تلقائيًا دومًا — لا يظهر هنا. هذا إعداد عام يُضبط مرة، لا نموذج يتكرر مع كل سبر.
      </div>
    </form>
  );
}

function SettingCard({
  title,
  note,
  value,
  onChange,
}: {
  title: string;
  note: string;
  value: EvalModeId;
  onChange: (v: EvalModeId) => void;
}) {
  return (
    <div style={{ ...cardStyle, padding: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 12 }}>{note}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {EVAL_MODES.map((m) => (
          <button key={m} type="button" onClick={() => onChange(m)} style={{ ...chipStyle(value === m), minHeight: 42 }}>
            {EVAL_MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
