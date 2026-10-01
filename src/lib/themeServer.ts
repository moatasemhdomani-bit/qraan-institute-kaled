import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, NAV_COOKIE, type ThemeId } from "./theme";

/** وضع العرض المحفوظ لهذا الجهاز — الداكن افتراضيًا. */
export async function getTheme(): Promise<ThemeId> {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

/** هل قائمة الشاشات مطويّة على هذا الجهاز (زر ☰)؟ */
export async function isNavCollapsed(): Promise<boolean> {
  return (await cookies()).get(NAV_COOKIE)?.value === "collapsed";
}
