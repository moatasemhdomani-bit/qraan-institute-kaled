"use client";

import type { ReactNode } from "react";

export default function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(10,11,20,0.62)",
        backdropFilter: "blur(3px)",
        display: "flex",
        justifyContent: "flex-start",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(560px,100%)",
          height: "100%",
          overflow: "auto",
          background: "var(--card-grad)",
          borderInlineEnd: "1px solid var(--line)",
          boxShadow: "var(--glow)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            background: "var(--head-grad)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginInlineStart: "auto",
              width: 30,
              height: 30,
              borderRadius: 9,
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink-2)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>{children}</div>
        {footer && (
          <div
            style={{
              marginTop: "auto",
              position: "sticky",
              bottom: 0,
              display: "flex",
              gap: 10,
              padding: "16px 20px",
              borderTop: "1px solid var(--line)",
              background: "var(--head-grad)",
              backdropFilter: "blur(14px)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
