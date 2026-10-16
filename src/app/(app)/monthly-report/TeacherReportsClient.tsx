"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatJuz } from "@/lib/pastRecitation";
import { cardStyle, chipStyle, inputStyle } from "@/lib/ui";
import DateField from "@/components/DateField";
import TeacherStudentReportClient from "../student-report/TeacherStudentReportClient";
import { saveTeacherNote, type NoteState } from "./actions";

export type ReportType = "monthly" | "student" | "log";

const TYPES: { id: ReportType; title: string; note: string }[] = [
  { id: "monthly", title: "التقرير الشهري", note: "صف لكل طالب بأرقام الفترة، وعمود الملاحظات تكتبه أنت." },
  { id: "student", title: "تقرير طالب", note: "تقرير أحد طلابك في فترة تختارها — للمشاهدة فقط." },
  { id: "log", title: "سجل التسميع", note: "أيام الدوام أعمدةً والطلاب سطورًا: تسميع كل طالب في كل يوم، الجديد والماضي بتقديرهما." },
];

type MonthlyRow = {
  studentId: string;
  studentName: string;
  from: number | null;
  to: number | null;
  newTotal: number;
  pastJuz: number;
  locPass: number; locFail: number;
  pastPass: number; pastFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  note: string;
};
type LogData = {
  days: { date: string; label: string; holiday: string | null }[];
  truncated: boolean;
  rows: { studentId: string; studentName: string; studentNo: number; cells: Record<string, { none: boolean; fresh: string; past: string }> }[];
};
type Halqa = { id: string; name: string; students: { id: string; name: string; no: number }[] };

function passFailCell(pass: number, fail: number) {
  return (
    <span>
      <b style={{ color: "var(--ok)" }}>{pass}</b> / <b style={{ color: "var(--bad)" }}>{fail}</b>
    </span>
  );
}

function NoteCell({ studentId, initialNote }: { studentId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [state, formAction, pending] = useActionState(saveTeacherNote, {} as NoteState);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1500);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <form action={formAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="hidden" name="studentId" value={studentId} />
      <input name="note" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle()} />
      <button type="submit" disabled={pending} style={{ flex: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer", opacity: pending ? 0.7 : 1 }}>
        {savedFlash ? "حُفظت ✓" : pending ? "…" : "حفظ"}
      </button>
    </form>
  );
}

export default function TeacherReportsClient({
  type,
  from,
  to,
  halaqat,
  halqaId,
  arabic,
  monthly,
  log,
}: {
  type: ReportType | null;
  from: string;
  to: string;
  halaqat: Halqa[];
  halqaId: string;
  arabic: boolean;
  monthly: { rows: MonthlyRow[] } | null;
  log: LogData | null;
}) {
  const router = useRouter();
  const go = (next: Partial<{ type: ReportType; from: string; to: string; halqa: string }>) => {
    const q = new URLSearchParams({ type: next.type ?? type ?? "", from: next.from ?? from, to: next.to ?? to, halqa: next.halqa ?? halqaId });
    router.push(`/monthly-report?${q.toString()}`);
  };

  // اختيار نوع التقرير عند فتح الشاشة
  if (!type) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => go({ type: t.id })} style={{ ...cardStyle, textAlign: "start", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, padding: 18 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{t.title}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.7 }}>{t.note}</span>
          </button>
        ))}
      </div>
    );
  }

  const rangeBad = from > to;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* أنواع التقارير الثلاثة في الأعلى */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => go({ type: t.id })} style={chipStyle(t.id === type)}>
            {t.title}
          </button>
        ))}
      </div>

      {type === "student" ? (
        <TeacherStudentReportClient halaqat={halaqat} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <DateField label="تاريخ بداية التقرير" value={from} onChange={(v) => v && go({ from: v })} />
            <DateField label="تاريخ نهاية التقرير" value={to} onChange={(v) => v && go({ to: v })} />
          </div>
          {halaqat.length > 1 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {halaqat.map((h) => (
                <button key={h.id} type="button" onClick={() => go({ halqa: h.id })} style={chipStyle(h.id === halqaId)}>
                  {h.name}
                </button>
              ))}
            </div>
          )}
          {rangeBad && <div style={{ color: "var(--bad-ink)", fontSize: 13 }}>تاريخ البداية بعد تاريخ النهاية.</div>}

          {type === "monthly" && monthly && <MonthlyTable arabic={arabic} data={monthly} />}
          {type === "log" && log && <LogTable arabic={arabic} data={log} />}
        </>
      )}
    </div>
  );
}

function MonthlyTable({ arabic, data }: { arabic: boolean; data: { rows: MonthlyRow[] } }) {
  const { rows } = data;
  const doneCount = rows.filter((r) => r.note.trim()).length;
  const th = { padding: 8 } as const;
  return (
    <>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        أرقام هذا التقرير محسوبة من تسميعك وسبر طلابك — عمود الملاحظات وحده تكتبه أنت، ويبقى محفوظًا من فترة لأخرى حتى تعدّله أنت أو الإدارة، ويدخل تقرير الإدارة كما كتبته. كُتبت {doneCount} من {rows.length}.
      </div>
      <div style={{ ...cardStyle, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: arabic ? 700 : 900 }}>
          <thead>
            <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
              <th style={{ ...th, textAlign: "start" }}>الطالب</th>
              <th style={th}>من صفحة</th>
              <th style={th}>إلى صفحة</th>
              <th style={th}>مجموع الجديد</th>
              {!arabic && <th style={th}>مجموع الماضي (أجزاء)</th>}
              <th style={th}>{arabic ? "الاختبار" : "اختبار محلي"}</th>
              {!arabic && <th style={th}>سبر ماضٍ غيباً</th>}
              {!arabic && <th style={th}>ترشيح الأوقاف</th>}
              {!arabic && <th style={th}>سبر الأوقاف الفعلي</th>}
              <th style={{ ...th, minWidth: 220 }}>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} style={{ borderTop: "1px solid var(--line-2)" }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{r.studentName}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.from ?? "—"}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.to ?? "—"}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.newTotal}</td>
                {!arabic && <td style={{ padding: 8, textAlign: "center" }}>{formatJuz(r.pastJuz)}</td>}
                <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.locPass, r.locFail)}</td>
                {!arabic && <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.pastPass, r.pastFail)}</td>}
                {!arabic && <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.nomPass, r.nomFail)}</td>}
                {!arabic && <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.realPass, r.realFail)}</td>}
                <td style={{ padding: 6 }}>
                  <NoteCell key={`${r.studentId}-${r.note}`} studentId={r.studentId} initialNote={r.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LogTable({ arabic, data }: { arabic: boolean; data: LogData }) {
  if (data.days.length === 0) return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا أيام دوام في هذه الفترة.</div>;
  const sticky = { position: "sticky", insetInlineStart: 0, background: "var(--card)", zIndex: 1 } as const;
  return (
    <>
      {data.truncated && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>يُعرض أول {data.days.length} يوم دوام فقط — قصّروا الفترة لرؤية الباقي.</div>}
      <div style={{ ...cardStyle, overflow: "auto", padding: 0 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
              <th style={{ ...sticky, background: "var(--card)", padding: 8, textAlign: "start", minWidth: 150 }}>الطالب</th>
              {data.days.map((d) => (
                <th key={d.date} style={{ padding: 8, minWidth: arabic ? 110 : 150, whiteSpace: "nowrap", borderInlineStart: "1px solid var(--line-2)" }}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.studentId} style={{ borderTop: "1px solid var(--line-2)" }}>
                <td style={{ ...sticky, padding: 8, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {r.studentName} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>#{r.studentNo}</span>
                </td>
                {data.days.map((d) => {
                  const c = r.cells[d.date];
                  return (
                    <td key={d.date} style={{ padding: 6, verticalAlign: "top", borderInlineStart: "1px solid var(--line-2)", lineHeight: 1.6 }}>
                      {!c && d.holiday ? (
                        <span style={{ color: "var(--info)", fontWeight: 600 }}>عطلة — {d.holiday}</span>
                      ) : !c ? (
                        <span style={{ color: "var(--ink-3)" }}>—</span>
                      ) : c.none ? (
                        <span style={{ color: "var(--bad-ink)" }}>{c.fresh}</span>
                      ) : (
                        <>
                          {c.fresh && (
                            <div>
                              {!arabic && <span style={{ color: "var(--ink-3)" }}>جديد: </span>}
                              {c.fresh}
                            </div>
                          )}
                          {c.past && (
                            <div>
                              <span style={{ color: "var(--ink-3)" }}>ماضٍ: </span>
                              {c.past}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
