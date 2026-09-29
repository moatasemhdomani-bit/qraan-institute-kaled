import { toWesternDigits } from "./numbers";
import { normalizePhone, isValidMobile } from "./phone";

/** صف طالب كما قُرئ من جدول «سجل الطلاب» (Google Sheets) — نصوص خام بعد التشذيب. */
export type SheetRow = {
  line: number; // رقم السطر في الجدول (للرجوع إليه عند التصحيح)
  name: string;
  birth: string;
  father: string;
  mother: string;
  phone: string;
  teacher: string;
  registered: string;
  cohort: string;
  notes: string;
};

/** أعمدة الجدول كما يسمّيها سجل المعهد — يُبحث عنها بالاسم لا بالموقع، فترتيب الأعمدة لا يهم. */
const HEADERS: Record<Exclude<keyof SheetRow, "line">, string[]> = {
  name: ["الاسم"],
  birth: ["المواليد", "تاريخ الميلاد"],
  father: ["الأب", "اسم الأب", "اسم الوالد"],
  mother: ["الأم", "اسم الأم", "اسم الوالدة"],
  phone: ["رقم الهاتف", "الهاتف", "رقم ولي الأمر"],
  teacher: ["المدرس", "الأستاذ"],
  registered: ["تاريخ التسجيل"],
  cohort: ["الفوج"],
  notes: ["ملحوظات", "ملاحظات"],
};

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** CSV → صفوف (يدعم الحقول المقتبسة والأسطر داخلها). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** يقرأ صفوف الطلاب من CSV — يرفض الملف إن غاب عمود الاسم أو المدرس. */
export function readStudentSheet(csv: string): { rows: SheetRow[] } | { error: string } {
  const table = parseCsv(csv.replace(/^﻿/, ""));
  if (table.length < 2) return { error: "الجدول فارغ." };
  const header = table[0].map((h) => clean(h));
  const idx = {} as Record<keyof typeof HEADERS, number>;
  for (const [key, names] of Object.entries(HEADERS) as [keyof typeof HEADERS, string[]][]) {
    idx[key] = header.findIndex((h) => names.includes(h));
  }
  if (idx.name < 0 || idx.teacher < 0) return { error: "لم يُعثر على عمودي «الاسم» و«المدرس» في الصف الأول من الجدول." };

  const rows: SheetRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const get = (k: keyof typeof HEADERS) => (idx[k] >= 0 ? clean(cells[idx[k]]) : "");
    const name = get("name");
    if (!name) return;
    rows.push({
      line: i + 2,
      name,
      birth: get("birth"),
      father: get("father"),
      mother: get("mother"),
      phone: get("phone"),
      teacher: get("teacher"),
      registered: get("registered"),
      cohort: get("cohort"),
      notes: get("notes"),
    });
  });
  return { rows };
}

/** يستخرج أول رقم جوال صحيح من خانة قد تحوي رقمين أو رمزًا زائدًا. */
export function pickMobile(raw: string): string | null {
  const western = toWesternDigits(raw);
  const whole = normalizePhone(western);
  if (isValidMobile(whole)) return whole;
  // فواصل بين رقمين: / , ; | سطر جديد، أو «و» — لا المسافات (قد تكون داخل الرقم الواحد: 0933 123 456)
  for (const part of western.split(/[\/,;|\n،]+|\s+و\s*/).filter(Boolean)) {
    const p = normalizePhone(part);
    if (isValidMobile(p)) return p;
  }
  // رقمان ملتصقان بلا فاصل (20 خانة مثلًا): أول 10 خانات تبدأ بـ 09
  const digits = western.replace(/\D/g, "");
  const m = digits.match(/09\d{8}/);
  return m ? m[0] : null;
}

/** سنة الميلاد من خانة «المواليد» (مثل «2012» أو «2012.0») — أو null. */
export function pickBirthYear(raw: string): string | null {
  const m = toWesternDigits(raw).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

/** تاريخ التسجيل «يوم/شهر/سنة» ← YYYY-MM-DD، أو null إن لم يكن تاريخًا صحيحًا. */
export function pickDate(raw: string): string | null {
  const m = toWesternDigits(raw).match(/^(\d{1,2})\s*[/.\-]+\s*(\d{1,2})\s*[/.\-]+\s*(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** رابط Google Sheets ← رابط تنزيله CSV (الورقة الأولى، أو الورقة المحددة بـ gid في الرابط). */
export function sheetCsvUrl(link: string): string | null {
  const id = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/)?.[1];
  if (!id) return null;
  const gid = link.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}

/** مطابقة أسماء بتجاهل الهمزات والتاء المربوطة والمسافات الزائدة — لاقتراح المدرس/الفوج المقابل. */
export function looseName(s: string): string {
  return s
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
