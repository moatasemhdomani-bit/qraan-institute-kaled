"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { today } from "@/lib/daily";
import { pagesSummary, localSplit, nominationSplit, realAwqafSplit } from "@/lib/reports";
import { renderPdf, saveReportPdf } from "@/lib/pdf";
import { studentReportHtml } from "@/lib/reportHtml";

export type FormState = { error?: string; ok?: boolean; fileUrl?: string };

export type StudentPreview = {
  studentId: string;
  studentName: string;
  studentNo: string;
  halqaName: string;
  cohortName: string;
  attendance: { present: number; late: number; excused: number; absent: number };
  newPages: number;
  pastPages: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  behavior: string;
};

export async function searchStudentsForReport(q: string): Promise<{ id: string; no: string; name: string }[]> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return [];
  if (!q.trim()) return [];
  const students = await prisma.student.findMany({
    where: { OR: [{ name: { contains: q } }, { studentNo: { equals: Number.isNaN(Number(q)) ? -1 : Number(q) } }] },
    take: 10,
    orderBy: { name: "asc" },
  });
  return students.map((s) => ({ id: s.id, no: String(s.studentNo), name: s.name }));
}

async function buildStudentPreview(studentId: string, from: string, to: string): Promise<StudentPreview | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { halqa: { include: { cohort: true } } },
  });
  if (!student) return null;

  const [attendance, recitations, localExams, nomExams, awqafResults] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, date: { gte: from, lte: to } } }),
    prisma.recitation.findMany({ where: { studentId, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId, batch: { date: { gte: from, lte: to } } } }),
  ]);

  const pages = pagesSummary(recitations);
  const loc = localSplit(localExams);
  const nom = nominationSplit(nomExams);
  const real = realAwqafSplit(awqafResults);

  return {
    studentId: student.id,
    studentName: student.name,
    studentNo: String(student.studentNo),
    halqaName: student.halqa?.name ?? "غير مفروز",
    cohortName: student.halqa?.cohort.name ?? "—",
    attendance: {
      present: attendance.filter((a) => a.status === "PRESENT").length,
      late: attendance.filter((a) => a.status === "LATE").length,
      excused: attendance.filter((a) => a.status === "EXCUSED").length,
      absent: attendance.filter((a) => a.status === "ABSENT").length,
    },
    newPages: pages.newTotal,
    pastPages: pages.pastTotal,
    locPass: loc.pass, locFail: loc.fail,
    nomPass: nom.pass, nomFail: nom.fail,
    realPass: real.pass, realFail: real.fail,
    behavior: student.behavior,
  };
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

  const html = studentReportHtml({
    name, from, to, issuedBy: session.name, issuedAt: today(),
    studentName: preview.studentName, studentNo: preview.studentNo,
    halqaName: preview.halqaName, cohortName: preview.cohortName,
    attendance: preview.attendance, newPages: preview.newPages, pastPages: preview.pastPages,
    locPass: preview.locPass, locFail: preview.locFail,
    nomPass: preview.nomPass, nomFail: preview.nomFail,
    realPass: preview.realPass, realFail: preview.realFail,
    behavior: preview.behavior,
  });

  let fileUrl: string;
  try {
    const buf = await renderPdf(html, false);
    fileUrl = await saveReportPdf(buf);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّر توليد ملف PDF." };
  }

  await prisma.issuedReport.create({
    data: { kind: "STUDENT", name, fromDate: from, toDate: to, fileUrl, studentId, issuedById: session.userId },
  });

  return { ok: true, fileUrl };
}
