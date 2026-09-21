"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { today } from "@/lib/daily";
import { pagesSummary, localSplit, nominationSplit, realAwqafSplit, monthsInRange } from "@/lib/reports";
import { renderPdf, saveReportPdf } from "@/lib/pdf";
import { halaqatReportHtml, type HalaqatReportBlock } from "@/lib/reportHtml";

export type FormState = { error?: string; ok?: boolean; fileUrl?: string };

export type PreviewRow = {
  studentId: string;
  studentName: string;
  from: number | null;
  to: number | null;
  newTotal: number;
  pastTotal: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  note: string;
  noteFromTeacher: boolean;
};
export type PreviewBlock = { halqaId: string; halqaName: string; teacherName: string; rows: PreviewRow[] };

async function buildBlocks(from: string, to: string, halqaScope: string): Promise<PreviewBlock[]> {
  const halaqat = await prisma.halqa.findMany({
    where: halqaScope === "all" ? {} : { id: halqaScope },
    include: { teacher: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const halqaIds = halaqat.map((h) => h.id);
  if (halqaIds.length === 0) return [];

  const students = await prisma.student.findMany({
    where: { halqaId: { in: halqaIds } },
    orderBy: { name: "asc" },
  });
  const studentIds = students.map((s) => s.id);
  const months = monthsInRange(from, to);

  const [recitations, localExams, nomExams, awqafResults, notes] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId: { in: studentIds }, batch: { date: { gte: from, lte: to } } } }),
    prisma.teacherMonthlyNote.findMany({ where: { studentId: { in: studentIds }, month: { in: months } } }),
  ]);

  return halaqat
    .map((h) => ({
      halqaId: h.id,
      halqaName: h.name,
      teacherName: h.teacher.name,
      rows: students
        .filter((s) => s.halqaId === h.id)
        .map((s) => {
          const pages = pagesSummary(recitations.filter((r) => r.studentId === s.id));
          const loc = localSplit(localExams.filter((e) => e.studentId === s.id));
          const nom = nominationSplit(nomExams.filter((e) => e.studentId === s.id));
          const real = realAwqafSplit(awqafResults.filter((r) => r.studentId === s.id));
          const teacherNote = notes
            .filter((n) => n.studentId === s.id)
            .map((n) => n.note)
            .filter(Boolean)
            .join(" / ");
          return {
            studentId: s.id,
            studentName: s.name,
            from: pages.from,
            to: pages.to,
            newTotal: pages.newTotal,
            pastTotal: pages.pastTotal,
            locPass: loc.pass, locFail: loc.fail,
            nomPass: nom.pass, nomFail: nom.fail,
            realPass: real.pass, realFail: real.fail,
            note: teacherNote,
            noteFromTeacher: !!teacherNote,
          };
        }),
    }))
    .filter((b) => b.rows.length > 0);
}

export async function previewHalaqatReport(from: string, to: string, halqaScope: string): Promise<{ blocks: PreviewBlock[] } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!from || !to || to < from) return { error: "حدّدوا تاريخي بداية ونهاية صحيحين." };
  const blocks = await buildBlocks(from, to, halqaScope || "all");
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

  const blocks = await buildBlocks(from, to, halqaScope);
  if (blocks.length === 0) return { error: "لا طلاب في نطاق الحلقات المختار." };

  const htmlBlocks: HalaqatReportBlock[] = blocks.map((b) => ({
    halqaName: b.halqaName,
    teacherName: b.teacherName,
    rows: b.rows.map((r) => ({ ...r, note: notes[r.studentId] ?? r.note })),
  }));

  const html = halaqatReportHtml({
    name,
    from,
    to,
    issuedBy: session.name,
    issuedAt: today(),
    blocks: htmlBlocks,
  });

  let fileUrl: string;
  try {
    const buf = await renderPdf(html, true);
    fileUrl = await saveReportPdf(buf);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر توليد ملف PDF." };
  }

  await prisma.issuedReport.create({
    data: { kind: "HALAQAT", name, fromDate: from, toDate: to, fileUrl, issuedById: session.userId },
  });

  return { ok: true, fileUrl };
}
