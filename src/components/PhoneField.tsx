"use client";

import { useState } from "react";
import { inputStyle } from "@/lib/ui";
import { formatMobile } from "@/lib/phone";

/** حقل رقم جوال موحّد — يُنسَّق تلقائيًا بصيغة 09XX XXX XXX ويقبل الأرقام العربية والإنجليزية. */
export default function PhoneField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const [value, setValue] = useState(formatMobile(defaultValue));
  const digits = value.replace(/\D/g, "");
  const invalid = digits.length > 0 && (digits.length < 10 || !digits.startsWith("09"));

  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: "var(--bad)" }}> *</span>}
      </label>
      <input
        name={name}
        type="text"
        inputMode="tel"
        dir="ltr"
        value={value}
        onChange={(e) => setValue(formatMobile(e.target.value))}
        placeholder="09XX XXX XXX"
        required={required}
        style={{ ...inputStyle(), textAlign: "left", letterSpacing: "0.04em" }}
      />
      {invalid && <div style={{ fontSize: 11.5, color: "var(--bad)", marginTop: 4 }}>الصيغة: 10 أرقام تبدأ بـ 09 — مثل 0912 345 678</div>}
    </div>
  );
}
