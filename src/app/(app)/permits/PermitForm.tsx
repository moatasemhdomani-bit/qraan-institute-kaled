"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { savePermit, deletePermit, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";

const initialState: FormState = {};

const KINDS = [
  { id: "ENTRY", label: "إذن دخول", verb: "يدخل في" },
  { id: "EXIT", label: "إذن خروج", verb: "يخرج في" },
] as const;

type Halqa = { id: string; name: string; students: { id: string; no: number; name: string }[] };

export type ExistingPermit = {
  id: string;
  studentId: string;
  studentName: string;
  since: string;
  kind: "ENTRY" | "EXIT";
  time: string;
  note: string | null;
};

export default function PermitForm({
  halaqat,
  existing,
  onClose,
  onSaved,
  onDeleted,
}: {
  halaqat: Halqa[];
  existing: ExistingPermit | null;
  onClose: () => void;
  onSaved?: (wasNew: boolean) => void;
  onDeleted?: () => void;
}) {
  const [state, formAction, pending] = useActionState(savePermit, initialState);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [halqaId, setHalqaId] = useState(halaqat[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState(existing?.studentId ?? "");
  const [kind, setKind] = useState<"ENTRY" | "EXIT" | "">(existing?.kind ?? "");
  const [time, setTime] = useState(existing?.time ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  const wasNew = !existing;
  useEffect(() => {
    if (state.ok) {
      onSaved?.(wasNew);
      onClose();
    }
  }, [state.ok, onClose, onSaved, wasNew]);

  const activeHalqa = halaqat.find((h) => h.id === halqaId) ?? null;
  const studentList = useMemo(
    () => (activeHalqa ? activeHalqa.students.filter((s) => !search.trim() || s.name.includes(search.trim())) : []),
    [activeHalqa, search]
  );

  const kindInfo = KINDS.find((k) => k.id === kind);

  async function handleDelete() {
    if (!existing) return;
    setDeleting(true);
    const res = await deletePermit(existing.id);
    setDeleting(false);
    if (res.error) setDeleteError(res.error);
    else {
      onDeleted?.();
      onClose();
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={existing ? "تعديل إذن" : "إذن جديد"}
      subtitle={existing ? `${existing.studentName} — الإذن قائم منذ ${existing.since}` : "اختاروا الطالب ثم النوع والوقت"}
      footer={
        <>
          <button form="permit-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, flex: 1, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ الإذن"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ minHeight: 48, padding: "12px 16px", borderRadius: 11, border: "1px solid rgba(224,138,138,0.45)", background: "linear-gradient(135deg, rgba(224,138,138,0.18), rgba(224,138,138,0.04))", color: "#E6A0A0", fontSize: 13.5, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? "جارٍ الحذف…" : "حذف"}
            </button>
          )}
          <button type="button" onClick={onClose} style={{ minHeight: 48, padding: "12px 18px", borderRadius: 11, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
        </>
      }
    >
      {(state.error || deleteError) && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error || deleteError}
        </div>
      )}

      <form id="permit-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <input type="hidden" name="id" value={existing?.id ?? ""} />
        <input type="hidden" name="studentId" value={existing?.studentId ?? studentId} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="time" value={time} />
        <input type="hidden" name="note" value={note} />

        {existing ? (
          <div style={{ padding: "13px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--card-2-grad)" }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>الطالب</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{existing.studentName}</div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>الحلقة</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {halaqat.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setHalqaId(h.id);
                      setStudentId("");
                    }}
                    style={chipStyle(h.id === halqaId)}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>الطالب</div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم" style={{ ...inputStyle(), marginBottom: 9 }} />
              {studentList.length === 0 ? (
                <div style={{ padding: "13px 14px", borderRadius: 12, border: "1px dashed var(--line)", background: "var(--card-2-grad)", fontSize: 13, color: "var(--ink-2)" }}>
                  لا طالب مطابق في هذه الحلقة.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 230, overflow: "auto" }}>
                  {studentList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStudentId(s.id)}
                      style={{
                        textAlign: "start",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: s.id === studentId ? "1px solid var(--accent-line)" : "1px solid var(--line-2)",
                        background: s.id === studentId ? "var(--chip)" : "var(--card-grad)",
                        color: "var(--ink)",
                        fontSize: 13.5,
                        cursor: "pointer",
                      }}
                    >
                      {s.name} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>#{s.no}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>نوع الإذن</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} style={{ ...chipStyle(kind === k.id), minHeight: 44, padding: "10px 22px" }}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>
            {kindInfo ? `الوقت الذي ${kindInfo.verb}ه الطالب` : "وقت الإذن"}
          </label>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="09:15"
            style={{ width: 130, minHeight: 48, padding: 11, borderRadius: 11, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 18, textAlign: "center", direction: "ltr" }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-3)" }}>بصيغة 24 ساعة — مثل 09:15 للدخول أو 11:30 للخروج.</div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>سبب الإذن (اختياري)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="ما يفيد المدرّس والإدارة"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--input-grad)", color: "var(--ink)", fontSize: 14, lineHeight: 1.6, resize: "vertical" }}
          />
        </div>

        <div style={{ padding: "13px 14px", borderRadius: 12, border: "1px solid rgba(212,175,55,0.4)", background: "linear-gradient(135deg, rgba(212,175,55,0.13), rgba(212,175,55,0.02))", fontSize: 12.5, color: "var(--ink)" }}>
          الإذن ليس يوميًا: يلازم الطالب من تاريخ إضافته ويُطبَّق في كل أيام الدوام حتى يُحذف من هذه الشاشة.
        </div>
      </form>
    </Drawer>
  );
}
