import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 4px", fontFamily: "var(--font-titles)", lineHeight: 1.4 }}>{title}</h1>
        <div style={{ color: "var(--ink-2)", fontSize: 14 }}>{subtitle}</div>
      </div>
      {action && <div style={{ marginInlineStart: "auto" }}>{action}</div>}
    </div>
  );
}
