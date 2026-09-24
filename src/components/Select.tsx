"use client";

import { useEffect, useRef, useState } from "react";
import { inputStyle } from "@/lib/ui";

export type SelectOption = { value: string; label: string };

/**
 * قائمة منسدلة موحّدة بهوية الموقع — بديل عن select الأصلي الذي يفتح بمظهر النظام الافتراضي
 * ولا يمكن تصميم قائمته المفتوحة بـ CSS وحده. تعمل داخل النماذج العادية عبر حقل مخفي بنفس name.
 */
export default function Select({
  name,
  value,
  onChange,
  options,
  placeholder = "اختاروا",
  disabled,
  width,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  width?: number | string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} style={{ position: "relative", width: width ?? "100%" }}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inputStyle(disabled),
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "start",
        }}
      >
        <span
          style={{
            color: selected ? "var(--ink)" : "var(--ink-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span
          style={{
            color: "var(--ink-3)",
            fontSize: 11,
            flex: "none",
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform .15s",
          }}
        >
          ▾
        </span>
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            top: "calc(100% + 6px)",
            zIndex: 40,
            maxHeight: 260,
            overflowY: "auto",
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: "var(--card-grad), var(--panel-solid)",
            boxShadow: "var(--glow)",
            padding: 6,
          }}
        >
          {options.length === 0 && <div style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-3)" }}>لا خيارات</div>}
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <div
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  cursor: "pointer",
                  color: isSelected ? "var(--on-accent)" : "var(--ink-2)",
                  background: isSelected ? "var(--btn-grad)" : "transparent",
                  fontWeight: isSelected ? 600 : 400,
                  transition: "background .12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--btn-soft)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
