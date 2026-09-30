"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildArabicHalaqatBlocks, type ArabicHalaqatBlock } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function previewArabicHalaqatReport(from: string, to: string, halqaScope: string): Promise<{ blocks: ArabicHalaqatBlock[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  return { blocks: await buildArabicHalaqatBlocks(from, to, halqaScope || "all") };
}

export async function issueArabicHalaqatReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const halqaScope = String(formData.get("halqaScope") || "all");
  const name = String(formData.get("name") || "").trim();

  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  const blocks = await buildArabicHalaqatBlocks(from, to, halqaScope);
  if (blocks.length === 0) return { error: "لا طلاب في نطاق الحلقات المختار." };

  const paramsJson = JSON.stringify({ halqaScope });
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "HALAQAT_AR", name, fromDate: from, toDate: to, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "HALAQAT_AR", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
