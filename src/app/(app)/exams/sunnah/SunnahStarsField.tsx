"use client";

import { chipStyle } from "@/lib/ui";
import { SUNNAH_STARS_MIN, SUNNAH_STARS_MAX, clampSunnahStars } from "@/lib/sunnah";

/**
 * نجوم مختبر الحديث: − / + ضمن المجال −2 … 10. يقترح النموذج قيمة تلقائية (نجاح +3، إعادة −1)
 * ويعدّلها المختبِر بحرية. الرصيد صفر يُعفى من السحب.
 */
export default function SunnahStarsField({
  value,
  onChange,
  balance,
  notices,
}: {
  value: number;
  onChange: (n: number) => void;
  /** رصيد الطالب الحالي */
  balance: number;
  /** تنبيهات للمختبِر فوق الحقل */
  notices?: (string | null | false | undefined)[];
}) {
  const tone = value > 0 ? "var(--ok)" : value < 0 ? "var(--bad)" : "var(--ink-2)";
  const shown = (notices ?? []).filter(Boolean) as string[];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {shown.map((n) => (
        <div key={n} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13, fontWeight: 600 }}>
          ★ {n}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>النجوم</span>
        <button type="button" onClick={() => onChange(clampSunnahStars(value - 1))} disabled={value <= SUNNAH_STARS_MIN} style={{ ...chipStyle(false), padding: "6px 14px", fontSize: 16 }}>
          −
        </button>
        <span style={{ minWidth: 56, textAlign: "center", fontSize: 18, fontWeight: 800, color: tone, fontVariantNumeric: "tabular-nums" }}>
          {value > 0 ? `+${value}` : value} ★
        </span>
        <button type="button" onClick={() => onChange(clampSunnahStars(value + 1))} disabled={value >= SUNNAH_STARS_MAX} style={{ ...chipStyle(false), padding: "6px 14px", fontSize: 16 }}>
          +
        </button>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
          رصيد الطالب ★ {balance} · من {SUNNAH_STARS_MIN} إلى {SUNNAH_STARS_MAX}
        </span>
      </div>
      {value < 0 && balance === 0 && <div style={{ fontSize: 12, color: "var(--ink-3)" }}>رصيد الطالب صفر — يُعفى من السحب.</div>}
    </div>
  );
}
