"use client";

import { InputHTMLAttributes } from "react";
import { inputStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { dim?: boolean };

/**
 * حقل رقم موحّد — نفس السلوك في كل مكان بالموقع يُدخَل فيه رقم (صفحات، علامات، ...).
 * نص بلوحة مفاتيح رقمية بدل input[type=number]، الذي يرفض الأرقام العربية (٠-٩) بصمت
 * على كثير من الأجهزة؛ هذا يحوّلها تلقائيًا بدل رفضها.
 */
export default function NumberField({ onChange, style, dim, ...rest }: Props) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      onChange={
        onChange
          ? (e) => {
              const digits = toWesternDigits(e.target.value).replace(/[^\d]/g, "");
              if (digits !== e.target.value) e.target.value = digits;
              onChange(e);
            }
          : undefined
      }
      style={{ ...inputStyle(dim), textAlign: "center", direction: "ltr", ...style }}
    />
  );
}
