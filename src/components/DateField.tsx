"use client";

import { inputStyle } from "@/lib/ui";

/** حقل تاريخ موحّد — نفس الشكل والسلوك في كل مكان بالموقع يُدخَل فيه تاريخ. */
export default function DateField({
  name,
  label,
  value,
  defaultValue,
  onChange,
  width = 170,
}: {
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  width?: number | string;
}) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>{label}</label>}
      <input
        type="date"
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        style={{ ...inputStyle(), width, textAlign: "center", direction: "ltr" }}
      />
    </div>
  );
}
