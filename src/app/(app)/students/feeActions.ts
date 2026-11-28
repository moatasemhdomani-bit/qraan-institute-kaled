"use server";

import { prisma, nameWithNasab, studentFullName } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { today } from "@/lib/daily";

export type FeePayment = { id: string; amount: number; date: string; by: string };

/** دفعات رسوم الطالب المودَعة في الصندوق (الأحدث أولًا) */
export async function feePaymentsOf(studentId: string): Promise<FeePayment[]> {
  const rows = await prisma.financeTxn.findMany({
    where: { studentId },
    include: { by: { select: { name: true, familyName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ id: r.id, amount: r.amount, date: r.date, by: nameWithNasab(r.by.name, r.by.familyName) }));
}

/** يودع ما قُبض من رسوم الطالب في الصندوق باسم المستخدم (ل.س.ج) */
export async function depositStudentFee(studentId: string, amount: number, userId: string): Promise<void> {
  const s = await prisma.student.findUnique({ where: { id: studentId }, select: { name: true, fatherName: true, familyName: true, studentNo: true } });
  if (!s) return;
  await prisma.financeTxn.create({
    data: {
      kind: "DEPOSIT",
      currency: "SYP",
      amount,
      date: today(),
      reason: `رسوم الطالب ${studentFullName(s.name, s.fatherName, s.familyName)} #${s.studentNo}`,
      byId: userId,
      studentId,
    },
  });
  await logAction(userId, `قبض ${amount.toLocaleString("en-US")} ل.س.ج رسومًا من الطالب ${await studentRef(studentId)} وأودعها في الصندوق`);
  revalidatePath("/finance");
}

/** حذف دفعة رسوم: يُحذف إيداعها من الصندوق معها — المدير أو من سجّلها */
export async function deleteFeePayment(id: string): Promise<{ error?: string; payments?: FeePayment[] }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const txn = await prisma.financeTxn.findUnique({ where: { id } });
  if (!txn || !txn.studentId) return { error: "الدفعة غير موجودة." };
  if (session.role !== "DIRECTOR" && txn.byId !== session.userId) return { error: "يحذف الدفعة مدير المعهد أو من سجّلها." };
  await prisma.financeTxn.delete({ where: { id } });
  await logAction(session.userId, `حذف دفعة رسوم ${txn.amount.toLocaleString("en-US")} ل.س.ج للطالب ${await studentRef(txn.studentId)} وإيداعها من الصندوق`);
  revalidatePath("/finance");
  revalidatePath("/students");
  return { payments: await feePaymentsOf(txn.studentId) };
}
