"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./actions";
import type { RoleId } from "@/lib/ui";
import { NAV } from "./nav";

export default function Sidebar({ role, name, roleLabel }: { role: RoleId; name: string; roleLabel: string }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <aside
      className="app-sidebar"
      style={{
        borderInlineStart: "1px solid var(--line)",
        background: "var(--card-2-grad)",
        padding: "20px 14px",
        flexDirection: "column",
        gap: 18,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--btn-grad)",
            boxShadow: "var(--btn-shadow)",
          }}
        />
        <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.35 }}>
          معهد الصحابي الجليل
          <br />
          <strong style={{ color: "var(--ink)", fontWeight: 600 }}>خالد بن الوليد</strong>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((n) => {
          const on = pathname === n.href || pathname.startsWith(n.href + "/");
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
                fontSize: 13.5,
                fontFamily: "inherit",
                border: on ? "1px solid var(--accent-line)" : "1px solid transparent",
                background: on ? "var(--chip)" : "transparent",
                color: on ? "var(--ink)" : "var(--ink-2)",
                fontWeight: on ? 600 : 400,
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
              <span>{n.label}</span>
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
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{roleLabel}</div>
        <form action={logout}>
          <button
            type="submit"
            style={{
              marginTop: 10,
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
    </aside>
  );
}
