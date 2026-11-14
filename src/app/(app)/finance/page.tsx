import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, formatDateTimeAr } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import FinanceClient from "./FinanceClient";

/** المالية: صندوق المعهد — إيداع وسحب بالليرة السورية، يسجّله مدير المعهد والإداري. */
export default async function FinancePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const txns = await prisma.financeTxn.findMany({
    include: { by: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <PageHeader title="المالية" subtitle="صندوق المعهد: إيداع وسحب بالليرة السورية — مع سبب كل عملية." />
      <FinanceClient
        today={today()}
        canDelete={session.role === "DIRECTOR"}
        txns={txns.map((t) => ({
          id: t.id,
          kind: t.kind,
          amount: t.amount,
          date: t.date,
          reason: t.reason,
          byName: t.by.name,
          at: formatDateTimeAr(t.createdAt),
        }))}
      />
    </>
  );
}
