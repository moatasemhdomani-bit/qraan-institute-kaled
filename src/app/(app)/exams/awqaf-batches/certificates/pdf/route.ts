import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { renderPagePdf } from "@/lib/pdf";
import { certificatesHtml } from "@/lib/certificateHtml";
import { CERTIFICATE_LABELS, type CertificateData } from "@/lib/certificate";
import { buildCertificateData, buildPriorCertificateData } from "@/lib/certificateServer";

/** يولّد ملف PDF لشهادة أو أكثر من لقطاتها المحفوظة: ?ids=a,b,c (كل شهادة في صفحة) */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return new NextResponse("غير مصرَّح لك بهذا الإجراء.", { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean).slice(0, 200);
  const download = params.get("download") === "1";
  const certs = await prisma.issuedCertificate.findMany({ where: { id: { in: ids } } });
  if (certs.length === 0) return new NextResponse("لم يُعثر على الشهادات.", { status: 404 });
  // بترتيب الطلب نفسه
  const order = new Map(ids.map((id, i) => [id, i]));
  certs.sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  // البيانات تُقرأ من جديد عند كل تنزيل (فيظهر أي تعديل على بيانات الطالب أو علامته)، ويبقى الرقم وتاريخ الإصدار
  // كما هما. إن لم يعد الطالب مستحقًا (حُذف سبره مثلًا) تُستعمل لقطة يوم الإصدار.
  const list = await Promise.all(
    certs.map(async (c) => {
      const saved = JSON.parse(c.dataJson) as CertificateData;
      // «شهادة سابقة»: بيانات الطالب الحالية، والعلامة وتاريخ الإصدار كما أُدخلا
      const fresh = c.prior ? await buildPriorCertificateData(c.kind, c.studentId, saved) : (await buildCertificateData(c.kind, c.studentId, saved.issueDate))?.data;
      return { kind: c.kind, number: c.number, data: fresh ?? saved };
    })
  );
  const fileName =
    list.length === 1 ? `${CERTIFICATE_LABELS[list[0].kind]} — ${list[0].data.name}` : `شهادات المعهد — ${list.length} شهادة`;

  try {
    const buf = await renderPagePdf(certificatesHtml(list));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}.pdf`,
      },
    });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "تعذّر توليد ملف PDF.", { status: 500 });
  }
}
