export type ThemeId = "dark" | "light";

/** اسم ملف التعريف (cookie) الذي يحفظ وضع العرض المختار على هذا الجهاز. */
export const THEME_COOKIE = "theme";

/** لون شريط المتصفح على الجوال لكل وضع عرض. */
export const THEME_BAR_COLOR: Record<ThemeId, string> = { dark: "#0a192f", light: "#f5f0e4" };

export function parseTheme(value: string | undefined): ThemeId {
  return value === "light" ? "light" : "dark";
}

/** اسم ملف التعريف الذي يحفظ طيّ قائمة الشاشات (زر ☰) على هذا الجهاز. */
export const NAV_COOKIE = "nav";
