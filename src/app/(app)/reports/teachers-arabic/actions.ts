"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildArabicTeachersRows, type ArabicTeachersRow } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function previewArabicTeachersReport(from: string, to: string): Promise<{ rows: ArabicTeachersRow[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  return { rows: await buildArabicTeachersRows(from, to) };
}

export async function issueArabicTeachersReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const name = String(formData.get("name") || "").trim();
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  // ملاحظات الإدارة لكل مدرّس — تُحفظ مع التقرير
  let notes: Record<string, string> = {};
  try {
    notes = JSON.parse(String(formData.get("notesJson") || "{}"));
  } catch {
    notes = {};
  }

  const rows = await buildArabicTeachersRows(from, to);
  if (rows.length === 0) return { error: "لا مدرّسو قراءة عربية بحلقات فعلية بعد." };

  const paramsJson = JSON.stringify({ notes });
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "TEACHERS_AR", name, fromDate: from, toDate: to, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "TEACHERS_AR", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
