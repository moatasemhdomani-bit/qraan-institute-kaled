"use client";

import { inputStyle } from "@/lib/ui";

/** حقل وقت موحّد — نفس الشكل والسلوك في كل مكان بالموقع يُدخَل فيه وقت (الإذن، توقيت الأفواج، ...). */
export default function TimeField({
  name,
  label,
  value,
  defaultValue,
  onChange,
}: {
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>{label}</label>}
      <input
        type="time"
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        style={{ ...inputStyle(), width: 150, minHeight: 46, fontSize: 16, textAlign: "center", direction: "ltr" }}
      />
    </div>
  );
}
