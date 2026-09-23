"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildTeachersRows, type TeachersPreviewRow } from "@/lib/reports";

export type { TeachersPreviewRow as PreviewRow } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function previewTeachersReport(from: string, to: string): Promise<{ rows: TeachersPreviewRow[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  const rows = await buildTeachersRows(from, to);
  return { rows };
}

export async function issueTeachersReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const name = String(formData.get("name") || "").trim();
  const notesJson = String(formData.get("notesJson") || "{}");

  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  let notes: Record<string, string> = {};
  try { notes = JSON.parse(notesJson); } catch { notes = {}; }

  const rows = await buildTeachersRows(from, to);
  if (rows.length === 0) return { error: "لا مدرّسون بحلقات فعلية بعد." };

  const paramsJson = JSON.stringify({ notes });

  const existing = await prisma.issuedReport.findFirst({
    where: { kind: "TEACHERS", name, fromDate: from, toDate: to, paramsJson },
  });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "TEACHERS", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });

  return { ok: true, reportId: created.id };
}
