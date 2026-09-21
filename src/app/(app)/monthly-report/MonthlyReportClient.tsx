"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cardStyle, chipStyle, inputStyle } from "@/lib/ui";
import { saveTeacherNote, type NoteState } from "./actions";

type Row = {
  studentId: string;
  studentName: string;
  from: number | null;
  to: number | null;
  newTotal: number;
  pastTotal: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  note: string;
};

function passFailCell(pass: number, fail: number) {
  return (
    <span>
      <b style={{ color: "#6FBF8B" }}>{pass}</b> / <b style={{ color: "#E08A8A" }}>{fail}</b>
    </span>
  );
}

function NoteCell({ studentId, month, initialNote }: { studentId: string; month: string; initialNote: string }) {
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
      <input type="hidden" name="month" value={month} />
      <input name="note" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle()} />
      <button type="submit" disabled={pending} style={{ flex: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer", opacity: pending ? 0.7 : 1 }}>
        {savedFlash ? "حُفظت ✓" : pending ? "…" : "حفظ"}
      </button>
    </form>
  );
}

export default function MonthlyReportClient({
  halaqat,
  halqaId,
  months,
  month,
  rows,
}: {
  halaqat: { id: string; name: string }[];
  halqaId: string;
  months: { id: string; label: string }[];
  month: string;
  rows: Row[];
}) {
  const router = useRouter();

  function go(nextMonth: string, nextHalqa: string) {
    router.push(`/monthly-report?month=${nextMonth}&halqa=${nextHalqa}`);
  }

  const doneCount = rows.filter((r) => r.note.trim()).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {months.map((m) => (
          <button key={m.id} onClick={() => go(m.id, halqaId)} style={chipStyle(m.id === month)}>
            {m.label}
          </button>
        ))}
      </div>

      {halaqat.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {halaqat.map((h) => (
            <button key={h.id} onClick={() => go(month, h.id)} style={chipStyle(h.id === halqaId)}>
              {h.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
        أرقام هذا التقرير محسوبة من حضورك وتسميعك وسبر طلابك — عمود الملاحظات وحده تكتبه أنت، ويدخل تقرير الإدارة كما كتبته بلا تعديل. كُتبت {doneCount} من {rows.length}.
      </div>

      <div style={{ ...cardStyle, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 900 }}>
          <thead>
            <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
              <th style={{ padding: 8, textAlign: "start" }}>الطالب</th>
              <th style={{ padding: 8 }}>من صفحة</th>
              <th style={{ padding: 8 }}>إلى صفحة</th>
              <th style={{ padding: 8 }}>مجموع الجديد</th>
              <th style={{ padding: 8 }}>مجموع الماضي</th>
              <th style={{ padding: 8 }}>اختبار محلي</th>
              <th style={{ padding: 8 }}>ترشيح الأوقاف</th>
              <th style={{ padding: 8 }}>سبر الأوقاف الفعلي</th>
              <th style={{ padding: 8, minWidth: 220 }}>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} style={{ borderTop: "1px solid var(--line-2)" }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{r.studentName}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.from ?? "—"}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.to ?? "—"}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.newTotal}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{r.pastTotal}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.locPass, r.locFail)}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.nomPass, r.nomFail)}</td>
                <td style={{ padding: 8, textAlign: "center" }}>{passFailCell(r.realPass, r.realFail)}</td>
                <td style={{ padding: 6 }}>
                  <NoteCell studentId={r.studentId} month={month} initialNote={r.note} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
