"use client";

import { useRouter } from "next/navigation";
import { chipStyle } from "@/lib/ui";
import DateField from "@/components/DateField";

/** أعلى شاشات ولي الأمر: اختيار الابن (إن كان له إخوة في المعهد) والفترة — تبقى عند التنقّل بين الشاشات الثلاث */
export default function ParentFilters({
  basePath,
  family,
  activeId,
  from,
  to,
}: {
  basePath: string;
  family: { id: string; label: string }[];
  activeId: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const go = (child: string, f: string, t: string) => router.push(`${basePath}?child=${child}&from=${f}&to=${t}`);
  const q = `?child=${activeId}&from=${from}&to=${to}`;
  const tabs = [
    { href: "/parent", label: "نظرة عامة" },
    { href: "/parent/recitation", label: "جدول التسميع" },
    { href: "/parent/attendance", label: "جدول الحضور" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* التنقّل بين الشاشات الثلاث بالابن والفترة نفسيهما */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.href} type="button" onClick={() => router.push(t.href + q)} style={chipStyle(t.href === basePath)}>
            {t.label}
          </button>
        ))}
      </div>
      {family.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {family.map((c) => (
            <button key={c.id} type="button" onClick={() => go(c.id, from, to)} style={chipStyle(c.id === activeId)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px 14px",
          borderRadius: 13,
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>من</span>
        <DateField defaultValue={from} onChange={(v) => v && go(activeId, v, to)} width={160} />
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>إلى</span>
        <DateField defaultValue={to} onChange={(v) => v && go(activeId, from, v)} width={160} />
      </div>
    </div>
  );
}
