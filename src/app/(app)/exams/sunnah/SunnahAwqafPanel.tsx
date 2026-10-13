"use client";

import { useMemo, useState } from "react";
import { cardStyle, softButtonStyle } from "@/lib/ui";
import { formatDateAr } from "@/lib/daily";
import { SUNNAH_PASS_MARK, sunnahBranchLabel, sunnahReadyForAwqaf, type SunnahSectionId } from "@/lib/sunnah";
import DeleteExamButton from "../DeleteExamButton";
import { SunnahExamForm, type SunnahExamRow } from "./SunnahClient";

type StudentRow = { id: string; name: string; no: number; stars: number; halqaName: string | null };

/**
 * سبر الأوقاف في السنة النبوية — في شاشة «سبر الأوقاف والشهادات» عند الإدارة:
 * الجاهزون (الناجحون في سبر ترشيح الأوقاف) وإدخال نتيجة سبر الأوقاف، وآخر النتائج المُدخلة.
 */
export default function SunnahAwqafPanel({ students, exams }: { students: StudentRow[]; exams: SunnahExamRow[] }) {
  const [form, setForm] = useState<{ student: StudentRow; existing: SunnahExamRow | null; section: SunnahSectionId; branch: number } | null>(null);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const ready = useMemo(() => sunnahReadyForAwqaf(exams), [exams]);
  const results = useMemo(() => exams.filter((e) => e.type === "SUNNAH_AWQAF").slice(0, 40), [exams]);

  const row = (key: string, title: string, sub: string, action: React.ReactNode) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{sub}</div>
      </div>
      {action}
    </div>
  );

  return (
    <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>السنة النبوية — سبر الأوقاف</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
        الجاهزون: من نجح في سبر ترشيح الأوقاف لمستوى (النجاح من {SUNNAH_PASS_MARK}) — يخرج من القائمة عند إدخال نتيجة الأوقاف لمستواه.
      </div>

      <div style={{ fontSize: 14, fontWeight: 700 }}>الجاهزون لسبر الأوقاف ({ready.length})</div>
      {ready.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا يوجد طلاب جاهزون الآن.</div>}
      {ready.map((n) => {
        const s = byId.get(n.studentId);
        if (!s) return null;
        return row(
          n.id,
          `${s.name} #${s.no}`,
          `${sunnahBranchLabel(n.section, n.branch)} · ترشيح ${n.mark} / 100 · ${formatDateAr(n.date)}`,
          <button type="button" onClick={() => setForm({ student: s, existing: null, section: n.section, branch: n.branch })} style={{ ...softButtonStyle, padding: "8px 14px" }}>
            إدخال نتيجة الأوقاف
          </button>
        );
      })}

      {results.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>آخر نتائج سبر الأوقاف</div>
          {results.map((e) => {
            const s = byId.get(e.studentId);
            const ok = !e.repeat && e.mark != null && e.mark >= SUNNAH_PASS_MARK;
            return row(
              e.id,
              `${s?.name ?? ""} — ${e.repeat ? "إعادة" : `${e.mark} / 100`}`,
              `${sunnahBranchLabel(e.section, e.branch, false)} · ${ok ? "ناجح" : "إعادة"} · ${formatDateAr(e.date)} · أدخله: ${e.examinerName}`,
              <span style={{ display: "flex", gap: 6 }}>
                {s && (
                  <button type="button" onClick={() => setForm({ student: s, existing: e, section: e.section, branch: e.branch })} style={{ ...softButtonStyle, padding: "6px 12px", fontSize: 12 }}>
                    تعديل
                  </button>
                )}
                <DeleteExamButton examId={e.id} />
              </span>
            );
          })}
        </>
      )}

      {form && (
        <SunnahExamForm
          student={form.student}
          existing={form.existing}
          preset={{ type: "SUNNAH_AWQAF", section: form.section, branch: form.branch }}
          balance={form.student.stars}
          history={exams.filter((e) => e.studentId === form.student.id)}
          canLocal={false}
          canAwqaf
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
