"use client";

import { useId, useRef, useState } from "react";
import { inputStyle } from "@/lib/ui";
import { copyToClipboard } from "@/lib/clipboard";

/** حقل كلمة مرور بزرَّي إظهار/إخفاء ونسخ — يُستعمل في تسجيل الدخول وفي إنشاء حساب عامل جديد. */
export default function PasswordField({
  label,
  name,
  autoComplete,
  placeholder,
}: {
  label?: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function handleCopy() {
    const value = inputRef.current?.value ?? "";
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const btnStyle = {
    padding: "5px 10px",
    borderRadius: 7,
    border: "1px solid var(--line)",
    background: "var(--btn-soft)",
    color: "var(--ink-2)",
    fontSize: 11.5,
    cursor: "pointer",
  } as const;

  return (
    <div>
      {label && (
        <label htmlFor={id} style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          style={{ ...inputStyle(), paddingInlineEnd: 116 }}
        />
        <div style={{ position: "absolute", insetInlineEnd: 6, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4 }}>
          <button type="button" onClick={handleCopy} aria-label="نسخ كلمة المرور" style={btnStyle}>
            {copied ? "نُسخت ✓" : "نسخ"}
          </button>
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            style={btnStyle}
          >
            {shown ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </div>
    </div>
  );
}
