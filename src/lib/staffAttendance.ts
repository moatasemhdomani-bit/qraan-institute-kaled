import JSZip from "jszip";
import { prisma } from "./db";
import { readXls, xlsCell } from "./xls";
import { inHoliday, rotationSlot, weekdayName } from "./daily";

/** ملف البصّامة بعد قراءته: الفترة، ولكل رقم بصمة أوقات بصمه في كل يوم */
export type FingerprintFile = {
  from: string;
  to: string;
  people: { no: number; name: string; days: Record<string, string[]> }[];
};

const addDays = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** يقرأ ورقة «سجلات» من ملف البصّامة (.XLS) */
export function parseFingerprintXls(buf: Buffer): FingerprintFile {
  const sheets = readXls(buf);
  const s = sheets.find((x) => x.name.trim() === "سجلات");
  if (!s) throw new Error("لم أجد ورقة «سجلات» في الملف — ارفعوا ملف البصّامة كما يُصدَّر منها.");

  // «الفتره: 2026/10/01 ~ 10/28»
  let period = "";
  for (let c = 0; c < 10 && !period; c++) {
    const v = xlsCell(s, 2, c);
    if (typeof v === "string" && v.includes("~")) period = v;
  }
  const m = /(\d{4})\/(\d{1,2})\/(\d{1,2})\s*~\s*(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})/.exec(period);
  if (!m) throw new Error("لم أجد فترة الملف («الفتره») في ورقة «سجلات».");
  const pad = (x: string | number) => String(x).padStart(2, "0");
  const from = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  let toYear = m[4] ? Number(m[4]) : Number(m[1]);
  if (!m[4] && Number(m[5]) < Number(m[2])) toYear++;
  const to = `${toYear}-${pad(m[5])}-${pad(m[6])}`;
  if (to < from) throw new Error("فترة الملف غير صحيحة.");

  // رقم اليوم في الشهر ← التاريخ، ضمن فترة الملف
  const byDayNo = new Map<number, string>();
  for (let d = from, n = 0; d <= to && n < 62; d = addDays(d, 1), n++) byDayNo.set(Number(d.slice(8)), d);

  let maxRow = 0;
  for (const k of s.cells.keys()) maxRow = Math.max(maxRow, Number(k.split(",")[0]));

  const people: FingerprintFile["people"] = [];
  for (let r = 0; r <= maxRow; r++) {
    const a = xlsCell(s, r, 0);
    if (typeof a !== "string" || !a.trim().startsWith("رقم")) continue;
    const no = Number(xlsCell(s, r, 2));
    if (!Number.isFinite(no)) continue;
    const name = String(xlsCell(s, r, 10) ?? "").trim();
    const days: Record<string, string[]> = {};
    for (let c = 0; c < 40; c++) {
      const dayNo = Number(xlsCell(s, r - 1, c));
      const date = byDayNo.get(dayNo);
      if (!date) continue;
      const v = xlsCell(s, r + 1, c);
      if (typeof v !== "string") continue;
      const times = v
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .map((t) => t.padStart(5, "0"))
        .sort();
      if (times.length) days[date] = times;
    }
    people.push({ no, name, days });
  }
  if (!people.length) throw new Error("لم أجد موظفين في ورقة «سجلات».");
  return { from, to, people };
}

export type StaffAttendanceRow = { name: string; fingerprintNo: number; present: number; absent: number; delays: number[]; totalDelay: number };
export type StaffAttendanceResult = {
  from: string;
  to: string;
  totalDays: number;
  rows: StaffAttendanceRow[];
  /** أرقام في الملف لها بصمات ولا موظف بها */
  unmatched: { no: number; name: string; days: number }[];
  /** موظفون لهم رقم بصمة غير موجود في الملف */
  missing: string[];
  /** بصمات في الملف لموظف معلَّق أو محذوف — لا تدخل التقرير */
  inactive: { no: number; name: string; status: string; days: number }[];
};

/** قبل البصمة بأكثر من هذا عن بداية الدوام لا تُحسب لهذا الوقت */
const EARLY_WINDOW = 120;

/**
 * حضور الموظفين من ملف البصّامة: لكل موظف له «رقم بصمة» — في كل يوم دوام (بلا العطل) ولكل فوج له فيه دور
 * بوقت دوام محدد: حاضر إن بصم بين (بداية الدوام − ساعتين) ونهايته، والتأخير = أول بصمة − بداية الدوام.
 * من له فوجان: كل فوج نصف يوم.
 */
export async function buildStaffAttendance(file: FingerprintFile): Promise<StaffAttendanceResult> {
  const [staff, holidays, working] = await Promise.all([
    prisma.user.findMany({
      // الموظفون النشطون وحدهم: لا المحذوف ولا المعلَّق
      where: { deletedAt: null, suspendedAt: null, fingerprintNo: { not: null } },
      select: {
        name: true,
        fingerprintNo: true,
        assignments: {
          select: {
            cohort: { select: { id: true, isRotating: true, time1Start: true, time1End: true, time2Start: true, time2End: true, rotationStart: true } },
          },
        },
      },
    }),
    prisma.holiday.findMany(),
    prisma.workingDays.findUnique({ where: { id: 1 } }),
  ]);
  let weekdays: string[] = [];
  try {
    weekdays = JSON.parse(working?.days || "[]");
  } catch {
    weekdays = [];
  }

  // أيام الدوام في فترة الملف
  const workDays: string[] = [];
  for (let d = file.from, n = 0; d <= file.to && n < 62; d = addDays(d, 1), n++) {
    if (weekdays.length && !weekdays.includes(weekdayName(d))) continue;
    if (holidays.some((h) => inHoliday(d, h))) continue;
    workDays.push(d);
  }

  const byNo = new Map(file.people.map((p) => [p.no, p]));
  const rows: StaffAttendanceRow[] = [];
  const missing: string[] = [];

  for (const u of staff) {
    const fp = u.fingerprintNo as number;
    const person = byNo.get(fp);
    if (!person) {
      missing.push(`${u.name} (${fp})`);
      continue;
    }
    const cohorts = [...new Map(u.assignments.map((a) => [a.cohort.id, a.cohort])).values()];
    let present = 0;
    const delays: number[] = [];

    for (const day of workDays) {
      const punches = (person.days[day] ?? []).map(toMin);
      const sessions = cohorts
        .map((c) => {
          const slot = c.isRotating ? rotationSlot(c, day) : { start: c.time1Start, end: c.time1End };
          return slot?.start ? { start: toMin(slot.start), end: slot.end ? toMin(slot.end) : toMin(slot.start) + 180 } : null;
        })
        .filter((x): x is { start: number; end: number } => x != null);

      if (!sessions.length) {
        // بلا وقت دوام محدد لأفواجه: حاضر إن بصم يومها، بلا حساب تأخير
        if (punches.length) present += 1;
        continue;
      }
      for (const s of sessions) {
        const inWin = punches.filter((p) => p >= s.start - EARLY_WINDOW && p <= s.end);
        if (!inWin.length) continue;
        present += 1 / sessions.length;
        const late = inWin[0] - s.start;
        if (late > 0) delays.push(late);
      }
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    rows.push({
      name: u.name,
      fingerprintNo: fp,
      present: round(present),
      absent: round(workDays.length - present),
      delays,
      totalDelay: delays.reduce((n, x) => n + x, 0),
    });
  }

  // أرقام كل الموظفين (ومنهم المعلَّق) — رقم موظف غير نشط لا يظهر «غير مربوط»
  const allFp = await prisma.user.findMany({ where: { fingerprintNo: { not: null } }, select: { fingerprintNo: true, name: true, deletedAt: true, suspendedAt: true } });
  const known = new Set(allFp.map((u) => u.fingerprintNo));
  const unmatched = file.people
    .filter((p) => !known.has(p.no) && Object.keys(p.days).length > 0)
    .map((p) => ({ no: p.no, name: p.name, days: Object.keys(p.days).length }));

  rows.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const inactive = allFp
    .filter((u) => u.deletedAt || u.suspendedAt)
    .map((u) => ({ u, p: byNo.get(u.fingerprintNo as number) }))
    .filter(({ p }) => p && Object.keys(p.days).length > 0)
    .map(({ u, p }) => ({ no: u.fingerprintNo as number, name: u.name, status: u.deletedAt ? "محذوف" : "معلَّق", days: Object.keys(p!.days).length }));

  return { from: file.from, to: file.to, totalDays: workDays.length, rows, unmatched, missing, inactive };
}

// ==================== ملف Excel للتقرير ====================

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const COLS = ["A", "B", "C", "D", "E", "F", "G"];

/** تقرير «حضور الموظفين» بصيغة Excel على شكل ملف الإدارة: م، الاسم، أيام الدوام، الغياب، تفصيل التأخير، إجماليه، ملاحظات */
export async function staffAttendanceXlsx(input: { title: string; totalDays: number; rows: StaffAttendanceRow[] }): Promise<Buffer> {
  const str = (ref: string, s: number, v: string) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const num = (ref: string, s: number, v: number) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;

  const header = ["م", "اسم الأستاذ", `عدد أيام الدوام\n(الكلي ${input.totalDays} يوم)`, "الغياب", "تفصيل التأخير\n(بالدقائق)", "إجمالي التأخير\n(بالدقائق)", "ملاحظات"];
  const xmlRows: string[] = [];
  xmlRows.push(`<row r="1" ht="30" customHeight="1">${str("A1", 1, input.title)}</row>`);
  xmlRows.push(`<row r="2" ht="48" customHeight="1">${header.map((h, i) => str(`${COLS[i]}2`, 2, h)).join("")}</row>`);
  input.rows.forEach((r, i) => {
    const n = i + 3;
    xmlRows.push(
      `<row r="${n}">` +
        num(`A${n}`, 3, i + 1) +
        str(`B${n}`, 4, r.name) +
        num(`C${n}`, 3, r.present) +
        num(`D${n}`, 3, r.absent) +
        (r.delays.length ? str(`E${n}`, 4, r.delays.join("+")) : num(`E${n}`, 3, 0)) +
        num(`F${n}`, 3, r.totalDelay) +
        `<c r="G${n}" s="4"/>` +
        `</row>`
    );
  });
  const last = input.rows.length + 2;
  xmlRows.push(`<row r="${last + 1}">${str(`A${last + 1}`, 0, "ملحوظات:")}</row>`);

  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:G${last + 1}"/>` +
    `<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/>` +
    `<cols><col min="1" max="1" width="5" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="3" width="15" customWidth="1"/><col min="4" max="4" width="9" customWidth="1"/><col min="5" max="5" width="44" customWidth="1"/><col min="6" max="6" width="14" customWidth="1"/><col min="7" max="7" width="40" customWidth="1"/></cols>` +
    `<sheetData>${xmlRows.join("")}</sheetData>` +
    `<mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells>` +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
    `<pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/>` +
    `</worksheet>`;

  const border = `<border><left style="thin"><color rgb="FF999999"/></left><right style="thin"><color rgb="FF999999"/></right><top style="thin"><color rgb="FF999999"/></top><bottom style="thin"><color rgb="FF999999"/></bottom><diagonal/></border>`;
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts>` +
    `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3E7C4"/><bgColor indexed="64"/></patternFill></fill></fills>` +
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="5">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="محصلة الدوام" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'محصلة الدوام'!$A$1:$G$${last + 1}</definedName></definedNames></workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );
  zip.file("xl/styles.xml", styles);
  zip.file("xl/worksheets/sheet1.xml", sheet);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
