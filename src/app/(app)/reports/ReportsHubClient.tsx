"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle } from "@/lib/ui";

type IssuedRow = {
  id: string;
  kind: string;
  kindLabel: string;
  name: string;
  range: string;
  at: string;
  by: string;
  fileUrl: string;
};

const FILTERS = [
  { id: "all", label: "كل الأنواع" },
  { id: "HALAQAT", label: "تسميع الحلقات" },
  { id: "TEACHERS", label: "الشهري للمدرسين" },
  { id: "STUDENT", label: "تقرير طالب" },
];

export default function ReportsHubClient({ issued }: { issued: IssuedRow[] }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => issued.filter((r) => filter === "all" || r.kind === filter), [issued, filter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>سجل التقارير الصادرة</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={chipStyle(filter === f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--ink-2)", ...cardStyle }}>لا تقارير صادرة بهذا النوع بعد.</div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} style={{ ...cardStyle, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>
                {r.kindLabel} · {r.range} · أصدره {r.by} بتاريخ {r.at}
              </div>
            </div>
            <a
              href={r.fileUrl}
              target="_blank"
              rel="noreferrer"
              style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12.5, textDecoration: "none" }}
            >
              تنزيل PDF
            </a>
          </div>
        ))
      )}
    </div>
  );
}
