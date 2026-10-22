"use client";

import { cardStyle } from "@/lib/ui";
import type { LogBlock } from "@/lib/recitationLog";

/** جدول سجل التسميع: أيام الدوام أعمدةً والطلاب سطورًا — لمدرّس الحلقة وللإدارة */
export default function RecitationLogTable({ arabic, data }: { arabic: boolean; data: Pick<LogBlock, "days" | "truncated" | "rows"> }) {
  if (data.days.length === 0) return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-2)" }}>لا أيام دوام في هذه الفترة.</div>;
  // عمود اسم الطالب ثابت عند التمرير، بخلفية مصمتة لا يشفّ ما وراءها
  const sticky = { position: "sticky", insetInlineStart: 0, background: "var(--panel-solid)", zIndex: 2 } as const;
  return (
    <>
      {data.truncated && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>يُعرض أول {data.days.length} يوم دوام فقط — قصّروا الفترة لرؤية الباقي.</div>}
      <div style={{ ...cardStyle, overflow: "auto", padding: 0 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--head-grad)", color: "var(--ink-2)" }}>
              <th style={{ ...sticky, padding: 8, textAlign: "start", minWidth: 150 }}>الطالب</th>
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
                  {r.studentName}
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
