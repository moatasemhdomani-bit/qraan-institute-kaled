"use client";

import { useActionState, useTransition } from "react";
import { toggleWorkingDay, addHoliday, deleteHoliday, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle, cardStyle, ALL_WEEKDAYS } from "@/lib/ui";

const initialState: FormState = {};

export default function ScheduleClient({
  activeDays,
  holidays,
}: {
  activeDays: string[];
  holidays: { id: string; name: string; date: string }[];
}) {
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(addHoliday, initialState);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>أيام الأسبوع الرسمية</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>اختيار متعدد — تخدم تقارير الحضور في المراحل اللاحقة.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALL_WEEKDAYS.map((d) => {
            const on = activeDays.includes(d);
            return (
              <button key={d} style={chipStyle(on)} onClick={() => startTransition(() => toggleWorkingDay(d, !on))}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>قائمة العطل</div>
        <form action={formAction} style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input name="name" placeholder="اسم العطلة" style={{ ...inputStyle(), flex: 1, minWidth: 130 }} />
          <input name="date" placeholder="التاريخ" style={{ ...inputStyle(), width: 120 }} />
          <button type="submit" disabled={pending} style={{ ...primaryButtonStyle, padding: "9px 14px", fontSize: 13, opacity: pending ? 0.7 : 1 }}>
            إضافة
          </button>
        </form>
        {state.error && <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{state.error}</div>}

        {holidays.length === 0 ? (
          <div style={{ padding: "28px 12px", textAlign: "center", border: "1px dashed var(--line)", borderRadius: 11, color: "var(--ink-2)", fontSize: 13 }}>
            لم تُضف أي عطلة بعد.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {holidays.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--card-2-grad)", fontSize: 14 }}>
                <span>{h.name}</span>
                <span style={{ marginInlineStart: "auto", color: "var(--ink-3)", fontSize: 13 }}>{h.date}</span>
                <button
                  onClick={() => startTransition(() => deleteHoliday(h.id))}
                  style={{ background: "transparent", border: 0, color: "var(--ink-3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
