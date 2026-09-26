import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { dateOnly } from "@/lib/daily";
import { buildHalaqatBlocks, buildTeachersRows, buildStudentPreview, buildAwqafMarks } from "@/lib/reports";
import { renderPdf } from "@/lib/pdf";
import { halaqatReportHtml, teachersReportHtml, studentReportHtml, awqafMarksReportHtml } from "@/lib/reportHtml";

/** يُعيد توليد PDF تقرير سابق من معطياته المحفوظة عند الطلب — لا يُخزَّن أي ملف. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return new NextResponse("غير مصرَّح لك بهذا الإجراء.", { status: 403 });
  }

  const { id } = await params;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const report = await prisma.issuedReport.findUnique({
    where: { id },
    include: { issuedBy: { select: { name: true } } },
  });
  if (!report) return new NextResponse("التقرير غير موجود.", { status: 404 });

  let params_: Record<string, unknown> = {};
  try {
    params_ = JSON.parse(report.paramsJson);
  } catch {
    params_ = {};
  }

  const issuedAt = dateOnly(report.createdAt);
  const common = { name: report.name, from: report.fromDate, to: report.toDate, issuedBy: report.issuedBy.name, issuedAt };

  let html: string;
  let landscape = false;

  if (report.kind === "HALAQAT") {
    const halqaScope = typeof params_.halqaScope === "string" ? params_.halqaScope : "all";
    const notes = (params_.notes as Record<string, string>) ?? {};
    const blocks = await buildHalaqatBlocks(report.fromDate, report.toDate, halqaScope);
    html = halaqatReportHtml({
      ...common,
      blocks: blocks.map((b) => ({ ...b, rows: b.rows.map((r) => ({ ...r, note: notes[r.studentId] ?? r.note })) })),
    });
    landscape = true;
  } else if (report.kind === "TEACHERS") {
    const notes = (params_.notes as Record<string, string>) ?? {};
    const rows = await buildTeachersRows(report.fromDate, report.toDate);
    html = teachersReportHtml({ ...common, rows: rows.map((r) => ({ ...r, note: notes[r.teacherId] || "" })) });
  } else if (report.kind === "AWQAF_MARKS") {
    const marks = typeof params_.batchId === "string" ? await buildAwqafMarks(params_.batchId) : null;
    if (!marks) return new NextResponse("دفعة سبر الأوقاف لم تعد موجودة.", { status: 404 });
    html = awqafMarksReportHtml({ name: report.name, batchDate: marks.date, issuedBy: common.issuedBy, issuedAt, rows: marks.rows });
    landscape = true;
  } else {
    const preview = report.studentId ? await buildStudentPreview(report.studentId, report.fromDate, report.toDate) : null;
    if (!preview) return new NextResponse("لم يُعثر على الطالب.", { status: 404 });
    html = studentReportHtml({ ...common, ...preview });
  }

  try {
    const buf = await renderPdf(html, landscape);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(report.name)}.pdf`,
      },
    });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "تعذّر توليد ملف PDF.", { status: 500 });
  }
}
