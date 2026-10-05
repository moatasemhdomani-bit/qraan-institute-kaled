"use client";

import { useMemo, useState } from "react";
import { cardStyle, chipStyle, primaryButtonStyle, inputStyle } from "@/lib/ui";
import { padTime, formatDateAr } from "@/lib/daily";
import PermitForm, { type ExistingPermit } from "./PermitForm";
import { deletePermit } from "./actions";

const KIND_LABELS: Record<string, string> = { ENTRY: "إذن دخول", EXIT: "إذن خروج" };
const KIND_COLORS: Record<string, string> = { ENTRY: "var(--ok)", EXIT: "var(--gold)" };
const KIND_VERBS: Record<string, string> = { ENTRY: "يدخل في", EXIT: "يخرج في" };

type Permit = {
  id: string;
  studentId: string;
  kind: "ENTRY" | "EXIT";
  time: string;
  note: string | null;
  since: string;
  /** أيام الإذن — فارغة في الأذونات القديمة = كل أيام الدوام */
  days: string[];
  setByName: string;
};
type Halqa = {
  id: string;
  name: string;
  teacherName: string;
  cohortName: string;
  students: { id: string; no: number; name: string }[];
  permits: Permit[];
};

export default function PermitsClient({
  scopeNote,
  halaqat,
  workDays,
  readOnly = false,
}: {
  scopeNote: string;
  halaqat: Halqa[];
  workDays: string[];
  readOnly?: boolean;
}) {
  const [kindFilter, setKindFilter] = useState<"all" | "ENTRY" | "EXIT">("all");
  // initialStudentId: فُتح النموذج من نتيجة البحث «لا يوجد إذن» على طالب بعينه
  const [formOpen, setFormOpen] = useState<{ existing: ExistingPermit | null; initialStudentId?: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleRowDelete(id: string) {
    setDeletingId(id);
    const res = await deletePermit(id);
    setDeletingId(null);
    if (res.error) setNotice(res.error);
    else setNotice("حُذف الإذن — عاد الطالب إلى دوام الفوج المعتاد.");
  }

  const studentNameOf = (halqa: Halqa, studentId: string) => halqa.students.find((s) => s.id === studentId)?.name ?? "";

  const blocks = useMemo(
    () =>
      halaqat.map((h) => {
        const rows = h.permits
          .filter((p) => kindFilter === "all" || p.kind === kindFilter)
          .map((p) => ({
            ...p,
            name: studentNameOf(h, p.studentId),
          }));
        return {
          id: h.id,
          name: h.name,
          meta: `${h.teacherName} · ${h.cohortName}`,
          rows,
        };
      }),
    [halaqat, kindFilter]
  );

  const totalPermits = halaqat.reduce((sum, h) => sum + h.permits.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!readOnly && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setFormOpen({ existing: null })} style={primaryButtonStyle}>
            إضافة إذن
          </button>
        </div>
      )}

      {notice && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(111,191,139,0.5)", background: "linear-gradient(135deg, rgba(111,191,139,0.16), rgba(111,191,139,0.03))", fontSize: 13.5 }}>
          <span style={{ flex: 1 }}>{notice}</span>
          <button onClick={() => setNotice("")} style={{ border: 0, background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontSize: 16 }}>
            ×
          </button>
        </div>
      )}

      <StudentPermitSearch halaqat={halaqat} onAdd={readOnly ? undefined : (id) => setFormOpen({ existing: null, initialStudentId: id })} />

      <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "12px 14px", borderRadius: 13, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "ENTRY", "EXIT"] as const).map((k) => (
            <button key={k} onClick={() => setKindFilter(k)} style={chipStyle(kindFilter === k)}>
              {k === "all" ? "النوعان" : KIND_LABELS[k]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{scopeNote}</div>
      </div>

      {totalPermits === 0 ? (
        <div style={{ padding: "44px 22px", borderRadius: 16, border: "1px dashed var(--line)", background: "var(--card-grad)", textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>لا أذونات قائمة</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 430, margin: "0 auto" }}>
            الطالب الذي يحتاج دخولًا متأخرًا أو خروجًا مبكرًا بشكل دائم يُضاف هنا مرة واحدة.
          </div>
        </div>
      ) : (
        blocks.map((b) =>
          b.rows.length === 0 ? null : (
            <div key={b.id} style={{ ...cardStyle, overflow: "hidden" }}>
              <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line-2)" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{b.meta}</div>
              </div>
              {b.rows.map((p) => (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "13px 16px", borderTop: "1px solid var(--line-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, border: `1px solid ${KIND_COLORS[p.kind]}`, color: KIND_COLORS[p.kind] }}>
                      {KIND_LABELS[p.kind]}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, direction: "ltr" }}>
                      {KIND_VERBS[p.kind]} {padTime(p.time)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                    أضافه {p.setByName} · قائم منذ {formatDateAr(p.since)}
                  </div>
                  {p.note && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>السبب: {p.note}</div>}
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>الأيام: {p.days.length ? p.days.join("، ") : "كل أيام الدوام"}</div>
                  {!readOnly && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() =>
                        setFormOpen({
                          existing: { id: p.id, studentId: p.studentId, studentName: p.name, since: p.since, kind: p.kind, time: p.time, note: p.note, days: p.days },
                        })
                      }
                      style={{ minHeight: 40, padding: "9px 15px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12.5, cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleRowDelete(p.id)}
                      disabled={deletingId === p.id}
                      style={{ minHeight: 40, padding: "9px 15px", borderRadius: 9, border: "1px solid rgba(224,138,138,0.45)", background: "linear-gradient(135deg, rgba(224,138,138,0.16), rgba(224,138,138,0.03))", color: "var(--bad-ink)", fontSize: 12.5, cursor: "pointer", opacity: deletingId === p.id ? 0.6 : 1 }}
                    >
                      {deletingId === p.id ? "جارٍ الحذف…" : "حذف الإذن"}
                    </button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )
        )
      )}

      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
        الإذن ليس يوميًا: يلازم الطالب من تاريخ إضافته ويُطبَّق في أيامه المختارة حتى يُحذف من هذه الشاشة.
      </div>

      {formOpen && (
        <PermitForm
          halaqat={halaqat}
          workDays={workDays}
          existing={formOpen.existing}
          initialStudentId={formOpen.initialStudentId}
          onClose={() => setFormOpen(null)}
          onSaved={(wasNew) =>
            setNotice(
              wasNew
                ? "الإذن يلازم الطالب من اليوم فصاعدًا — لا يحتاج تكرارًا كل يوم، ويبقى حتى يُحذف."
                : ""
            )
          }
          onDeleted={() => setNotice("حُذف الإذن — عاد الطالب إلى دوام الفوج المعتاد.")}
        />
      )}
    </div>
  );
}

/** بحث عن طالب بالاسم أو الرقم — يُظهر فورًا إن كان لديه إذن دخول/خروج أم لا. */
function StudentPermitSearch({ halaqat, onAdd }: { halaqat: Halqa[]; onAdd?: (studentId: string) => void }) {
  const [q, setQ] = useState("");
  const query = q.trim();

  const hits = useMemo(() => {
    if (!query) return [];
    const out: { id: string; no: number; name: string; halqaName: string; permits: Permit[] }[] = [];
    for (const h of halaqat) {
      for (const s of h.students) {
        if (s.name.includes(query) || String(s.no) === query) {
          out.push({ ...s, halqaName: h.name, permits: h.permits.filter((p) => p.studentId === s.id) });
        }
      }
    }
    return out.slice(0, 15);
  }, [halaqat, query]);

  return (
    <div style={{ ...cardStyle, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن طالب بالاسم أو الرقم — هل لديه إذن؟" style={inputStyle()} />
      {query && hits.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-3)" }}>لا طالب بهذا الاسم أو الرقم.</div>}
      {hits.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid var(--line-2)" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600 }}>{s.name}</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>#{s.no} · {s.halqaName}</span>
          {s.permits.length === 0 ? (
            <span style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, border: "1px solid var(--line)", color: "var(--ink-2)" }}>لا يوجد إذن</span>
              {onAdd && (
                <button type="button" onClick={() => onAdd(s.id)} style={{ ...primaryButtonStyle, padding: "6px 13px", fontSize: 12.5 }}>
                  إضافة إذن لهذا الطالب
                </button>
              )}
            </span>
          ) : (
            <span style={{ marginInlineStart: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {s.permits.map((p) => (
                <span key={p.id} style={{ padding: "4px 11px", borderRadius: 999, fontSize: 12, border: `1px solid ${KIND_COLORS[p.kind]}`, color: KIND_COLORS[p.kind] }}>
                  {KIND_LABELS[p.kind]} — {KIND_VERBS[p.kind]} {padTime(p.time)}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
