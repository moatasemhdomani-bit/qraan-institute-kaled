"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildAwqafMarks, type AwqafMarksRow } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function previewAwqafMarks(batchId: string): Promise<{ date: string; rows: AwqafMarksRow[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!batchId) return { error: "اختاروا دفعة سبر الأوقاف." };
  const res = await buildAwqafMarks(batchId);
  if (!res) return { error: "الدفعة غير موجودة." };
  return res;
}

export async function issueAwqafMarksReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const batchId = String(formData.get("batchId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!batchId) return { error: "اختاروا دفعة سبر الأوقاف." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  const batch = await prisma.awqafBatch.findUnique({ where: { id: batchId } });
  if (!batch) return { error: "الدفعة غير موجودة." };

  const paramsJson = JSON.stringify({ batchId });
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "AWQAF_MARKS", name, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "AWQAF_MARKS", name, fromDate: batch.date, toDate: batch.date, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
