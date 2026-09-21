/** يحوّل الأرقام العربية (٠-٩) والفارسية (۰-۹) إلى أرقام غربية — الأساس المشترك لأي إدخال رقم في الموقع. */
export function toWesternDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
