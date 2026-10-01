"use client";

import { useState } from "react";
import { NAV_COOKIE } from "@/lib/theme";

/**
 * زر ☰ أعلى يمين الشاشة: يسحب قائمة أسماء الشاشات إلى أقصى اليمين فتتسع الشاشة، ويعيدها عند النقر ثانية.
 * يُحفظ الاختيار على هذا الجهاز ويقرؤه الخادم، فتُفتح الصفحات التالية بالحالة نفسها بلا وميض.
 */
export default function NavToggle({ initialCollapsed }: { initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    document.querySelector(".app-shell")?.classList.toggle("nav-collapsed", next);
    document.cookie = `${NAV_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
    setCollapsed(next);
  }

  const label = collapsed ? "إظهار قائمة الشاشات" : "إخفاء قائمة الشاشات";
  return (
    <button type="button" className="nav-toggle" onClick={toggle} title={label} aria-label={label} aria-expanded={!collapsed}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
  );
}
