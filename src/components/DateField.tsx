"use client";

import { useRef, useState } from "react";
import { inputStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";

/** "YYYY-MM-DD" (صيغة التخزين) ← "YYYY/MM/DD" (صيغة العرض والإدخال). */
function toSlash(iso: string | undefined): string {
  return iso ? iso.replace(/-/g, "/") : "";
}

/** "YYYY/MM/DD" كاملة وصحيحة ← "YYYY-MM-DD"، وإلا "". */
function toIso(text: string): string {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(text);
  if (!m) return "";
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  const valid = date.getFullYear() === Number(y) && date.getMonth() === Number(mo) - 1 && date.getDate() === Number(d);
  return valid ? `${y}-${mo}-${d}` : "";
}

/** يرتّب الأرقام المكتوبة تلقائيًا على شكل YYYY/MM/DD أثناء الكتابة. */
function maskDate(raw: string): string {
  const d = toWesternDigits(raw).replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join("/");
}

/**
 * حقل تاريخ موحّد بصيغة yyyy/mm/dd (الشهر دومًا في الوسط) — كتابةً أو من التقويم.
 * حقل التاريخ الأصلي في المتصفح يفرض صيغة الجهاز (غالبًا mm/dd/yyyy)، فيُستعمل هنا للتقويم فقط.
 * القيمة المُرسلة والمُعادة عبر onChange تبقى YYYY-MM-DD كما تُخزَّن.
 */
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
  const [text, setText] = useState(toSlash(value ?? defaultValue));
  const [prevValue, setPrevValue] = useState(value);
  const pickerRef = useRef<HTMLInputElement>(null);

  // قيمة يتحكم بها الأب وتغيّرت من خارج الحقل (مثل إعادة تعيين) — تُعكس في النص المعروض
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== undefined && value !== toIso(text)) setText(toSlash(value));
  }

  const iso = toIso(text);
  const incomplete = text.length > 0 && !iso;

  function update(nextText: string) {
    setText(nextText);
    const nextIso = toIso(nextText);
    if (onChange && (nextIso || nextText === "")) onChange(nextIso);
  }

  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>{label}</label>}
      <div style={{ position: "relative", width }}>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder="yyyy/mm/dd"
          value={text}
          onChange={(e) => update(maskDate(e.target.value))}
          style={{
            ...inputStyle(),
            width: "100%",
            textAlign: "center",
            paddingLeft: 38,
            borderColor: incomplete ? "var(--notice-line)" : undefined,
          }}
        />
        <button
          type="button"
          aria-label="اختيار من التقويم"
          onClick={() => {
            const p = pickerRef.current;
            if (!p) return;
            try {
              p.showPicker();
            } catch {
              p.focus();
            }
          }}
          style={{
            position: "absolute",
            left: 6,
            top: "50%",
            transform: "translateY(-50%)",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: 0,
            borderRadius: 7,
            background: "transparent",
            color: "var(--ink-2)",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
        {/* التقويم الأصلي مخفي بصريًا — يُفتح بزر التقويم فقط، واختياره يُكتب بصيغة yyyy/mm/dd */}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={iso}
          onChange={(e) => update(toSlash(e.target.value))}
          style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 1, opacity: 0, pointerEvents: "none", border: 0, padding: 0 }}
        />
        {name && <input type="hidden" name={name} value={iso} />}
      </div>
    </div>
  );
}
