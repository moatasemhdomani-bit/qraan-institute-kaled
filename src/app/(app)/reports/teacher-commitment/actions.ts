"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildTeacherCommitment, type CommitmentReport } from "@/lib/teacherCommitment";

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

const staff = async () => {
  const session = await getSession();
  return session && (session.role === "DIRECTOR" || session.role === "ADMIN") ? session : null;
};

export async function previewTeacherCommitment(from: string, to: string, teacherIds: string[] | "all"): Promise<{ report: CommitmentReport } | { error: string }> {
  if (!(await staff())) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (teacherIds !== "all" && teacherIds.length === 0) return { error: "اختاروا مدرّسًا واحدًا على الأقل أو «كل المدرّسين»." };
  return { report: await buildTeacherCommitment(teacherIds, from, to) };
}

export async function issueTeacherCommitment(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await staff();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const teacherIds = parseIds(String(formData.get("teacherIds") || "all"));
  const name = String(formData.get("name") || "").trim();
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  const report = await buildTeacherCommitment(teacherIds, from, to);
  if (report.rows.length === 0) return { error: "لا حلقات للمدرّسين المختارين." };

  const paramsJson = JSON.stringify({ teacherIds });
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "TEACHER_COMMITMENT", name, fromDate: from, toDate: to, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "TEACHER_COMMITMENT", name, fromDate: from, toDate: to, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
