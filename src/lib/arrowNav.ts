import type { KeyboardEvent } from "react";

const FIELDS = "input:not([type=hidden]):not([type=date]):not([type=checkbox]):not([type=radio]):not([type=file]):not([disabled]):not([readonly]), textarea:not([disabled])";

type Dir = "up" | "down" | "left" | "right";

/**
 * التنقّل بأسهم لوحة المفاتيح بين خانات النموذج (كجدول إكسل): ↑ ↓ إلى الخانة فوق/تحت،
 * و← → إلى الخانة بجانبها متى كان المؤشر عند طرف النص (فيبقى تحريك المؤشر داخل الكلمة كما هو).
 * يوضع على حاوية النموذج: onKeyDown={arrowNav}
 */
export function arrowNav(e: KeyboardEvent<HTMLElement>) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const dir: Dir | null =
    e.key === "ArrowDown" ? "down" : e.key === "ArrowUp" ? "up" : e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : null;
  if (!dir) return;
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (!el.matches?.(FIELDS)) return;

  const len = el.value.length;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start == null || end == null) return;
  const rtl = getComputedStyle(el).direction === "rtl";
  // اليسار في الكتابة العربية = آخر النص، واليمين = أوله
  const atEndSide = (d: Dir) => ((d === "left") === rtl ? start === len && end === len : start === 0 && end === 0);
  if (dir === "left" || dir === "right") {
    if (!atEndSide(dir)) return;
  } else if (el instanceof HTMLTextAreaElement) {
    // الخانة متعددة الأسطر: ↑ ↓ تتنقّل بين أسطرها، ولا تخرج إلا من السطر الأول/الأخير
    if (dir === "up" && el.value.slice(0, start).includes("\n")) return;
    if (dir === "down" && el.value.slice(end).includes("\n")) return;
  }

  const cur = el.getBoundingClientRect();
  const cx = cur.left + cur.width / 2;
  const cy = cur.top + cur.height / 2;
  const others = [...e.currentTarget.querySelectorAll<HTMLElement>(FIELDS)]
    .filter((f) => f !== el && f.offsetParent !== null)
    .map((f) => ({ f, r: f.getBoundingClientRect() }));

  let pick: HTMLElement | null = null;
  if (dir === "down" || dir === "up") {
    const cand = others.filter(({ r }) => (dir === "down" ? r.top >= cur.bottom - 2 : r.bottom <= cur.top + 2));
    if (cand.length) {
      // أقرب صف، ثم الأقرب أفقيًا فيه
      const rowEdge = dir === "down" ? Math.min(...cand.map(({ r }) => r.top)) : Math.max(...cand.map(({ r }) => r.bottom));
      const row = cand.filter(({ r }) => (dir === "down" ? r.top <= rowEdge + 12 : r.bottom >= rowEdge - 12));
      row.sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx));
      pick = row[0].f;
    }
  } else {
    // في الصف نفسه، الأقرب في الاتجاه المطلوب
    const cand = others.filter(({ r }) => Math.abs(r.top + r.height / 2 - cy) < Math.max(cur.height, r.height) / 2 && (dir === "left" ? r.right <= cur.left + 2 : r.left >= cur.right - 2));
    cand.sort((a, b) => Math.abs(a.r.left + a.r.width / 2 - cx) - Math.abs(b.r.left + b.r.width / 2 - cx));
    pick = cand[0]?.f ?? null;
  }
  if (!pick) return;
  e.preventDefault();
  pick.focus();
  if (pick instanceof HTMLInputElement || pick instanceof HTMLTextAreaElement) {
    try {
      const n = pick.value.length;
      pick.setSelectionRange(n, n);
    } catch {
      /* خانات لا تدعم تحديد المؤشر */
    }
  }
}
