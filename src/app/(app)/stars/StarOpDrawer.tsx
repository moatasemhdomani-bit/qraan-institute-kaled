"use client";

import { useState, useTransition, type ReactNode } from "react";
import Drawer from "@/components/Drawer";
import NumberField from "@/components/NumberField";
import { chipStyle, primaryButtonStyle } from "@/lib/ui";
import type { StarKind } from "@/lib/stars";
import type { StarResult } from "./actions";

/** نافذة عملية النجوم: شحن أو سحب، العدد، ثم التأكيد. */
export default function StarOpDrawer({
  title,
  subtitle,
  info,
  children,
  onSubmit,
  onClose,
  canSubmit = true,
  kinds = ["CHARGE", "WITHDRAW"],
}: {
  title: string;
  subtitle: string;
  /** أرصدة تُعرض أعلى النموذج */
  info?: ReactNode;
  /** حقول إضافية قبل العملية (مثل اختيار الحلقة) */
  children?: ReactNode;
  onSubmit: (v: { kind: StarKind; amount: number }) => Promise<StarResult>;
  onClose: () => void;
  canSubmit?: boolean;
  /** العمليات المتاحة — مسؤول النشاط: السحب وحده */
  kinds?: StarKind[];
}) {
  const [kind, setKind] = useState<StarKind | "">(kinds.length === 1 ? kinds[0] : "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    if (!kind) return setError("اختاروا العملية: شحن أو سحب.");
    const n = parseInt(amount, 10);
    if (!n || n < 1) return setError("اكتبوا عدد النجوم.");
    startTransition(async () => {
      const res = await onSubmit({ kind, amount: n });
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !canSubmit}
            style={{ ...primaryButtonStyle, flex: 1, opacity: pending || !canSubmit ? 0.6 : 1 }}
          >
            {pending ? "جارٍ التنفيذ…" : kind ? `تأكيد ${kind === "CHARGE" ? "الشحن" : "السحب"}` : "تأكيد العملية"}
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
      {info}
      {children}
      <div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>العملية</div>
        <div style={{ display: "flex", gap: 8 }}>
          {kinds.includes("CHARGE") && (
          <button type="button" onClick={() => setKind("CHARGE")} style={{ ...chipStyle(kind === "CHARGE"), minHeight: 44, padding: "10px 24px" }}>
            شحن ＋
          </button>
          )}
          {kinds.includes("WITHDRAW") && (
          <button type="button" onClick={() => setKind("WITHDRAW")} style={{ ...chipStyle(kind === "WITHDRAW"), minHeight: 44, padding: "10px 24px" }}>
            سحب －
          </button>
          )}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 8 }}>عدد النجوم</div>
        <NumberField value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثلًا 5" style={{ width: 140, minHeight: 46, padding: 11, fontSize: 17 }} />
      </div>
      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>
      )}
    </Drawer>
  );
}
