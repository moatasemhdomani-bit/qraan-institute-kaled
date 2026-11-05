"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildHadithTeachersRows, type HadithTeachersRow } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function previewHadithReport(from: string, to: string): Promise<{ rows: HadithTeachersRow[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  return { rows: await buildHadithTeachersRows(from, to) };
}

export async function issueHadithReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const name = String(formData.get("name") || "").trim();
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  const rows = await buildHadithTeachersRows(from, to);
  if (rows.length === 0) return { error: "لا مدرّسون بحلقات فعلية بعد." };

  const paramsJson = "{}";
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "HADITH", name, fromDate: from, toDate: to, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "HADITH", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
