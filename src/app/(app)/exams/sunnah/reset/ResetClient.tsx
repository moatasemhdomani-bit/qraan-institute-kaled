"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cardStyle, inputStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import type { SunnahSectionId } from "@/lib/sunnah";
import { SetupForm } from "../SunnahRecitationPanel";

type StudentRow = { id: string; name: string; no: number; halqaName: string | null; current: string };

/** البحث عن الطالب، ثم خيارات الإعداد الأول بوضع «إعادة الضبط». */
export default function ResetClient({ section, students }: { section: SunnahSectionId; students: StudentRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<StudentRow | null>(null);
  const [done, setDone] = useState("");

  const matches = useMemo(() => {
    const q = toWesternDigits(search.trim());
    if (!q) return [];
    return students.filter((s) => s.name.includes(q) || String(s.no) === q).slice(0, 15);
  }, [students, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {done && <div style={{ ...cardStyle, padding: "12px 16px", fontSize: 13.5, color: "var(--ok)" }}>{done}</div>}

      {!picked ? (
        <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>اختيار الطالب</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اكتبوا اسم الطالب أو رقمه" style={inputStyle()} autoFocus />
          {search.trim() && matches.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طالب بهذا الاسم أو الرقم.</div>}
          {matches.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setPicked(s);
                setDone("");
              }}
              style={{ display: "flex", flexDirection: "column", gap: 3, padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)", color: "var(--ink)", textAlign: "start", cursor: "pointer" }}
            >
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>
                {s.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{s.no}</span>
                <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 400 }}> · {s.halqaName ?? "غير مفروز"}</span>
              </span>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>مستواه الآن: {s.current}</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>
                {picked.name} <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>#{picked.no}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>مستواه الآن: {picked.current}</div>
            </div>
            <button type="button" onClick={() => setPicked(null)} style={{ fontSize: 13, color: "var(--ink-2)", background: "transparent", border: "none", cursor: "pointer" }}>
              ← طالب آخر
            </button>
          </div>
          <SetupForm
            key={picked.id}
            section={section}
            studentId={picked.id}
            reset
            onDone={() => {
              setDone(`✓ أُعيد ضبط مستوى ${picked.name}.`);
              setPicked(null);
              setSearch("");
              router.refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}
