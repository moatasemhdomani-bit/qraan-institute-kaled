"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveHalqa, type FormState } from "./actions";
import { inputStyle, primaryButtonStyle, cardStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";

type HalqaRow = { id: string; name: string; teacherId: string; teacherName: string; cohortId: string; cohortName: string; count: number };
const initialState: FormState = {};

export default function HalaqatClient({
  halaqat,
  teachers,
  cohorts,
}: {
  halaqat: HalqaRow[];
  teachers: { id: string; name: string }[];
  cohorts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<HalqaRow | null>(null);

  function openNew() {
    setEditing(null);
    setDrawerOpen(true);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {teachers.length > 0 && (
          <button onClick={openNew} style={primaryButtonStyle}>
            إنشاء حلقة
          </button>
        )}
      </div>

      <div style={{ ...cardStyle, overflow: "auto" }}>
        {halaqat.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>لا توجد حلقات بعد</div>
            <div style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 16 }}>
              الحلقة تُسند إلى مدرّس وفوج — {teachers.length === 0 ? "أضف مدرّسًا أولًا." : "أنشئ أول حلقة الآن."}
            </div>
            <button
              onClick={() => (teachers.length === 0 ? router.push("/users") : openNew())}
              style={primaryButtonStyle}
            >
              {teachers.length === 0 ? "أضف مدرّسًا أولًا" : "إنشاء حلقة"}
            </button>
          </div>
        ) : (
          <>
          <div className="list-table-wrap">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1.1fr 1.5fr 0.6fr 90px",
                gap: 12,
                padding: "11px 16px",
                background: "var(--head-grad)",
                fontSize: 12,
                color: "var(--ink-2)",
                fontWeight: 600,
                minWidth: 620,
              }}
            >
              <div>اسم الحلقة</div>
              <div>المدرس المسؤول</div>
              <div>الفوج</div>
              <div>عدد الطلاب</div>
              <div />
            </div>
            {halaqat.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.1fr 1.5fr 0.6fr 90px",
                  gap: 12,
                  padding: "13px 16px",
                  borderTop: "1px solid var(--line-2)",
                  alignItems: "center",
                  fontSize: 14,
                  minWidth: 620,
                }}
              >
                <div style={{ fontWeight: 600 }}>{h.name}</div>
                <div style={{ color: "var(--ink-2)", fontSize: 13 }}>{h.teacherName}</div>
                <div>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}>
                    {h.cohortName}
                  </span>
                </div>
                <div style={{ color: "var(--ink-2)", fontSize: 13 }}>{h.count}</div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setEditing(h);
                      setDrawerOpen(true);
                    }}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                  >
                    تعديل
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="list-cards">
            {halaqat.map((h) => (
              <div key={h.id} style={{ padding: "13px 14px", borderTop: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{h.teacherName}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "var(--chip)", border: "1px solid var(--line)", fontSize: 12 }}>
                      {h.cohortName}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{h.count} طالبًا</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditing(h);
                    setDrawerOpen(true);
                  }}
                  style={{ flex: "none", padding: "8px 14px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--btn-soft)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}
                >
                  تعديل
                </button>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {drawerOpen && (
        <HalqaForm key={editing?.id ?? "new"} initial={editing} teachers={teachers} cohorts={cohorts} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}

function HalqaForm({
  initial,
  teachers,
  cohorts,
  onClose,
}: {
  initial: HalqaRow | null;
  teachers: { id: string; name: string }[];
  cohorts: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveHalqa, initialState);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "تعديل حلقة" : "إنشاء حلقة"}
      subtitle="نموذج الإنشاء/التعديل — إدارة الحلقات"
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
      <form id="halqa-form" action={formAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        <input type="hidden" name="id" value={initial?.id ?? ""} />
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>اسم الحلقة</label>
          <input name="name" defaultValue={initial?.name} style={inputStyle()} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>المدرس</label>
          <select name="teacherId" defaultValue={initial?.teacherId ?? ""} style={inputStyle()}>
            <option value="" disabled>
              من العاملين المسجّلين كمدرّس
            </option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>الفوج</label>
          <select name="cohortId" defaultValue={initial?.cohortId ?? ""} style={inputStyle()}>
            <option value="" disabled>
              من الأفواج الخمسة
            </option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Drawer>
  );
}
