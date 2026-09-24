"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCohort, deleteCohort, type FormState } from "./actions";
import { chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import Drawer from "@/components/Drawer";

const initialState: FormState = {};

/** درج إضافة فوج جديد — الاسم والنوع فقط؛ التوقيت يُضبط لاحقًا من «إدارة الأفواج». */
export default function CohortForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(createCohort, initialState);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <Drawer
      open
      onClose={onClose}
      title="إضافة فوج"
      subtitle="فوج جديد تُسند إليه الحلقات — يُضبط توقيته من «إدارة الأفواج»"
      footer={
        <>
          <button form="cohort-form" type="submit" disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.7 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "إضافة الفوج"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 14, cursor: "pointer" }}
          >
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
      <form id="cohort-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input type="hidden" name="isRotating" value={isRotating ? "1" : "0"} />
        <div>
          <label style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 5 }}>اسم الفوج</label>
          <input name="name" style={inputStyle()} placeholder="مثلاً: ثابت 4" autoFocus />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 7 }}>نوع الدوام</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setIsRotating(false)} style={chipStyle(!isRotating)}>
              ثابت — وقت دوام واحد
            </button>
            <button type="button" onClick={() => setIsRotating(true)} style={chipStyle(isRotating)}>
              قلّاب — وقتان يتبادلان أسبوعيًا
            </button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}

/** زر حذف فوج مع تأكيد — يرفضه الخادم إن كان في الفوج حلقات. */
export function DeleteCohortButton({ id, name, halaqatCount }: { id: string; name: string; halaqatCount: number }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteCohort, initialState);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const small: React.CSSProperties = { padding: "6px 11px", borderRadius: 9, fontSize: 12, fontFamily: "inherit", cursor: "pointer" };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={halaqatCount > 0 ? "في هذا الفوج حلقات — انقلها أولًا" : "حذف الفوج"}
        style={{ ...small, border: "1px solid var(--notice-line)", background: "transparent", color: "#E08A8A" }}
      >
        حذف الفوج
      </button>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input type="hidden" name="id" value={id} />
      {halaqatCount > 0 ? (
        <span style={{ fontSize: 12, color: "#E08A8A" }}>
          لا يمكن حذف «{name}» — فيه {halaqatCount} حلقة، انقلها إلى فوج آخر أولًا.
        </span>
      ) : (
        <>
          <span style={{ fontSize: 12, color: "var(--ink-2)" }}>حذف «{name}» نهائيًا؟</span>
          <button type="submit" disabled={pending} style={{ ...small, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", color: "var(--ink)" }}>
            {pending ? "…" : "نعم، احذف"}
          </button>
        </>
      )}
      <button type="button" onClick={() => setConfirming(false)} style={{ ...small, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)" }}>
        {halaqatCount > 0 ? "حسنًا" : "تراجع"}
      </button>
      {state.error && <span style={{ width: "100%", fontSize: 12, color: "#E08A8A" }}>{state.error}</span>}
    </form>
  );
}
