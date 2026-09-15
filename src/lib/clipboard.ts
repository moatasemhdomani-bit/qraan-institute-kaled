/**
 * ينسخ نصًا إلى الحافظة. يجرّب Clipboard API أولًا، ويرجع لطريقة
 * execCommand القديمة إن رفضها المتصفح (بعض المتصفحات القديمة، أو سياقات معيّنة).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback below
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
