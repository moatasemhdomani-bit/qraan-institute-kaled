import type { CSSProperties } from "react";

/** Pill/chip control — matches the designer's canvas exactly (on = filled gradient). */
export function chipStyle(on: boolean): CSSProperties {
  return {
    padding: "7px 13px",
    borderRadius: 999,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "filter .15s",
    border: on ? "1px solid var(--accent-line)" : "1px solid var(--line)",
    background: on ? "var(--btn-grad)" : "var(--btn-soft)",
    color: on ? "var(--on-accent)" : "var(--ink-2)",
    fontWeight: on ? 600 : 400,
    boxShadow: on ? "var(--btn-shadow)" : undefined,
  };
}

export function inputStyle(readOnly?: boolean): CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    borderRadius: 9,
    border: "1px solid var(--line)",
    fontSize: 13.5,
    background: readOnly ? "var(--card-2-grad)" : "var(--input-grad)",
    color: readOnly ? "var(--ink-3)" : "var(--ink)",
    cursor: readOnly ? "not-allowed" : undefined,
  };
}

export const primaryButtonStyle: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid var(--btn-border)",
  background: "var(--btn-grad)",
  color: "var(--on-accent)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "var(--btn-shadow)",
};

export const softButtonStyle: CSSProperties = {
  padding: "7px 13px",
  borderRadius: 9,
  border: "1px solid var(--line)",
  background: "var(--btn-soft)",
  color: "var(--ink)",
  fontSize: 12,
  cursor: "pointer",
};

export const cardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--line)",
  background: "var(--card-grad)",
  boxShadow: "var(--glow)",
};

export const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: "مدير المعهد",
  ADMIN: "إداري",
  TEACHER: "مدرس",
  EXAMINER: "مختبِر",
  GUARDIAN: "ولي أمر",
};

export const ROLES_ORDERED = ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER", "GUARDIAN"] as const;
export type RoleId = (typeof ROLES_ORDERED)[number];

export const ALL_WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
