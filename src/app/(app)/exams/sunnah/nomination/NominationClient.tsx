"use client";

import { useMemo, useState } from "react";
import { cardStyle, inputStyle, softButtonStyle } from "@/lib/ui";
import { toWesternDigits } from "@/lib/numbers";
import { formatDateAr } from "@/lib/daily";
import { SUNNAH_PASS_MARK, sunnahBranchLabel, type SunnahSectionId } from "@/lib/sunnah";
import DeleteExamButton from "../../DeleteExamButton";
import { SunnahExamForm, type SunnahExamRow } from "../SunnahClient";
import { textHas } from "@/lib/search";

type StudentRow = { id: string; name: string; no: number; stars: number; halqaName: string | null };

const passedAs = (e: SunnahExamRow, type: string) => e.type === type && !e.repeat && e.mark != null && e.mark >= SUNNAH_PASS_MARK;

export default function NominationClient({
  students,
  exams,
  isDirector,
  currentUserId,
}: {
  students: StudentRow[];
  exams: SunnahExamRow[];
  isDirector: boolean;
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ student: StudentRow; existing: SunnahExamRow | null; section: SunnahSectionId; branch: number } | null>(null);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // المؤهَّلون: نجحوا في السبر المحلي لمستوى ولم ينجحوا بعد في ترشيحه
  const eligible = useMemo(() => {
    const out: { key: string; student: StudentRow; section: SunnahSectionId; branch: number; local: SunnahExamRow; tries: number }[] = [];
    const seen = new Set<string>();
    for (const e of exams) {
      if (!passedAs(e, "SUNNAH")) continue;
      const key = `${e.studentId}|${e.section}|${e.branch}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const same = exams.filter((x) => x.studentId === e.studentId && x.section === e.section && x.branch === e.branch && x.type === "SUNNAH_NOMINATION");
      if (same.some((x) => passedAs(x, "SUNNAH_NOMINATION"))) continue;
      const s = byId.get(e.studentId);
      if (s) out.push({ key, student: s, section: e.section, branch: e.branch, local: e, tries: same.length });
    }
    return out;
  }, [exams, byId]);

  const q = toWesternDigits(search.trim());
  const shown = q ? eligible.filter((x) => textHas(x.student.name, q) || String(x.student.no) === q) : eligible;
  const recent = exams.filter((e) => e.type === "SUNNAH_NOMINATION").slice(0, 40);

  const line = (key: string, title: string, sub: string, action: React.ReactNode) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{sub}</div>
      </div>
      {action}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>المؤهَّلون لسبر الترشيح ({eligible.length})</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>الناجحون في السبر المحلي لمستوى ولم ينجحوا بعد في ترشيحه.</div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم الطالب أو رقمه" style={inputStyle()} />
        {shown.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{q ? "لا يوجد طالب مؤهَّل بهذا الاسم أو الرقم." : "لا يوجد طلاب مؤهَّلون الآن."}</div>}
        {shown.map((x) =>
          line(
            x.key,
            `${x.student.name} #${x.student.no}`,
            `${sunnahBranchLabel(x.section, x.branch)} · السبر المحلي ${x.local.mark} / 100 (${formatDateAr(x.local.date)})${x.tries ? ` · ${x.tries} محاولة ترشيح سابقة` : ""}`,
            <button type="button" onClick={() => setForm({ student: x.student, existing: null, section: x.section, branch: x.branch })} style={{ ...softButtonStyle, padding: "8px 14px" }}>
              سبر الترشيح
            </button>
          )
        )}
      </div>

      <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>آخر سبورات الترشيح</div>
        {recent.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا سبر ترشيح بعد.</div>}
        {recent.map((e) => {
          const s = byId.get(e.studentId);
          const ok = passedAs(e, "SUNNAH_NOMINATION");
          const mine = isDirector || e.examinerId === currentUserId;
          return line(
            e.id,
            `${s ? `${s.name} #${s.no}` : ""} — ${e.repeat ? "إعادة" : `${e.mark} / 100`}`,
            `${sunnahBranchLabel(e.section, e.branch, false)} · ${ok ? "ناجح — في قائمة الجاهزين لسبر الأوقاف" : "إعادة"} · ${formatDateAr(e.date)} · ${e.examinerName}`,
            mine ? (
              <span style={{ display: "flex", gap: 6 }}>
                {s && (
                  <button type="button" onClick={() => setForm({ student: s, existing: e, section: e.section, branch: e.branch })} style={{ ...softButtonStyle, padding: "6px 12px", fontSize: 12 }}>
                    تعديل
                  </button>
                )}
                <DeleteExamButton examId={e.id} />
              </span>
            ) : null
          );
        })}
      </div>

      {form && (
        <SunnahExamForm
          student={form.student}
          existing={form.existing}
          preset={{ type: "SUNNAH_NOMINATION", section: form.section, branch: form.branch }}
          types={["SUNNAH_NOMINATION"]}
          balance={form.student.stars}
          history={exams.filter((e) => e.studentId === form.student.id)}
          canLocal
          canAwqaf={false}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
