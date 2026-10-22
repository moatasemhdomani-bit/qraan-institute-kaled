"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildRecitationLog, type LogBlock } from "@/lib/recitationLog";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

const parseIds = (raw: string): string[] | "all" => {
  if (!raw || raw === "all") return "all";
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length ? (v as string[]) : "all";
  } catch {
    return "all";
  }
};

export async function previewRecitationLog(from: string, to: string, halqaIds: string[] | "all"): Promise<{ blocks: LogBlock[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (halqaIds !== "all" && halqaIds.length === 0) return { error: "اختاروا حلقة واحدة على الأقل أو «كل الحلقات»." };
  return { blocks: await buildRecitationLog(halqaIds, from, to) };
}

export async function issueRecitationLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const halqaIds = parseIds(String(formData.get("halqaIds") || "all"));
  const name = String(formData.get("name") || "").trim();

  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  const blocks = await buildRecitationLog(halqaIds, from, to);
  if (blocks.length === 0) return { error: "لا حلقات في النطاق المختار." };

  const paramsJson = JSON.stringify({ halqaIds });
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "RECITATION_LOG", name, fromDate: from, toDate: to, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "RECITATION_LOG", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
