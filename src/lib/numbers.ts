/** يحوّل الأرقام العربية (٠-٩) والفارسية (۰-۹) إلى أرقام غربية — الأساس المشترك لأي إدخال رقم في الموقع. */
export function toWesternDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** علامة السبر: عدد صحيح أو بربع درجة (92، 92.25، 92.5، 92.75) — null للفارغ، NaN لغير الصالح */
export function parseHalfMark(raw: string): number | null {
  const s = toWesternDigits(raw).trim().replace(/[٫,]/g, ".");
  if (!s) return null;
  if (!/^\d+(\.(25|5|50|75|0)?)?$/.test(s)) return NaN;
  return Number(s);
}

/** رقم ولي الأمر 2: أرقام فقط، و«+» في أوله وحده إن وُجدت */
export function cleanPhone2(raw: string): string {
  const w = toWesternDigits(raw).trim();
  return (w.startsWith("+") ? "+" : "") + w.replace(/\D/g, "");
}

/** عدد صحيح أو بربع درجة (.25 / .5 / .75) */
export const isHalfStep = (n: number) => Number.isFinite(n) && Number.isInteger(n * 4);
