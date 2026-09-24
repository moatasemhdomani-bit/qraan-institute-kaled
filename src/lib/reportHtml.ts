import { readFileSync, existsSync } from "fs";
import path from "path";
import { formatDateAr } from "./daily";

const LOGO_DATA_URI = (() => {
  const p = path.join(process.cwd(), "public", "logo-mark.png");
  if (!existsSync(p)) return null;
  return `data:image/png;base64,${readFileSync(p).toString("base64")}`;
})();

const KIND_LABELS: Record<string, string> = {
  HALAQAT: "تقرير تسميع الحلقات",
  TEACHERS: "التقرير الشهري للمدرسين",
  STUDENT: "تقرير طالب",
};

const BASE_STYLE = `
  @font-face { font-family: "IBM Plex Sans Arabic"; src: local("IBM Plex Sans Arabic"); }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    font-family: "IBM Plex Sans Arabic", system-ui, sans-serif;
    background: #ffffff; color: #0a192f; font-size: 12.5px; line-height: 1.6;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; border-bottom: 2px solid #d4af37; padding-bottom: 14px; margin-bottom: 18px; }
  .head .brand { display: flex; align-items: center; gap: 12px; }
  .head .brand img { width: 80px; height: 80px; object-fit: contain; flex: none; }
  .head h1 { font-size: 19px; margin: 0; color: #0a192f; line-height: 1.45; }
  .head h1 .l1 { display: block; font-size: 15px; font-weight: 600; color: #555; }
  .head h1 .l2 { display: block; }
  .head .meta { text-align: start; font-size: 11.5px; color: #555; }
  .head .meta b { color: #0a192f; }
  h2.block { font-size: 14px; background: linear-gradient(90deg, rgba(212,175,55,.18), rgba(212,175,55,.02)); padding: 8px 12px; border-radius: 8px; margin: 18px 0 8px; }
  h2.block span { color: #8a6d1f; font-weight: 400; font-size: 12px; }
  h3.section { font-size: 12.5px; font-weight: 700; color: #123058; margin: 12px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; }
  thead th { background: #123058; color: #fff; font-weight: 600; }
  tbody tr:nth-child(even) { background: #f7f5ee; }
  td.name { text-align: start; font-weight: 600; }
  .pass { color: #1e7a3d; font-weight: 600; }
  .fail { color: #b23b3b; font-weight: 600; }
  td.note { text-align: start; min-width: 150px; }
  .footer { margin-top: 22px; font-size: 10.5px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
`;

function htmlHead(title: string) {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">
    <title>${title}</title><style>${BASE_STYLE}</style></head><body>`;
}

function reportHeader(name: string, kind: string, from: string, to: string, issuedBy: string, issuedAt: string) {
  const kindLabel = KIND_LABELS[kind] ?? kind;
  return `<div class="head">
    <div class="brand">
      ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" alt="" />` : ""}
      <h1><span class="l1">معهد الصحابي الجليل</span><span class="l2">خالد بن الوليد</span></h1>
    </div>
    <div class="meta">
      <div><b>اسم التقرير:</b> ${escapeHtml(name)}</div>
      <div><b>نوع التقرير:</b> ${escapeHtml(kindLabel)}</div>
      <div><b>الفترة:</b> ${formatDateAr(from)} — ${formatDateAr(to)}</div>
      <div><b>أصدره:</b> ${escapeHtml(issuedBy)}</div>
      <div><b>تاريخ الإصدار:</b> ${formatDateAr(issuedAt)}</div>
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function passFailCells(pass: number, fail: number) {
  return `<td><span class="pass">${pass}</span></td><td><span class="fail">${fail}</span></td>`;
}

export type HalaqatReportRow = {
  studentName: string;
  from: number | null;
  to: number | null;
  newTotal: number;
  pastTotal: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  note: string;
};
export type HalaqatReportBlock = { halqaName: string; teacherName: string; rows: HalaqatReportRow[] };

export function halaqatReportHtml(input: {
  name: string; from: string; to: string; issuedBy: string; issuedAt: string;
  blocks: HalaqatReportBlock[];
}): string {
  const blocksHtml = input.blocks
    .map((b) => {
      return `
    <h2 class="block">الحلقة: ${escapeHtml(b.halqaName)} &nbsp;&nbsp; المدرس: ${escapeHtml(b.teacherName)}</h2>
    <table>
      <thead>
        <tr>
          <th rowspan="2">الطالب</th>
          <th rowspan="2">من صفحة</th>
          <th rowspan="2">إلى صفحة</th>
          <th rowspan="2">مجموع الجديد</th>
          <th rowspan="2">مجموع الماضي</th>
          <th colspan="2">اختبار محلي</th>
          <th colspan="2">ترشيح الأوقاف</th>
          <th colspan="2">سبر الأوقاف الفعلي</th>
          <th rowspan="2">ملاحظات</th>
        </tr>
        <tr>
          <th>ناجح</th><th>راسب</th><th>ناجح</th><th>راسب</th><th>ناجح</th><th>راسب</th>
        </tr>
      </thead>
      <tbody>
        ${b.rows
          .map(
            (r) => `<tr>
              <td class="name">${escapeHtml(r.studentName)}</td>
              <td>${r.from ?? "—"}</td>
              <td>${r.to ?? "—"}</td>
              <td>${r.newTotal}</td>
              <td>${r.pastTotal}</td>
              ${passFailCells(r.locPass, r.locFail)}
              ${passFailCells(r.nomPass, r.nomFail)}
              ${passFailCells(r.realPass, r.realFail)}
              <td class="note">${escapeHtml(r.note?.trim() || "—")}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
    })
    .join("");

  return (
    htmlHead(input.name) +
    reportHeader(input.name, "HALAQAT", input.from, input.to, input.issuedBy, input.issuedAt) +
    blocksHtml +
    `<div class="footer">معهد الصحابي الجليل خالد بن الوليد — تقرير تسميع الحلقات</div></body></html>`
  );
}

export type TeachersReportRow = {
  teacherName: string;
  halqaNames: string;
  newPages: number;
  pastPages: number;
  locPass: number; locFail: number;
  awqPass: number; awqFail: number;
  count: number;
  note: string;
};

export function teachersReportHtml(input: {
  name: string; from: string; to: string; issuedBy: string; issuedAt: string;
  rows: TeachersReportRow[];
}): string {
  const table = `
    <table>
      <thead><tr>
        <th>المدرس</th><th>الحلقة</th><th>صفحات جديد لكل الطلاب</th><th>صفحات ماضٍ لكل الطلاب</th>
        <th>اختبارات محلية (ناجحة/راسبة)</th><th>اختبارات الأوقاف (ناجحة/راسبة)</th>
        <th>عدد الطلاب</th><th>ملاحظات</th>
      </tr></thead>
      <tbody>
        ${input.rows
          .map(
            (r) => `<tr>
              <td class="name">${escapeHtml(r.teacherName)}</td>
              <td>${escapeHtml(r.halqaNames)}</td>
              <td>${r.newPages}</td>
              <td>${r.pastPages}</td>
              <td><span class="pass">${r.locPass}</span> / <span class="fail">${r.locFail}</span></td>
              <td><span class="pass">${r.awqPass}</span> / <span class="fail">${r.awqFail}</span></td>
              <td>${r.count}</td>
              <td style="text-align:start">${escapeHtml(r.note || "—")}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  return (
    htmlHead(input.name) +
    reportHeader(input.name, "TEACHERS", input.from, input.to, input.issuedBy, input.issuedAt) +
    table +
    `<div class="footer">معهد الصحابي الجليل خالد بن الوليد — التقرير الشهري للمدرسين</div></body></html>`
  );
}

export function studentReportHtml(input: {
  name: string; from: string; to: string; issuedBy: string; issuedAt: string;
  studentName: string; studentNo: string; halqaName: string; cohortName: string;
  attendance: { present: number; late: number; excused: number; absent: number };
  newPages: number;
  pastPages: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  behavior: string;
}): string {
  const body = `
    <h2 class="block">${escapeHtml(input.studentName)} <span>#${escapeHtml(input.studentNo)} — ${escapeHtml(input.halqaName)} · ${escapeHtml(input.cohortName)} · سلوك الطالب: ${escapeHtml(input.behavior)}</span></h2>

    <h3 class="section">حضور الطالب</h3>
    <table>
      <thead><tr><th>حاضر</th><th>متأخر</th><th>إذن</th><th>غائب</th></tr></thead>
      <tbody><tr>
        <td>${input.attendance.present}</td><td>${input.attendance.late}</td>
        <td>${input.attendance.excused}</td><td>${input.attendance.absent}</td>
      </tr></tbody>
    </table>

    <h3 class="section">تسميع الطالب</h3>
    <table>
      <thead><tr><th>صفحات جديد</th><th>صفحات ماضٍ</th></tr></thead>
      <tbody><tr><td>${input.newPages}</td><td>${input.pastPages}</td></tr></tbody>
    </table>

    <h3 class="section">سبر الطالب</h3>
    <table>
      <thead><tr><th>اختبار محلي</th><th>ترشيح الأوقاف</th><th>سبر الأوقاف الفعلي</th></tr></thead>
      <tbody><tr>
        <td><span class="pass">${input.locPass}</span> / <span class="fail">${input.locFail}</span></td>
        <td><span class="pass">${input.nomPass}</span> / <span class="fail">${input.nomFail}</span></td>
        <td><span class="pass">${input.realPass}</span> / <span class="fail">${input.realFail}</span></td>
      </tr></tbody>
    </table>`;

  return (
    htmlHead(input.name) +
    reportHeader(input.name, "STUDENT", input.from, input.to, input.issuedBy, input.issuedAt) +
    body +
    `<div class="footer">معهد الصحابي الجليل خالد بن الوليد — تقرير طالب</div></body></html>`
  );
}
