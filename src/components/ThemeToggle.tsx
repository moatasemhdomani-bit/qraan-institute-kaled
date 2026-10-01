"use client";

import { useState, type CSSProperties } from "react";
import { THEME_BAR_COLOR, THEME_COOKIE, type ThemeId } from "@/lib/theme";

/**
 * زر التبديل بين العرض الداكن والفاتح. يُحفظ الاختيار في ملف تعريف (cookie) لسنة على هذا الجهاز،
 * فيقرؤه الخادم ويرسم الصفحة باللون الصحيح من أول لحظة (بلا ومضة باللون الآخر).
 */
export default function ThemeToggle({ initial, compact = false, style }: { initial: ThemeId; compact?: boolean; style?: CSSProperties }) {
  const [theme, setTheme] = useState<ThemeId>(initial);

  function toggle() {
    const next: ThemeId = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BAR_COLOR[next]);
    setTheme(next);
  }

  const label = theme === "dark" ? "العرض الفاتح" : "العرض الداكن";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      style={{
        width: "100%",
        padding: compact ? "6px 4px" : 7,
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "transparent",
        color: compact ? "var(--ink-3)" : "var(--ink-2)",
        fontSize: compact ? 10 : 12,
        fontFamily: "inherit",
        cursor: "pointer",
        ...style,
      }}
    >
      {theme === "dark" ? "☀ فاتح" : "☾ داكن"}
    </button>
  );
}
