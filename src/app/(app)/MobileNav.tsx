"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./actions";
import type { RoleId } from "@/lib/ui";
import { NAV } from "./nav";

export default function MobileNav({ role, name }: { role: RoleId; name: string }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <nav
      className="app-mobile-nav"
      style={{
        flex: "none",
        order: -1,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100vh",
        overflow: "auto",
        flexDirection: "column",
        gap: 3,
        padding: "8px 5px",
        borderInlineStart: "1px solid var(--line)",
        background: "var(--card-2-grad)",
        zIndex: 6,
      }}
    >
      {items.map((n) => {
        const on = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link
            key={n.id}
            href={n.href}
            style={{
              width: 70,
              flex: "none",
              padding: "8px 4px",
              borderRadius: 9,
              fontSize: 10.5,
              lineHeight: 1.25,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "center",
              border: on ? "1px solid var(--accent-line)" : "1px solid var(--line)",
              background: on ? "var(--btn-grad)" : "transparent",
              color: on ? "var(--on-accent)" : "var(--ink-2)",
              fontWeight: on ? 600 : 400,
            }}
          >
            {n.label}
          </Link>
        );
      })}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div
          title={name}
          style={{
            width: "100%",
            fontSize: 9.5,
            color: "var(--ink-3)",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <form action={logout} style={{ width: "100%" }}>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "6px 4px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink-3)",
              fontSize: 10,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            خروج
          </button>
        </form>
      </div>
    </nav>
  );
}
