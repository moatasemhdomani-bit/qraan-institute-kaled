"use client";

import { useMemo, useState, useTransition } from "react";
import { cardStyle, primaryButtonStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import Select from "@/components/Select";
import { today } from "@/lib/daily";
import type { StudentPreview } from "@/lib/reports";
import StudentReportPreview from "../reports/student/StudentReportPreview";
import { previewTeacherStudentReport } from "./actions";

type Halqa = { id: string; name: string; students: { id: string; name: string; no: number }[] };

/** تقرير طالب للمدرّس — يختار أحد طلابه والفترة ويشاهد التقرير فقط (لا إصدار ولا PDF). */
export default function TeacherStudentReportClient({ halaqat }: { halaqat: Halqa[] }) {
  const [studentId, setStudentId] = useState("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [preview, setPreview] = useState<StudentPreview | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // طلابه من كل حلقاته — مع اسم الحلقة إن كانت له أكثر من حلقة
  const options = useMemo(
    () =>
      halaqat.flatMap((h) =>
        h.students.map((s) => ({ value: s.id, label: halaqat.length > 1 ? `${s.name} — #${s.no} · ${h.name}` : `${s.name} — #${s.no}` }))
      ),
    [halaqat]
  );

  function show() {
    setError("");
    startTransition(async () => {
      const res = await previewTeacherStudentReport(studentId, from, to);
      if ("error" in res) {
        setError(res.error);
        setPreview(null);
        return;
      }
      setPreview(res.preview);
    });
  }

  if (options.length === 0) {
    return <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>لا طلاب في حلقاتك بعد.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cardStyle, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>الطالب</label>
          <Select
            value={studentId}
            onChange={(v) => {
              setStudentId(v);
              setPreview(null);
            }}
            options={options}
            placeholder="اختاروا أحد طلابكم"
          />
        </div>
        <DateField label="بداية التقرير" value={from} onChange={setFrom} />
        <DateField label="نهاية التقرير" value={to} onChange={setTo} />
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="button" onClick={show} disabled={pending || !studentId} style={{ ...primaryButtonStyle, opacity: pending || !studentId ? 0.7 : 1, width: "100%" }}>
            {pending ? "جارٍ التحميل…" : "عرض التقرير"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>
      )}

      {preview && <StudentReportPreview preview={preview} />}
    </div>
  );
}
