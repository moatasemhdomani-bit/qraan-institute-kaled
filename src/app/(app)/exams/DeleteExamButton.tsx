"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExam } from "./actions";
import { deleteAwqafResult } from "./awqaf-batches/actions";

/**
 * زر «حذف السبر» بخطوة تأكيد. يحذف سبرًا عاديًا (examId) أو نتيجة سبر الأوقاف الفعلي (awqafResultId).
 * الصلاحية يتحقق منها الخادم: الإدارة أي سبر، والمختبِر سبره هو فقط.
 */
export default function DeleteExamButton({
  examId,
  awqafResultId,
  onDeleted,
  big = false,
}: {
  examId?: string;
  awqafResultId?: string;
  onDeleted?: () => void;
  /** بحجم أزرار أسفل النموذج بدل زر الصف الصغير */
  big?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const base = {
    borderRadius: big ? 10 : 9,
    padding: big ? "10px 16px" : "6px 12px",
    fontSize: big ? 13.5 : 12,
    cursor: "pointer",
    fontFamily: "inherit",
  } as const;

  function run() {
    setError("");
    startTransition(async () => {
      const res = examId ? await deleteExam(examId) : awqafResultId ? await deleteAwqafResult(awqafResultId) : { error: "لا يوجد سبر." };
      if (res.error) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      onDeleted?.();
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          style={{ ...base, border: "1px solid rgba(224,138,138,0.45)", background: "transparent", color: "var(--bad-ink)" }}
        >
          حذف السبر
        </button>
        {error && <span style={{ fontSize: 11.5, color: "var(--bad-ink)" }}>{error}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>حذف نهائي؟</span>
      <button
        type="button"
        disabled={pending}
        onClick={run}
        style={{ ...base, border: "1px solid var(--bad)", background: "var(--bad)", color: "var(--on-status)", fontWeight: 700, opacity: pending ? 0.7 : 1 }}
      >
        {pending ? "جارٍ الحذف…" : "تأكيد الحذف"}
      </button>
      <button type="button" disabled={pending} onClick={() => setConfirming(false)} style={{ ...base, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)" }}>
        تراجع
      </button>
    </span>
  );
}
