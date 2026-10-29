"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { stretchWithKashida } from "@/lib/kashida";
import { usePathname } from "next/navigation";
import { logout } from "./actions";
import type { RoleId } from "@/lib/ui";
import { navItemsFor, activeNavId } from "./nav";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";
import type { ThemeId } from "@/lib/theme";
import type { TrackId } from "@/lib/track";

export default function Sidebar({
  role,
  name,
  roleLabel,
  track,
  theme,
}: {
  role: RoleId;
  name: string;
  roleLabel: string;
  track?: TrackId;
  theme: ThemeId;
}) {
  const pathname = usePathname();
  const items = navItemsFor(role, track);
  const activeId = activeNavId(pathname, items);

  // أسماء الشاشات تنتهي كلها عند الحافة نفسها: كل اسم يُطال بالتطويل «ـ» حتى عرض أطول اسم
  const navRef = useRef<HTMLElement>(null);
  const [stretched, setStretched] = useState<Record<string, string>>({});
  const labelsKey = items.map((n) => n.id).join(",");
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      const el = navRef.current;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!alive || !el || !ctx) return;
      const family = getComputedStyle(el).fontFamily;
      const measure = (weight: number) => (t: string) => {
        ctx.font = `${weight} 16px ${family}`;
        return ctx.measureText(t).width;
      };
      const target = Math.max(...items.map((n) => measure(700)(n.label)));
      const out: Record<string, string> = {};
      for (const n of items) for (const w of [400, 700]) out[`${n.id}|${w}`] = stretchWithKashida(n.label, target, measure(w));
      setStretched(out);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsKey]);

  return (
    <aside
      className="app-sidebar"
      style={{
        borderInlineStart: "1px solid var(--line)",
        background: "var(--card-2-grad)",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "var(--full-h)",
        overflow: "hidden",
      }}
    >
      {/* اسم المعهد وشعاره ثابتان أعلى الشريط — يتحرك تحتهما القسم السفلي وحده */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "20px 64px 14px 20px", borderBottom: "1px solid var(--line-2)" }}>
        <img src="/logo-mark.png" alt="شعار المعهد" width={48} height={34} style={{ display: "block", flex: "none", objectFit: "contain" }} />
        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.35 }}>
          معهد الصحابي الجليل
          <br />
          <strong style={{ color: "var(--ink)", fontWeight: 600 }}>خالد بن الوليد</strong>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 14px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
      <nav ref={navRef} style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--font-titles)" }}>
        {items.map((n) => {
          const on = n.id === activeId;
          return (
            <Link
              key={n.id}
              href={n.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                textAlign: "start",
                padding: "9px 11px",
                borderRadius: 10,
                fontSize: 16,
                fontFamily: "var(--font-titles)",
                border: on ? "1px solid var(--accent-line)" : "1px solid transparent",
                background: on ? "var(--chip)" : "transparent",
                color: on ? "var(--ink)" : "var(--ink-2)",
                fontWeight: on ? 700 : 400,
              }}
            >
              <span
                style={{
                  width: 3,
                  height: 15,
                  borderRadius: 99,
                  flex: "none",
                  background: on ? "var(--btn-grad)" : "transparent",
                }}
              />
              <span style={{ whiteSpace: "nowrap" }}>{stretched[`${n.id}|${on ? 700 : 400}`] ?? n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          padding: 12,
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--card-grad)",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>الحساب الحالي</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{role === "GUARDIAN" ? name : `أ. ${name}`}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{roleLabel}</div>
        <ThemeToggle initial={theme} style={{ marginTop: 10 }} />
        <InstallAppButton style={{ marginTop: 6 }} />
        <form action={logout}>
          <button
            type="submit"
            style={{
              marginTop: 6,
              width: "100%",
              padding: 7,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink-2)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            خروج
          </button>
        </form>
      </div>
      </div>
    </aside>
  );
}
