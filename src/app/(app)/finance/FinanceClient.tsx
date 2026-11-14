"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cardStyle, chipStyle, inputStyle, primaryButtonStyle } from "@/lib/ui";
import { FINANCE_REASONS, formatSyp } from "@/lib/finance";
import NumberField from "@/components/NumberField";
import DateField from "@/components/DateField";
import Select from "@/components/Select";
import { addFinanceTxn, deleteFinanceTxn } from "./actions";

type Kind = "DEPOSIT" | "WITHDRAW";
type Txn = { id: string; kind: Kind; amount: number; date: string; reason: string; byName: string; at: string };

const KIND_LABEL: Record<Kind, string> = { DEPOSIT: "إيداع", WITHDRAW: "سحب" };

export default function FinanceClient({ txns, today, canDelete }: { txns: Txn[]; today: string; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // نموذج العملية
  const [kind, setKind] = useState<Kind | "">("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  // الفلترة
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [byFilter, setByFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "ar"));
  // الأسباب الجاهزة بحسب نوع العملية المختار في الفلترة، و«غير ذلك» لكل سبب كُتب يدويًا
  const readyReasons = [...FINANCE_REASONS.DEPOSIT, ...FINANCE_REASONS.WITHDRAW];
  const reasonOptions = [
    { value: "all", label: "الكل" },
    ...(kindFilter === "all" ? readyReasons : FINANCE_REASONS[kindFilter as Kind]).map((r) => ({ value: r, label: r })),
    { value: "other", label: "غير ذلك" },
  ];
  const byOptions = [{ value: "all", label: "الكل" }, ...uniq(txns.map((t) => t.byName)).map((n) => ({ value: n, label: n }))];

  const sum = (rows: Txn[], k: Kind) => rows.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0);
  const balance = sum(txns, "DEPOSIT") - sum(txns, "WITHDRAW");

  const shown = txns.filter(
    (t) =>
      (!from || t.date >= from) && (!to || t.date <= to) && (kindFilter === "all" || t.kind === kindFilter) &&
      (byFilter === "all" || t.byName === byFilter) &&
      (reasonFilter === "all" || (reasonFilter === "other" ? !readyReasons.includes(t.reason) : t.reason === reasonFilter))
  );
  const shownDep = sum(shown, "DEPOSIT");
  const shownWd = sum(shown, "WITHDRAW");

  function submit() {
    setError("");
    setDone("");
    if (!kind) return setError("اختاروا نوع العملية: إيداع أو سحب.");
    const n = parseInt(amount, 10);
    if (!n || n < 1) return setError("اكتبوا المبلغ.");
    if (!date) return setError("اختاروا تاريخ العملية.");
    if (!reason.trim()) return setError("سبب العملية إجباري.");
    if (kind === "WITHDRAW" && n > balance) return setError(`رصيد الصندوق لا يكفي — الرصيد الحالي ${formatSyp(balance)}.`);
    startTransition(async () => {
      const res = await addFinanceTxn({ kind, amount: n, date, reason });
      if (res.error) return setError(res.error);
      setDone(`تم تسجيل ${KIND_LABEL[kind]} ${formatSyp(n)}.`);
      setAmount("");
      setReason("");
      router.refresh();
    });
  }

  function remove(t: Txn) {
    if (!window.confirm(`حذف عملية ${KIND_LABEL[t.kind]} ${formatSyp(t.amount)} — «${t.reason}»؟`)) return;
    startTransition(async () => {
      const res = await deleteFinanceTxn(t.id);
      if (res.error) window.alert(res.error);
      else router.refresh();
    });
  }

  const stat = (label: string, value: string, color: string) => (
    <div style={{ ...cardStyle, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );

  const th: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)", textAlign: "start", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid var(--line)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {stat("الصندوق: ما في الخزنة حاليًا", formatSyp(balance), balance < 0 ? "var(--bad)" : "var(--ink)")}
      </div>

      {/* عملية جديدة */}
      <div style={{ ...cardStyle, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>عملية جديدة</div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["DEPOSIT", "WITHDRAW"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setError("");
                // السبب الجاهز من النوع الآخر لا يبقى
                if (FINANCE_REASONS[k === "DEPOSIT" ? "WITHDRAW" : "DEPOSIT"].includes(reason)) setReason("");
              }}
              style={{ ...chipStyle(kind === k), padding: "8px 18px", fontWeight: 600 }}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>المبلغ (ل.س)</div>
            <NumberField value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثلًا 50000" style={{ width: 180, minHeight: 44, padding: 10, fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>التاريخ</div>
            <DateField value={date} onChange={setDate} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>سبب العملية (إجباري)</div>
          {kind && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {FINANCE_REASONS[kind].map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} style={{ ...chipStyle(reason === r), padding: "6px 12px" }}>
                  {r}
                </button>
              ))}
            </div>
          )}
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={kind ? "اختاروا سببًا جاهزًا أو اكتبوه" : "اختاروا نوع العملية أولًا"}
            maxLength={300}
            style={{ ...inputStyle(), width: "100%" }}
          />
        </div>
        {error && <div style={{ padding: "10px 14px", borderRadius: 11, border: "1px solid var(--notice-line)", background: "var(--notice-soft)", fontSize: 13 }}>{error}</div>}
        {done && !error && <div style={{ fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>{done}</div>}
        <div>
          <button type="button" onClick={submit} disabled={pending} style={{ ...primaryButtonStyle, opacity: pending ? 0.6 : 1 }}>
            {pending ? "جارٍ الحفظ…" : "حفظ العملية"}
          </button>
        </div>
      </div>

      {/* السجل */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          padding: "12px 14px",
          borderRadius: 13,
          border: "1px solid var(--line)",
          background: "var(--card-2-grad)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>من تاريخ</span>
        <DateField value={from} onChange={setFrom} />
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>إلى تاريخ</span>
        <DateField value={to} onChange={setTo} />
        <div style={{ width: 170 }}>
          <Select
            value={kindFilter}
            onChange={(v) => {
              setKindFilter(v);
              setReasonFilter("all");
            }}
            options={[
              { value: "all", label: "كل العمليات" },
              { value: "DEPOSIT", label: "إيداع" },
              { value: "WITHDRAW", label: "سحب" },
            ]}
          />
        </div>
        <div style={{ width: 200 }}>
          <Select value={reasonFilter} onChange={setReasonFilter} options={reasonOptions} />
        </div>
        <div style={{ width: 170 }}>
          <Select value={byFilter} onChange={setByFilter} options={byOptions} />
        </div>
      </div>

      <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
        عدد النتائج: {shown.length} عملية — إيداع {formatSyp(shownDep)}، سحب {formatSyp(shownWd)}، الصافي {formatSyp(shownDep - shownWd)}
      </div>

      {shown.length === 0 ? (
        <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--ink-2)" }}>{txns.length === 0 ? "لا عمليات بعد." : "لا عمليات مطابقة للفلترة."}</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 13, background: "var(--card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr>
                <th style={th}>التاريخ</th>
                <th style={th}>العملية</th>
                <th style={th}>المبلغ</th>
                <th style={th}>السبب</th>
                <th style={th}>سجّلها</th>
                {canDelete && <th style={th}></th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{t.date.replace(/-/g, "/")}</td>
                  <td style={{ ...td, fontWeight: 700, color: t.kind === "DEPOSIT" ? "var(--ok)" : "var(--bad)" }}>{KIND_LABEL[t.kind]}</td>
                  <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{formatSyp(t.amount)}</td>
                  <td style={td}>{t.reason}</td>
                  <td style={{ ...td, fontSize: 12, color: "var(--ink-2)" }}>
                    {t.byName}
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.at}</div>
                  </td>
                  {canDelete && (
                    <td style={td}>
                      <button type="button" onClick={() => remove(t)} disabled={pending} style={{ border: "none", background: "none", color: "var(--bad)", cursor: "pointer", fontSize: 12 }}>
                        حذف
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
