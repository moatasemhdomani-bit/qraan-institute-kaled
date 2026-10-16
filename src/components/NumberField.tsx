"use client";

import { InputHTMLAttributes } from "react";
import { inputStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  dim?: boolean;
  /** علامة السبر: يُسمح بفاصلة يتبعها 25 أو 5 أو 75 فقط (92.25 / 92.5 / 92.75) — لا فواصل غيرها */
  half?: boolean;
};

/** أرقام فقط، ومع half: فاصلة واحدة بعدها 25 أو 5 أو 75 (وما في طريقها أثناء الكتابة: 2، 7) */
function clean(v: string, half?: boolean): string {
  const w = toWesternDigits(v).replace(/[٫,]/g, ".");
  if (!half) return w.replace(/[^\d]/g, "");
  const [int, ...rest] = w.replace(/[^\d.]/g, "").split(".");
  if (rest.length === 0) return int;
  const dec = rest.join("");
  const ok = ["75", "25", "5", "7", "2"].find((d) => dec.startsWith(d)) ?? "";
  return `${int}.${ok}`;
}

/**
 * حقل رقم موحّد — نفس السلوك في كل مكان بالموقع يُدخَل فيه رقم (صفحات، علامات، ...).
 * نص بلوحة مفاتيح رقمية بدل input[type=number]، الذي يرفض الأرقام العربية (٠-٩) بصمت
 * على كثير من الأجهزة؛ هذا يحوّلها تلقائيًا بدل رفضها.
 */
export default function NumberField({ onChange, style, dim, half, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="text"
      inputMode={half ? "decimal" : "numeric"}
      onChange={(e) => {
        const digits = clean(e.target.value, half);
        if (digits !== e.target.value) e.target.value = digits;
        onChange?.(e);
      }}
      style={{ ...inputStyle(dim), textAlign: "center", direction: "ltr", ...style }}
    />
  );
}
