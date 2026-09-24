"use client";

import { useCallback, useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveHalqa, type FormState } from "./actions";
import { inputStyle, primaryButtonStyle, cardStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";
import Select from "@/components/Select";

type HalqaRow = { id: string; name: string; teacherId: string; teacherName: string; cohortId: string; cohortName: string; count: number };
type CohortRow = { id: string; name: string; isRotating: boolean };
const initialState: FormState = {};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "8px 14px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--card-2-grad)", display: "flex", alignItems: "baseline", gap: 7 }}>
      <span style={{ fontSize: 18, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</span>
    </div>
  );
}

export default function HalaqatClient({
  halaqat,
  teachers,
  cohorts,
}: {
  halaqat: HalqaRow[];
  teachers: { id: string; name: string }[];
  cohorts: CohortRow[];
}) {
  const router = useRouter();
  // null = مغلق؛ وإلا: الحلقة المعدَّلة أو قيم ابتدائية لحلقة جديدة
  const [halqaDrawer, setHalqaDrawer] = useState<{ editing: HalqaRow | null; cohortId?: string } | null>(null);
  const closeHalqa = useCallback(() => setHalqaDrawer(null), []);

  const totalStudents = halaqat.reduce((sum, h) => sum + h.count, 0);
  const canCreateHalqa = teachers.length > 0 && cohorts.length > 0;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Stat label="حلقة" value={halaqat.length} />
        <Stat label="فوج" value={cohorts.length} />
        <Stat label="طالبًا" value={totalStudents} />
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canCreateHalqa && (
            <button type="button" onClick={() => setHalqaDrawer({ editing: null })} style={primaryButtonStyle}>
              + إنشاء حلقة
            </button>
          )}
        </div>
      </div>

      {teachers.length === 0 && (
        <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>لا يوجد مدرّسون بعد</div>
          <div style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 14 }}>الحلقة تُسند إلى مدرّس وفوج — أضف مدرّسًا أولًا.</div>
          <button type="button" onClick={() => router.push("/users")} style={primaryButtonStyle}>
            أضف مدرّسًا
          </button>
        </div>
      )}

      {cohorts.map((c) => {
        const list = halaqat.filter((h) => h.cohortId === c.id);
        const students = list.reduce((sum, h) => sum + h.count, 0);
        return (
          <section key={c.id} style={{ ...cardStyle, overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                padding: "12px 16px",
                background: "var(--head-grad)",
                borderBottom: "1px solid var(--line-2)",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name.startsWith("فوج") ? c.name : `فوج ${c.name}`}</div>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, border: "1px solid var(--line)", background: "var(--chip)", color: "var(--ink-2)" }}>
                {c.isRotating ? "قلّاب" : "ثابت"}
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {list.length} حلقة · {students} طالبًا
              </span>
              <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {teachers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHalqaDrawer({ editing: null, cohortId: c.id })}
                    style={{ padding: "6px 12px", borderRadius: 9, border: "1px dashed var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    + حلقة في هذا الفوج
                  </button>
                )}
              </div>
            </div>

            {list.length === 0 ? (
              <div style={{ padding: "18px 16px", fontSize: 13, color: "var(--ink-3)" }}>لا حلقات في هذا الفوج بعد.</div>
            ) : (
              <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
                {list.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--line-2)",
                      background: "var(--card-2-grad)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, overflowWrap: "anywhere" }}>{h.name}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-2)", overflowWrap: "anywhere" }}>المدرس: {h.teacherName}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{h.count} طالبًا</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHalqaDrawer({ editing: h })}
                      style={{ flex: "none", padding: "7px 13px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}
                    >
                      تعديل
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {halqaDrawer && (
        <HalqaForm
          key={halqaDrawer.editing?.id ?? "new-" + (halqaDrawer.cohortId ?? "")}
          initial={halqaDrawer.editing}
          initialCohortId={halqaDrawer.cohortId}
          teachers={teachers}
          cohorts={cohorts}
          onClose={closeHalqa}
        />
      )}
    </>
  );
}

function HalqaForm({
  initial,
  initialCohortId,
  teachers,
  cohorts,
  onClose,
}: {
  initial: HalqaRow | null;
  initialCohortId?: string;
  teachers: { id: string; name: string }[];
  cohorts: CohortRow[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveHalqa, initialState);
  const [teacherId, setTeacherId] = useState(initial?.teacherId ?? "");
  const [cohortId, setCohortId] = useState(initial?.cohortId ?? initialCohortId ?? "");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "تعديل حلقة" : "إنشاء حلقة"}
      subtitle="اسم الحلقة ومدرّسها وفوجها"
      footer={
        <>
          <button form="halqa-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}>
            إلغاء
          </button>
        </>
      }
    >
      {state.error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>
          {state.error}
        </div>
      )}
      <form id="halqa-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>اسم الحلقة</label>
          <input name="name" defaultValue={initial?.name} style={inputStyle()} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>المدرس</label>
          <Select
            name="teacherId"
            value={teacherId}
            onChange={setTeacherId}
            options={teachers.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="من العاملين المسجّلين كمدرّس"
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الفوج</label>
          <Select
            name="cohortId"
            value={cohortId}
            onChange={setCohortId}
            options={cohorts.map((c) => ({ value: c.id, label: `${c.name} — ${c.isRotating ? "قلّاب" : "ثابت"}` }))}
            placeholder="اختر الفوج"
          />
        </div>
      </form>
    </Drawer>
  );
}
