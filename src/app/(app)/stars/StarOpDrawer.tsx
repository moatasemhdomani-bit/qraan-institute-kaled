"use client";

import { useState, useTransition, type ReactNode } from "react";
import Drawer from "@/components/Drawer";
import NumberField from "@/components/NumberField";
import { chipStyle, primaryButtonStyle } from "@/lib/ui";
import type { StarKind } from "@/lib/stars";
import type { StarResult } from "./actions";

/** رسالة الإيداع فوق رصيد نجوم النشاط */
const chargeMsg = (limit: number) => (limit <= 0 ? "رصيد نجوم النشاط 0 — لا يمكن الإيداع حتى تودع الإدارة رصيدك." : `رصيد نجوم النشاط ${limit} فقط — لا يمكن إيداع أكثر منه.`);

/** نافذة عملية النجوم: إيداع أو سحب، العدد، ثم التأكيد. */
export default function StarOpDrawer({
  title,
  subtitle,
  info,
  children,
  onSubmit,
  onClose,
  canSubmit = true,
  kinds = ["CHARGE", "WITHDRAW"],
  balance,
  defaultKind,
  chargeLimit,
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
  /** العمليات المتاحة */
  kinds?: StarKind[];
  /** رصيد الطالب — سحب أكثر منه يُمنع برسالة «نجوم الطالب أقل من ذلك» */
  balance?: number;
  /** العملية المختارة سلفًا (يمكن تغييرها) — مسؤول النشاط: السحب */
  defaultKind?: StarKind;
  /** حدّ الإيداع (رصيد نجوم النشاط) — إيداع أكثر منه يُمنع برسالة */
  chargeLimit?: number;
}) {
  const [kind, setKind] = useState<StarKind | "">(defaultKind ?? (kinds.length === 1 ? kinds[0] : ""));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const n0 = parseInt(amount, 10) || 0;
  const tooMuch = kind === "WITHDRAW" && balance != null && n0 > balance;
  // مسؤول النشاط: لا إيداع برصيد نشاط صفر، ولا أكثر من رصيده
  const overCharge = kind === "CHARGE" && chargeLimit != null && (chargeLimit <= 0 || n0 > chargeLimit);

  function submit() {
    setError("");
    if (!kind) return setError("اختاروا العملية: إيداع أو سحب.");
    const n = parseInt(amount, 10);
    if (!n || n < 1) return setError("اكتبوا عدد النجوم.");
    if (kind === "WITHDRAW" && balance != null && n > balance) return setError("نجوم الطالب أقل من ذلك");
    if (kind === "CHARGE" && chargeLimit != null && n > chargeLimit) return setError(chargeMsg(chargeLimit));
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
            disabled={pending || !canSubmit || overCharge}
            style={{ ...primaryButtonStyle, flex: 1, opacity: pending || !canSubmit || overCharge ? 0.6 : 1 }}
          >
            {pending ? "جارٍ التنفيذ…" : kind ? `تأكيد ${kind === "CHARGE" ? "الإيداع" : "السحب"}` : "تأكيد العملية"}
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
            إيداع ＋
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
      {overCharge && !error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{chargeMsg(chargeLimit ?? 0)}</div>
      )}
      {tooMuch && !error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>نجوم الطالب أقل من ذلك</div>
      )}
      {error && (
        <div style={{ padding: "12px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>
      )}
    </Drawer>
  );
}
