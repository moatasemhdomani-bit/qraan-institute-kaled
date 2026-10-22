"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { textHas } from "@/lib/search";
import { buildStudentPreview, type StudentPreview } from "@/lib/reports";

export type { StudentPreview } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function searchStudentsForReport(q: string): Promise<{ id: string; no: string; name: string }[]> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return [];
  if (!q.trim()) return [];
  // الاسم مع توحيد الألف (ا = أ = إ = آ)، أو الرقم بالضبط
  const query = q.trim();
  const all = await prisma.student.findMany({ select: { id: true, name: true, studentNo: true }, orderBy: { name: "asc" } });
  return all
    .filter((s) => textHas(s.name, query) || String(s.studentNo) === query)
    .slice(0, 10)
    .map((s) => ({ id: s.id, no: String(s.studentNo), name: s.name }));
}

export async function previewStudentReport(studentId: string, from: string, to: string): Promise<{ preview: StudentPreview } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!studentId) return { error: "ابحثوا عن الطالب واختاروه أولًا." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  const preview = await buildStudentPreview(studentId, from, to);
  if (!preview) return { error: "لم يُعثر على الطالب." };
  return { preview };
}

export async function issueStudentReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const studentId = String(formData.get("studentId") || "");
  const from = String(formData.get("from") || "");
  const to = String(formData.get("to") || "");
  const name = String(formData.get("name") || "").trim();

  if (!studentId) return { error: "ابحثوا عن الطالب واختاروه أولًا." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  const preview = await buildStudentPreview(studentId, from, to);
  if (!preview) return { error: "لم يُعثر على الطالب." };

  const paramsJson = "{}";

  const existing = await prisma.issuedReport.findFirst({
    where: { kind: "STUDENT", name, fromDate: from, toDate: to, studentId, paramsJson },
  });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "STUDENT", name, fromDate: from, toDate: to, paramsJson, studentId, issuedById: session.userId },
  });

  return { ok: true, reportId: created.id };
}
