import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { sunnahNominationExcel } from "./sunnahExcel";

/**
 * ملف ترشيح سبر الأوقاف (Excel) — دفعة السنّة النبوية في sunnahExcel.ts، وهنا القرآن الكريم — يُرفع إلى جهة الأوقاف.
 * يُملأ قالب الأوقاف نفسه (templates/awqaf-quran-nomination.xlsx) من بيانات طلاب الدفعة:
 * الاسم والنسبة، الأب، الأم، تاريخ الولادة، الجوال، الفرع (من ترشيحه)، الفروع المشارك بها سابقًا، والعلامة إن وصلت.
 */

// ترتيب الفروع كما في قائمة القالب («قاعدة البيانات»)
const BRANCH_ORDER = ["كامل غيبا", "25 غيبا", "20 غيبا", "15 غيبا", "10 غيبا", "5 غيبا", "كامل تلاوة", "20 تلاوة", "10 تلاوة"];
const EMPTY = "__";
const BIRTH_PLACE = "حلب";

function branchLabel(parts: number | null | undefined, present: boolean): string {
  const kind = present ? "تلاوة" : "غيبا";
  if (!parts) return kind;
  return `${parts >= 30 ? "كامل" : parts} ${kind}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const strCell = (ref: string, style: number, v: string) => `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
const numCell = (ref: string, style: number, v: number) => `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
const cell = (ref: string, style: number, v: string | number | null) =>
  v == null || v === "" ? `<c r="${ref}" s="${style}"/>` : typeof v === "number" ? numCell(ref, style, v) : /^\d{1,15}$/.test(v) && !v.startsWith("0") ? numCell(ref, style, Number(v)) : strCell(ref, style, v);

/** رقم اليوم في Excel (1900) لتاريخ YYYY-MM-DD */
function excelSerial(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return new NextResponse("غير مصرَّح لك بهذا الإجراء.", { status: 403 });
  }

  const { id } = await params;
  const batch = await prisma.awqafBatch.findUnique({
    where: { id },
    include: {
      results: {
        include: {
          student: {
            select: { id: true, name: true, fatherName: true, motherName: true, birthDate: true, guardianPhone: true },
          },
        },
      },
    },
  });
  if (!batch) return new NextResponse("الدفعة غير موجودة.", { status: 404 });
  if (batch.kind === "SUNNAH") {
    const out = await sunnahNominationExcel(batch.id);
    if (!out) return new NextResponse("الدفعة غير موجودة.", { status: 404 });
    return xlsxResponse(out.buf, `ترشيح_سبر_الأوقاف_السنة_النبوية_${out.date}.xlsx`, `awqaf-sunnah-nomination-${out.date}.xlsx`);
  }

  const studentIds = batch.results.map((r) => r.studentId);
  const [nominations, earlier] = await Promise.all([
    prisma.exam.findMany({
      where: { type: "WAQF_NOMINATION", studentId: { in: studentIds } },
      select: { studentId: true, date: true, nominationPresent: true, nominationParts: true },
      orderBy: { date: "desc" },
    }),
    // مشاركات سابقة في دفعات قرآن أقدم
    prisma.awqafResult.findMany({
      where: { studentId: { in: studentIds }, sunnahSection: null, batch: { kind: "QURAN", date: { lt: batch.date } } },
      select: { studentId: true, nominationPresent: true, score: true, batch: { select: { date: true } } },
      orderBy: { batch: { date: "asc" } },
    }),
  ]);

  // فرع الطالب = آخر ترشيح ناجح له بنفس المسار (حاضرًا/غيبًا) حتى تاريخ الدفعة
  const branchAt = (studentId: string, present: boolean, date: string) =>
    branchLabel(
      nominations.find((n) => n.studentId === studentId && n.nominationPresent === present && n.date <= date)?.nominationParts,
      present
    );

  const rows = batch.results
    .map((r) => {
      const s = r.student;
      const mine = earlier.filter((e) => e.studentId === s.id);
      const prev = Array.from(new Set(mine.map((e) => branchAt(s.id, e.nominationPresent, e.batch.date))));
      return {
        name: s.name,
        father: s.fatherName?.trim() || EMPTY,
        mother: s.motherName?.trim() || EMPTY,
        birthYear: s.birthDate && /^\d{4}/.test(s.birthDate) ? Number(s.birthDate.slice(0, 4)) : null,
        mobile: (s.guardianPhone || "").replace(/\s+/g, "") || EMPTY,
        branch: branchAt(s.id, r.nominationPresent, batch.date),
        previous: prev.length ? prev.join("، ") : EMPTY,
        // العلامة = علامة آخر فرع شارك به سابقًا (لا علامة هذه الدفعة)
        score: mine.length ? (mine[mine.length - 1].score ?? "--") : "--",
      };
    })
    .sort((a, b) => {
      const ia = BRANCH_ORDER.indexOf(a.branch);
      const ib = BRANCH_ORDER.indexOf(b.branch);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name, "ar");
    });

  const zip = await JSZip.loadAsync(await readFile(path.join(process.cwd(), "templates", "awqaf-quran-nomination.xlsx")));

  const lastRow = Math.max(5 + rows.length, 6);
  const dataXml = rows
    .map((x, i) => {
      const r = 6 + i;
      return (
        `<row r="${r}" spans="1:11" ht="22.15" customHeight="1">` +
        cell(`A${r}`, 7, i + 1) +
        cell(`B${r}`, 8, x.name) +
        cell(`C${r}`, 8, x.father) +
        cell(`D${r}`, 8, x.mother) +
        cell(`E${r}`, 8, BIRTH_PLACE) +
        cell(`F${r}`, 8, x.birthYear ?? EMPTY) +
        cell(`G${r}`, 8, EMPTY) +
        cell(`H${r}`, 8, x.mobile) +
        cell(`I${r}`, 9, x.branch) +
        cell(`J${r}`, 10, x.previous) +
        cell(`K${r}`, 10, x.score) +
        `</row>`
      );
    })
    .join("");

  const sp = "xl/worksheets/sheet1.xml";
  let sheet = await zip.file(sp)!.async("string");
  sheet = sheet
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:K${lastRow}"/>`)
    // تاريخ الملف = تاريخ الدفعة
    .replace(/(<c r="J3" s="\d+">)<v>\d+<\/v>/, `$1<v>${excelSerial(batch.date)}</v>`)
    .replace("</sheetData>", `${dataXml}</sheetData>`);
  zip.file(sp, sheet);

  const tp = "xl/tables/table1.xml";
  const table = (await zip.file(tp)!.async("string")).replace(/ref="A5:K\d+"/g, `ref="A5:K${lastRow}"`);
  zip.file(tp, table);

  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return xlsxResponse(buf, `ترشيح_سبر_الأوقاف_القرآن_${batch.date}.xlsx`, `awqaf-nomination-${batch.date}.xlsx`);
}

function xlsxResponse(buf: Uint8Array, filename: string, asciiName: string) {
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
