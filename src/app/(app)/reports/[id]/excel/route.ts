import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { staffAttendanceXlsx } from "@/lib/staffAttendance";

/** تنزيل تقرير «حضور الموظفين» ملف Excel من الناتج المحفوظ يوم الإصدار. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return new NextResponse("غير مصرَّح لك بهذا الإجراء.", { status: 403 });
  }
  const { id } = await params;
  const report = await prisma.issuedReport.findUnique({ where: { id } });
  if (!report || report.kind !== "STAFF_ATTENDANCE") return new NextResponse("التقرير غير موجود.", { status: 404 });

  let p: { totalDays?: number; rows?: [] } = {};
  try {
    p = JSON.parse(report.paramsJson);
  } catch {
    p = {};
  }
  const [y, m] = report.fromDate.split("-");
  const buf = await staffAttendanceXlsx({
    title: `تقرير دوام شهر ${Number(m)}/${y}`,
    totalDays: p.totalDays ?? 0,
    rows: p.rows ?? [],
  });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(report.name)}.xlsx`,
    },
  });
}
