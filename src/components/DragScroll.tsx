"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** الشاشات التي يبقى فيها تحديد النص متاحًا: بيانات الطلاب والموظفين */
const SELECTABLE = ["/students", "/users"];

/** أقرب عنصر يتمرّر في الاتجاه المطلوب — وإلا الصفحة نفسها */
function scrollerFor(el: Element | null, horizontal: boolean): Element {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const st = getComputedStyle(n);
    const ov = horizontal ? st.overflowX : st.overflowY;
    const can = horizontal ? n.scrollWidth > n.clientWidth : n.scrollHeight > n.clientHeight;
    if (can && (ov === "auto" || ov === "scroll")) return n;
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * لا تحديد للنص في الموقع (عدا خانات الكتابة وشاشتي بيانات الطلاب والموظفين):
 * الضغط بالماوس والسحب يحرّك الشاشة — أفقيًا داخل الجداول العريضة، وعموديًا للصفحة.
 */
export default function DragScroll() {
  const pathname = usePathname();
  const selectable = SELECTABLE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    const html = document.documentElement;
    if (selectable) {
      html.removeAttribute("data-noselect");
      return;
    }
    html.setAttribute("data-noselect", "");

    let start: { x: number; y: number; target: Element } | null = null;
    let moved = false;
    let last = { x: 0, y: 0 };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as Element;
      // خانات الكتابة والقوائم والمنزلقات تعمل كما هي
      if (t.closest("input, textarea, select, [contenteditable], [data-allow-select], [role='slider']")) return;
      start = { x: e.clientX, y: e.clientY, target: t };
      last = { x: e.clientX, y: e.clientY };
      moved = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!start || !(e.buttons & 1)) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (!moved && Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) < 6) return;
      moved = true;
      if (dx) scrollerFor(start.target, true).scrollBy({ left: -dx });
      if (dy) scrollerFor(start.target, false).scrollBy({ top: -dy });
      last = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    const onUp = () => {
      start = null;
    };
    // بعد السحب لا يُحسب الإفلات نقرة على زر أو رابط
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    // لا سحب للصور والروابط كملفات
    const onDragStart = (e: DragEvent) => {
      if (!(e.target as Element).closest?.("[draggable='true']")) e.preventDefault();
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("click", onClick, true);
    window.addEventListener("dragstart", onDragStart);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("dragstart", onDragStart);
      html.removeAttribute("data-noselect");
    };
  }, [selectable]);

  return null;
}
