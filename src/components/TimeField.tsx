"use client";

import { useState } from "react";
import { chipStyle } from "@/lib/ui";
import { padTime } from "@/lib/daily";
import Select from "./Select";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** «HH:MM» (24 ساعة) ← ساعة 1–12 ودقائق وصباحًا/مساءً. */
function split(t: string | undefined): { h: string; m: string; pm: boolean } {
  const v = padTime(t ?? "");
  const match = /^(\d{2}):(\d{2})$/.exec(v);
  if (!match) return { h: "", m: "", pm: false };
  const h24 = Number(match[1]);
  return { h: String(h24 % 12 === 0 ? 12 : h24 % 12), m: match[2], pm: h24 >= 12 };
}

/** ساعة 1–12 ودقائق وصباحًا/مساءً ← «HH:MM» (24 ساعة) كما يُخزَّن. */
function join(h: string, m: string, pm: boolean): string {
  if (!h || !m) return "";
  const h24 = (Number(h) % 12) + (pm ? 12 : 0);
  return `${String(h24).padStart(2, "0")}:${m}`;
}

/**
 * حقل وقت موحّد بنظام 12 ساعة — ساعة ودقائق وصباحًا/مساءً — في كل مكان يُدخَل فيه وقت (الإذن، توقيت الأفواج…).
 * القيمة نفسها تبقى بصيغة 24 ساعة (HH:MM) في النموذج والتخزين.
 */
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
  const [parts, setParts] = useState(() => split(value ?? defaultValue));
  const update = (next: Partial<typeof parts>) => {
    const p = { ...parts, ...next };
    setParts(p);
    const v = join(p.h, p.m, p.pm);
    if (v) onChange?.(v);
  };
  // دقائق قديمة خارج خطوات الخمس دقائق تبقى خيارًا كي لا تضيع
  const minutes = parts.m && !MINUTES.includes(parts.m) ? [parts.m, ...MINUTES] : MINUTES;

  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>{label}</label>}
      {name && <input type="hidden" name={name} value={join(parts.h, parts.m, parts.pm)} />}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 62, flex: "none" }}>
          <Select value={parts.h} onChange={(h) => update({ h, m: parts.m || "00" })} options={HOURS.map((h) => ({ value: h, label: h }))} placeholder="س" />
        </div>
        <span style={{ color: "var(--ink-3)" }}>:</span>
        <div style={{ width: 62, flex: "none" }}>
          <Select value={parts.m} onChange={(m) => update({ m })} options={minutes.map((m) => ({ value: m, label: m }))} placeholder="د" />
        </div>
        {/* صباحًا/مساءً: زرّان صغيران (ص / م) كي يتّسع الحقل في البطاقات الضيقة */}
        <span style={{ display: "inline-flex", gap: 3, flex: "none" }}>
          <button type="button" onClick={() => update({ pm: false })} style={{ ...chipStyle(!parts.pm), padding: "6px 9px", fontSize: 12 }}>
            ص
          </button>
          <button type="button" onClick={() => update({ pm: true })} style={{ ...chipStyle(parts.pm), padding: "6px 9px", fontSize: 12 }}>
            م
          </button>
        </span>
      </div>
    </div>
  );
}
