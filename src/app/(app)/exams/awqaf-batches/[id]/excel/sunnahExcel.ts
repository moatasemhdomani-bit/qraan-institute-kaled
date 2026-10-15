import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { prisma } from "@/lib/db";
import { SUNNAH_SECTIONS, sunnahSection } from "@/lib/sunnah";

/**
 * ملف ترشيح سبر الأوقاف للسنّة النبوية (Excel) — قالب الأوقاف (templates/awqaf-sunnah-nomination.xlsx):
 * جدولان: «المدرسين والكبار» (مواليد سنة الدفعة − 18 فما قبل) ثم «الطلاب» (الأصغر، ومن لا تاريخ ولادة له).
 */

const EMPTY = "__";
// إن لم يُدخل مكان الولادة في بيانات الطالب
const BIRTH_CITY = "حلب";
const INSTITUTE = "خالد بن الوليد";
const DISTRICT = "الحمدانية";

// تسمية الأوقاف لبعض الفروع (كما في ملفها)، وإلا اسم الفرع في المنهج
// (من «إعلان السبر المرحلي في السنة النبوية 2026» الصادر عن أوقاف حلب)
const AWQAF_BRANCH_NAMES: Record<string, Record<number, string>> = {
  HADITH: {
    1: "مختارات من الأحاديث والأذكار النبوية",
    2: "الأربعين النووية",
    3: "أحاديث مختارة من كتاب رياض الصالحين",
    4: "عمدة الأحكام للمقدسي من أول الكتاب إلى آخر باب الاعتكاف",
    5: "عمدة الأحكام للمقدسي كامل",
    6: "المئة الأولى من رياض الصالحين",
    7: "المئة الثانية من رياض الصالحين",
    8: "311 حديثًا من رياض الصالحين",
    9: "631 حديثًا من رياض الصالحين",
    10: "1270 حديثًا من رياض الصالحين",
    11: "رياض الصالحين للإمام النووي كامل",
  },
  SHAMAIL: {
    1: "نور العيون في تلخيص سيرة الأمين المأمون",
    2: "شمائل النبي ﷺ للإمام الترمذي إلى باب ما جاء في صفة شرب رسول الله ﷺ",
    3: "شمائل النبي ﷺ للإمام الترمذي كامل",
    4: "سيدنا محمد رسول الله ﷺ من أول الكتاب إلى ص130",
    5: "سيدنا محمد رسول الله ﷺ من ص130 إلى ص278",
    6: "سيدنا محمد رسول الله ﷺ من ص278 إلى ص455",
    7: "سيدنا محمد رسول الله ﷺ كامل",
  },
  SIRA: {
    1: "النفحات العطرية في سيرة خير البرية ﷺ",
    2: "الأرجوزة الميئية في ذكر حال أشرف البرية ﷺ",
    3: "الفصول في سيرة الرسول ﷺ — الجزء الأول: سيرته ﷺ وغزواته",
    4: "الفصول في سيرة الرسول ﷺ كامل",
  },
};
const branchName = (section: string, level: number) => AWQAF_BRANCH_NAMES[section]?.[level] ?? sunnahSection(section)?.branches[level - 1] ?? "";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cell = (ref: string, style: number, v: string | number | null) => {
  if (v == null || v === "") return `<c r="${ref}" s="${style}"/>`;
  if (typeof v === "number" || (/^\d{1,15}$/.test(v) && !v.startsWith("0"))) return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
};

type Row = { order: number; name: string; birthPlace: string; father: string; mother: string; birthYear: number | null; branch: string; mark: number | string; mobile: string };

export async function sunnahNominationExcel(batchId: string): Promise<{ buf: Uint8Array; date: string } | null> {
  const batch = await prisma.awqafBatch.findUnique({
    where: { id: batchId },
    include: {
      results: { include: { student: { select: { id: true, name: true, fatherName: true, motherName: true, birthDate: true, birthPlace: true, guardianPhone: true } } } },
    },
  });
  if (!batch || batch.kind !== "SUNNAH") return null;

  const studentIds = batch.results.map((r) => r.studentId);
  // أسبار المستويات (لا المراحل): ترشيح الأوقاف لعلامة المعهد، وكلها لشرط التدرّج
  const exams = await prisma.exam.findMany({
    where: { studentId: { in: studentIds }, type: { in: ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_AWQAF"] }, sunnahStage: null, date: { lte: batch.date } },
    select: { studentId: true, type: true, sunnahSection: true, stage: true, resultMark: true, repeat: true, date: true },
    orderBy: { date: "desc" },
  });

  const rows: Row[] = batch.results
    .filter((r) => r.sunnahSection && r.sunnahLevel)
    .map((r) => {
      const s = r.student;
      const section = r.sunnahSection!;
      const level = r.sunnahLevel!;
      const mine = exams.filter((e) => e.studentId === s.id && e.sunnahSection === section);
      const nom = mine.find((e) => e.type === "SUNNAH_NOMINATION" && e.stage === level && !e.repeat && e.resultMark != null);
      return {
        // ترتيب المنهج ثم المستوى
        order: SUNNAH_SECTIONS.findIndex((x) => x.id === section) * 100 + level,
        name: s.name,
        birthPlace: s.birthPlace?.trim() || BIRTH_CITY,
        father: s.fatherName?.trim() || EMPTY,
        mother: s.motherName?.trim() || EMPTY,
        birthYear: s.birthDate && /^\d{4}/.test(s.birthDate) ? Number(s.birthDate.slice(0, 4)) : null,
        branch: branchName(section, level),
        mark: nom?.resultMark ?? "--",
        mobile: (s.guardianPhone || "").replace(/\s+/g, "") || EMPTY,
      };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ar"));

  const year = Number(batch.date.slice(0, 4));
  const adultMax = year - 18;
  const adults = rows.filter((x) => x.birthYear != null && x.birthYear <= adultMax);
  const kids = rows.filter((x) => !(x.birthYear != null && x.birthYear <= adultMax));

  const zip = await JSZip.loadAsync(await readFile(path.join(process.cwd(), "templates", "awqaf-sunnah-nomination.xlsx")));
  const sp = "xl/worksheets/sheet1.xml";
  let sheet = await zip.file(sp)!.async("string");

  // عنوان الجدول الثاني وعناوين أعمدته — من القالب، يُعاد ترقيمهما
  const rowXml = (n: number) => sheet.match(new RegExp(`<row r="${n}"[^>]*>.*?</row>`, "s"))![0];
  const renumber = (xml: string, from: number, to: number) => xml.replace(new RegExp(`r="([A-Z]*)${from}"`, "g"), `r="$1${to}"`);
  const kidsTitleTpl = rowXml(12);
  const kidsHeadTpl = rowXml(13);

  const dataRow = (x: Row | null, i: number, r: number, adult: boolean) => {
    const open = adult
      ? `<row r="${r}" spans="1:14" s="9" customFormat="1" ht="51.6" customHeight="1">`
      : `<row r="${r}" spans="1:14" ht="40.8" customHeight="1">`;
    if (!x) return open + ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"].map((c) => cell(`${c}${r}`, 8, null)).join("") + "</row>";
    return (
      open +
      cell(`A${r}`, adult ? 5 : 4, i + 1) +
      cell(`B${r}`, adult ? 10 : 6, x.name) +
      cell(`C${r}`, 6, x.father) +
      cell(`D${r}`, 6, x.mother) +
      cell(`E${r}`, 6, x.birthPlace) +
      cell(`F${r}`, 7, x.birthYear ?? EMPTY) +
      cell(`G${r}`, 6, x.branch) +
      cell(`H${r}`, 8, x.mark) +
      cell(`I${r}`, 8, "نعم") +
      cell(`J${r}`, 8, EMPTY) +
      cell(`K${r}`, 8, x.mobile) +
      cell(`L${r}`, 8, INSTITUTE) +
      cell(`M${r}`, 8, DISTRICT) +
      cell(`N${r}`, 8, 90 + Math.floor(Math.random() * 11)) +
      "</row>"
    );
  };

  // الجدول الأول: من الصف 6 (صف فارغ واحد على الأقل كي يبقى الجدول سليمًا)
  let r = 6;
  let xml = "";
  const list1 = adults.length ? adults : [null];
  list1.forEach((x, i) => (xml += dataRow(x, i, r++, true)));
  const t1End = r - 1;
  const titleRow = r++;
  const headRow = r++;
  const kidsTitle = renumber(kidsTitleTpl, 12, titleRow).replace(
    /(<c r="A\d+" s="\d+") t="s"><v>\d+<\/v><\/c>/,
    `$1 t="inlineStr"><is><t>ترشيح أسماء الطلاب (مواليد ${adultMax + 1}، ${adultMax + 2}، وهكذا)</t></is></c>`
  );
  xml += kidsTitle + renumber(kidsHeadTpl, 13, headRow);
  const list2 = kids.length ? kids : [null];
  list2.forEach((x, i) => (xml += dataRow(x, i, r++, false)));
  const t2End = r - 1;

  sheet = sheet
    .replace(/<row r="12"[^>]*>[\s\S]*?<\/row>/, "")
    .replace(/<row r="13"[^>]*>[\s\S]*?<\/row>/, "")
    .replace("</sheetData>", `${xml}</sheetData>`)
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:N${t2End}"/>`)
    .replace(/<mergeCell ref="A12:N12"\/>/, `<mergeCell ref="A${titleRow}:N${titleRow}"/>`)
    // عنوان الجدول الأول: مواليد سنة الدفعة − 18 فما قبل
    .replace(
      /(<row r="4"[^>]*><c r="A4" s="\d+") t="s"><v>\d+<\/v><\/c>/,
      `$1 t="inlineStr"><is><t>ترشيح أسماء المدرسين والكبار (مواليد ${adultMax}، ${adultMax - 1}، وهكذا)</t></is></c>`
    );
  zip.file(sp, sheet);

  // تاريخ السبر في الترويسة = تاريخ الدفعة
  const ssp = "xl/sharedStrings.xml";
  const [y, m, d] = batch.date.split("-").map(Number);
  zip.file(ssp, (await zip.file(ssp)!.async("string")).replace(/\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*م/, `${d} /  ${m} /  ${y}م`));

  const setRef = async (p: string, ref: string) => {
    const t = await zip.file(p)!.async("string");
    zip.file(p, t.replace(/ref="A\d+:N\d+"/g, `ref="${ref}"`));
  };
  await setRef("xl/tables/table1.xml", `A5:N${t1End}`);
  await setRef("xl/tables/table2.xml", `A${headRow}:N${t2End}`);

  return { buf: await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }), date: batch.date };
}
