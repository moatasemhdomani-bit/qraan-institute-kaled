"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { buildHalaqatBlocks, type HalaqatPreviewBlock } from "@/lib/reports";

export type { HalaqatPreviewBlock as PreviewBlock, HalaqatPreviewRow as PreviewRow } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function previewHalaqatReport(from: string, to: string, halqaScope: string): Promise<{ blocks: HalaqatPreviewBlock[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  const blocks = await buildHalaqatBlocks(from, to, halqaScope || "all");
  return { blocks };
}

export async function issueHalaqatReport(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const halqaScope = String(formData.get("halqaScope") || "all");
  const name = String(formData.get("name") || "").trim();
  const notesJson = String(formData.get("notesJson") || "{}");

  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  let notes: Record<string, string> = {};
  try {
    notes = JSON.parse(notesJson);
  } catch {
    notes = {};
  }

  const blocks = await buildHalaqatBlocks(from, to, halqaScope);
  if (blocks.length === 0) return { error: "لا طلاب في نطاق الحلقات المختار." };

  const paramsJson = JSON.stringify({ halqaScope, notes });

  // ما عدّلته الإدارة من الملاحظات يُحفظ للطالب — يبقى حتى يعدّله المدرّس أو الإدارة
  const current = new Map(blocks.flatMap((b) => b.rows.map((r) => [r.studentId, r.note] as const)));
  const changed = Object.entries(notes).filter(([sid, n]) => current.has(sid) && (n ?? "").trim() !== (current.get(sid) ?? "").trim());
  if (changed.length) {
    await prisma.$transaction(changed.map(([sid, n]) => prisma.student.update({ where: { id: sid }, data: { reportNote: (n ?? "").trim() || null } })));
    revalidatePath("/monthly-report");
  }

  const existing = await prisma.issuedReport.findFirst({
    where: { kind: "HALAQAT", name, fromDate: from, toDate: to, paramsJson },
  });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "HALAQAT", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });

  return { ok: true, reportId: created.id };
}
