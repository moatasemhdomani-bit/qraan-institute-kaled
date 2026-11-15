"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { isValidDate } from "@/lib/daily";
import { formatMoney, CURRENCY_LABEL, type Currency } from "@/lib/finance";

export type FinanceResult = { error?: string; ok?: boolean };

const isStaff = (role: string) => role === "DIRECTOR" || role === "ADMIN";

/** رصيد الصندوق الآن بعملة: مجموع الإيداعات ناقص مجموع السحوبات */
async function balance(currency: Currency): Promise<number> {
  const sums = await prisma.financeTxn.groupBy({ by: ["kind"], where: { currency }, _sum: { amount: true } });
  const dep = sums.find((s) => s.kind === "DEPOSIT")?._sum.amount ?? 0;
  const wd = sums.find((s) => s.kind === "WITHDRAW")?._sum.amount ?? 0;
  return dep - wd;
}

/** إيداع أو سحب من صندوق المعهد — المبلغ والتاريخ وسبب العملية إجبارية، والسحب لا يتجاوز الرصيد. */
export async function addFinanceTxn(input: { kind: string; currency: string; amount: number; date: string; reason: string }): Promise<FinanceResult> {
  const session = await getSession();
  if (!session || !isStaff(session.role)) return { error: "المالية من صلاحية مدير المعهد والإداري." };
  if (input.kind !== "DEPOSIT" && input.kind !== "WITHDRAW") return { error: "اختاروا نوع العملية: إيداع أو سحب." };
  if (input.currency !== "SYP" && input.currency !== "USD") return { error: "اختاروا العملة." };
  const currency = input.currency as Currency;
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1) return { error: "اكتبوا المبلغ." };
  if (!isValidDate(input.date)) return { error: "اختاروا تاريخ العملية." };
  const reason = String(input.reason || "").trim();
  if (!reason) return { error: "سبب العملية إجباري." };
  if (reason.length > 300) return { error: "سبب العملية طويل — 300 حرف على الأكثر." };

  if (input.kind === "WITHDRAW") {
    const bal = await balance(currency);
    if (amount > bal) return { error: `رصيد ${CURRENCY_LABEL[currency]} لا يكفي — الرصيد الحالي ${formatMoney(bal, currency)}.` };
  }

  await prisma.financeTxn.create({ data: { kind: input.kind, currency, amount, date: input.date, reason, byId: session.userId } });
  await logAction(session.userId, `${input.kind === "DEPOSIT" ? "أودع" : "سحب"} ${formatMoney(amount, currency)} ${input.kind === "DEPOSIT" ? "في" : "من"} صندوق المعهد — ${reason}`);
  revalidatePath("/finance");
  return { ok: true };
}

/** حذف عملية مسجّلة بالغلط — لمدير المعهد وحده، ولا يُحذف إيداع إن صار الرصيد بعده سالبًا. */
export async function deleteFinanceTxn(id: string): Promise<FinanceResult> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") return { error: "حذف عمليات المالية من صلاحية مدير المعهد فقط." };
  const t = await prisma.financeTxn.findUnique({ where: { id } });
  if (!t) return { error: "العملية غير موجودة." };
  if (t.kind === "DEPOSIT" && (await balance(t.currency)) - t.amount < 0) return { error: "لا يمكن حذف هذا الإيداع — يصبح رصيد الصندوق سالبًا." };
  await prisma.financeTxn.delete({ where: { id } });
  await logAction(session.userId, `حذف عملية ${t.kind === "DEPOSIT" ? "إيداع" : "سحب"} ${formatMoney(t.amount, t.currency)} من المالية (${t.date}) — ${t.reason}`);
  revalidatePath("/finance");
  return { ok: true };
}
