"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { today } from "@/lib/daily";
import { pagesSummary, localSplit, nominationSplit, realAwqafSplit } from "@/lib/reports";
import { renderPdf, saveReportPdf } from "@/lib/pdf";
import { teachersReportHtml } from "@/lib/reportHtml";

export type FormState = { error?: string; ok?: boolean; fileUrl?: string };

export type PreviewRow = {
  teacherId: string;
  teacherName: string;
  halqaNames: string;
  newPages: number;
  pastPages: number;
  locPass: number; locFail: number;
  awqPass: number; awqFail: number;
  count: number;
};

async function buildRows(from: string, to: string): Promise<PreviewRow[]> {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { name: "asc" },
    include: { halaqatTaught: { select: { id: true, name: true } } },
  });

  const allStudents = await prisma.student.findMany({
    where: { halqaId: { in: teachers.flatMap((t) => t.halaqatTaught.map((h) => h.id)) } },
    select: { id: true, halqaId: true },
  });
  const studentIds = allStudents.map((s) => s.id);

  const [recitations, localExams, nomExams, awqafResults] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId: { in: studentIds }, batch: { date: { gte: from, lte: to } } } }),
  ]);

  return teachers
    .map((t) => {
      const halqaIds = new Set(t.halaqatTaught.map((h) => h.id));
      const studs = allStudents.filter((s) => s.halqaId && halqaIds.has(s.halqaId));
      let newPages = 0, pastPages = 0, locPass = 0, locFail = 0, awqPass = 0, awqFail = 0;
      for (const s of studs) {
        const pages = pagesSummary(recitations.filter((r) => r.studentId === s.id));
        newPages += pages.newTotal;
        pastPages += pages.pastTotal;
        const loc = localSplit(localExams.filter((e) => e.studentId === s.id));
        locPass += loc.pass; locFail += loc.fail;
        const nom = nominationSplit(nomExams.filter((e) => e.studentId === s.id));
        const real = realAwqafSplit(awqafResults.filter((r) => r.studentId === s.id));
        awqPass += nom.pass + real.pass;
        awqFail += nom.fail + real.fail;
      }
      return {
        teacherId: t.id,
        teacherName: t.name,
        halqaNames: t.halaqatTaught.map((h) => h.name).join("، ") || "—",
        newPages, pastPages, locPass, locFail, awqPass, awqFail,
        count: studs.length,
      };
    })
    .filter((r) => r.halqaNames !== "—");
}

export async function previewTeachersReport(from: string, to: string): Promise<{ rows: PreviewRow[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  const rows = await buildRows(from, to);
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

  const rows = await buildRows(from, to);
  if (rows.length === 0) return { error: "لا مدرّسون بحلقات فعلية بعد." };

  const html = teachersReportHtml({
    name, from, to, issuedBy: session.name, issuedAt: today(),
    rows: rows.map((r) => ({ ...r, note: notes[r.teacherId] || "" })),
  });

  let fileUrl: string;
  try {
    const buf = await renderPdf(html, false);
    fileUrl = await saveReportPdf(buf);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر توليد ملف PDF." };
  }

  await prisma.issuedReport.create({
    data: { kind: "TEACHERS", name, fromDate: from, toDate: to, fileUrl, issuedById: session.userId },
  });

  return { ok: true, fileUrl };
}
