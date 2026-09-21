"use client";

import { useRouter } from "next/navigation";
import { chipStyle } from "@/lib/ui";
import DateField from "@/components/DateField";

/** الشريط المشترك بين شاشتي الحضور والتسميع: اختيار الحلقة والتاريخ، وإقفال العطلة. */
export default function DailyShell({
  basePath,
  halaqat,
  activeHalqaId,
  date,
  lockReason,
  dutyNote,
}: {
  basePath: string;
  halaqat: { id: string; name: string }[];
  activeHalqaId: string;
  date: string;
  lockReason: string | null;
  dutyNote: string;
}) {
  const router = useRouter();
  const go = (halqa: string, d: string) => router.push(`${basePath}?halqa=${halqa}&date=${d}`);

  if (lockReason) {
    return (
      <div
        style={{
          padding: "40px 24px",
          borderRadius: 16,
          border: "1px solid var(--accent-line)",
          background: "linear-gradient(152deg, rgba(212,175,55,0.14), rgba(10,25,47,0.92))",
          textAlign: "center",
          boxShadow: "var(--glow)",
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{lockReason}</div>
        <div style={{ color: "var(--ink-2)", fontSize: 14, maxWidth: 440, margin: "0 auto" }}>
          شاشتا الحضور والتسميع مقفلتان في يوم لا دوام فيه، فلا يُسجَّل غياب. لتعديل يوم سابق اختر تاريخًا آخر.
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>التاريخ</span>
          <DateField defaultValue={date} onChange={(v) => v && go(activeHalqaId, v)} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderRadius: 13,
        border: "1px solid var(--line)",
        background: "var(--card-2-grad)",
      }}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {halaqat.map((h) => (
          <button key={h.id} onClick={() => go(h.id, date)} style={chipStyle(h.id === activeHalqaId)}>
            {h.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>التاريخ</span>
        <DateField defaultValue={date} onChange={(v) => v && go(activeHalqaId, v)} />
      </div>
      {dutyNote && (
        <div style={{ width: "100%", fontSize: 12, color: "var(--ink-2)", display: "flex", gap: 7, alignItems: "flex-start" }}>
          <span style={{ flex: "none" }}>⦿</span>
          <span>{dutyNote}</span>
        </div>
      )}
    </div>
  );
}
