import { readFileSync, existsSync } from "fs";
import path from "path";
import { toArabicDigits, type CertificateData, type CertificateKindId } from "./certificate";
import { reportFooterSvg } from "./reportFooter";

/** ملف من مجلد المشروع بصيغة data: URI — الخط والشعار مضمَّنان في الصفحة فلا تحتاج شبكة */
function dataUri(rel: string, mime: string): string {
  const p = path.join(process.cwd(), rel);
  return existsSync(p) ? `data:${mime};base64,${readFileSync(p).toString("base64")}` : "";
}

let assets: { book: string; medium: string; bold: string; logo: string } | null = null;
function loadAssets() {
  assets ??= {
    // خط Expo Arabic — خط هوية المعهد في المطبوعات (خارج public/ فلا يُنشر للعموم)
    book: dataUri("templates/fonts/expo-arabic-book.ttf", "font/ttf"),
    medium: dataUri("templates/fonts/expo-arabic-medium.otf", "font/otf"),
    bold: dataUri("templates/fonts/expo-arabic-bold.otf", "font/otf"),
    logo: dataUri("public/logo-mark.png", "image/png"),
  };
  return assets;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** قيمة من بيانات الطالب — بلا خط تحتها، وإن غابت القيمة: فراغ أبيض */
const field = (value: string, minMm: number) =>
  `<span class="v" style="min-width:${minMm}mm">${value ? esc(value) : "&nbsp;"}</span>`;

/** شريط الأقواس (زخرفة تذييل التقارير نفسها) — الإطار العلوي والسفلي للشهادة */
const ARCHES = `<div class="arches">${reportFooterSvg("#a07d1c")}</div>`;

const CORNER = (cls: string) => `<svg class="corner ${cls}" viewBox="0 0 80 80"><g fill="none" stroke="#a07d1c" stroke-width="1.6">
<path d="M78 4 H22 Q4 4 4 22 V78"/><path d="M70 12 H26 Q12 12 12 26 V70"/>
<g transform="translate(30 30)"><rect x="-10" y="-10" width="20" height="20"/><rect x="-10" y="-10" width="20" height="20" transform="rotate(45)"/><circle r="4" fill="#d4af37" stroke="none"/></g>
</g></svg>`;

function style(a: ReturnType<typeof loadAssets>) {
  return `
@font-face{font-family:Expo;src:url(${a.book});font-weight:400}
@font-face{font-family:Expo;src:url(${a.medium});font-weight:500}
@font-face{font-family:Expo;src:url(${a.bold});font-weight:700}
@page{size:297mm 210mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff;font-family:Expo,"Traditional Arabic","Arabic Typesetting","Noto Naskh Arabic",sans-serif;color:#0f2a4d;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:297mm;height:210mm;padding:6mm;background:#fcfaf4;break-after:page;page-break-after:always;overflow:hidden}
.page:last-child{break-after:auto;page-break-after:auto}
.band{height:100%;display:flex;flex-direction:column;padding:0 4mm;border:.6mm solid #a07d1c;background:#f6efdc}
.arches{padding:2mm 1mm 1.6mm}
.arches:last-child{padding:1.6mm 1mm 2mm}
.inner{flex:1;min-height:0;position:relative;border:.5mm solid #a07d1c;outline:.25mm solid #a07d1c;outline-offset:-1.6mm;
  background:radial-gradient(90% 70% at 50% -5%,#f1e4bd 0%,rgba(250,246,236,0) 60%),linear-gradient(205deg,#fffdf8 0%,#faf6ec 55%,#f3ecdc 100%);
  padding:8mm 22mm 9mm;display:flex;flex-direction:column;align-items:center}
.corner{position:absolute;width:15mm;height:15mm}
.corner.tr{top:2.5mm;right:2.5mm}.corner.tl{top:2.5mm;left:2.5mm;transform:scaleX(-1)}
.corner.br{bottom:2.5mm;right:2.5mm;transform:scaleY(-1)}.corner.bl{bottom:2.5mm;left:2.5mm;transform:scale(-1,-1)}
.wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.wm img{width:92mm;opacity:.12}
.no{position:absolute;top:8mm;left:22mm;font-size:10.5pt;color:rgba(18,48,88,.78)}
.no b{color:#0f2a4d}
header{position:relative;text-align:center}
.logo{position:absolute;top:6mm;right:20mm;width:36mm}
.inst{font-size:11pt;font-weight:500;line-height:1.45;text-align:center}
.inst small{display:block;font-size:8.5pt;font-weight:400;color:#8a6a12;text-align:center}
.verse{font-size:12pt;color:#8a6a12;margin-top:1.5mm;position:relative}
.verse .br{font-family:"Traditional Arabic","Arabic Typesetting","Amiri",serif;font-size:15pt}
h1{font-size:33pt;font-weight:700;line-height:1.35;margin-top:.5mm;position:relative;color:#0f2a4d}
.sub{font-size:15pt;font-weight:700;color:#8a6a12;margin-top:-1mm;position:relative}
.orn{display:flex;align-items:center;gap:2.5mm;width:120mm;margin:1mm 0 3mm;position:relative}
/* شهادة القراءة العربية: مسافات أوسع بين الأسطر العلوية (المعهد، الآية، العنوان، الزخرفة) */
.ar header{margin-top:1mm}
.ar .verse{margin-top:4.5mm}
.ar h1{margin-top:3mm}
.ar .orn{margin:3mm 0 4mm}
.orn span{flex:1;height:.35mm;background:linear-gradient(90deg,transparent,#a07d1c,transparent)}
.orn b{width:2.4mm;height:2.4mm;background:#a07d1c;transform:rotate(45deg)}
.body{width:100%;font-size:15.5pt;line-height:2.3;text-align:center;position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:6mm}
.body b{font-weight:700}
/* البيانات بلا خط منقّط تحتها (والناقصة فراغ أبيض) */
.v{display:inline-block;padding:0 3mm;margin:0 1mm;font-weight:700;color:#0f2a4d;line-height:1.5;text-align:center}
.hl{color:#8a6a12;font-weight:700}
footer{width:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:6mm;position:relative;font-size:11pt;color:rgba(18,48,88,.78)}
.date{line-height:2.2}
.date .blank{display:inline-block;width:34mm;border-bottom:.35mm dotted rgba(15,42,77,.55);margin:0 1.5mm}
.seal{align-self:center;color:#8a6a12;font-size:12pt;font-weight:500;padding:0 6mm 8mm}
.sigs{display:flex;gap:5mm}
.sig{flex:1;text-align:center}
.sig .line{border-bottom:.35mm dotted rgba(15,42,77,.55);height:9mm;margin:0 3mm 1mm}
`;
}

export type CertificateInput = { kind: CertificateKindId; number: number; data: CertificateData };

function certificatePage(c: CertificateInput, logo: string): string {
  const d = c.data;
  // زخارف الزوايا الأربع متماثلة، والشعار كبيرًا قرب الزاوية العليا اليمنى، واسم المعهد في الوسط وتحته «لتحفيظ القرآن الكريم»
  const head = `${["tr", "tl", "br", "bl"].map(CORNER).join("")}
${logo ? `<div class="wm"><img src="${logo}" alt=""></div><img class="logo" src="${logo}" alt="">` : ""}
<div class="no">رقم الشهادة: <b>${toArabicDigits(c.number)}</b></div>
<header><div class="inst">معهد الصحابي الجليل خالد بن الوليد<small>لتحفيظ القرآن الكريم</small></div></header>`;
  const orn = `<div class="orn"><span></span><b></b><span></span></div>`;
  // التاريخ يُكتب باليد عند التسليم
  const date = `<div class="date">حُرّر بتاريخ:<span class="blank"></span>هـ<br>الموافق:<span class="blank"></span>م</div>`;
  const sigs = (a: string, b: string) =>
    `<div class="seal">الختم</div><div class="sigs"><div class="sig"><div class="line"></div>${a}</div><div class="sig"><div class="line"></div>${b}</div></div>`;

  if (c.kind === "AMMA") {
    return `<div class="page"><div class="band">${ARCHES}<div class="inner">${head}
<div class="verse"><span class="br">﴿</span> وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا <span class="br">﴾</span></div>
<h1>شهادة حفظ</h1><div class="sub">جزء عمّ</div>${orn}
<div class="body"><div>
تشهد إدارة <b>معهد الصحابي الجليل خالد بن الوليد</b> لتحفيظ القرآن الكريم<br>
بأنّ الطالب ${field(d.name, 80)} قد أتمّ حفظ <span class="hl">جزء عمّ</span> تلاوةً وحفظًا،<br>
وقد بذل جهدًا رائعًا في تعلّم كتاب الله، وتميّز بالخلق الحسن والآداب الإسلامية الحميدة.<br>
ونسأل الله تعالى أن يتفضّل عليه بمتابعة حفظ كتابه، وتطبيق أحكامه وتدبّر آياته.<br>
<span class="hl">والحمد لله ربّ العالمين</span>
</div></div>
<footer>${date}${sigs("توقيع المشرف", "توقيع المدير")}</footer>
</div>${ARCHES}</div></div>`;
  }

  const mark = d.mark != null ? `${toArabicDigits(d.mark)} من ١٠٠` : "";
  return `<div class="page ar"><div class="band">${ARCHES}<div class="inner">${head}
<div class="verse"><span class="br">﴿</span> اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ <span class="br">﴾</span></div>
<h1>شهادة نجاح في القراءة العربية</h1>${orn}
<div class="body"><div>
تشهد إدارة <b>معهد الصحابي الجليل خالد بن الوليد</b> لتحفيظ القرآن الكريم<br>
بأنّ الطالب ${field(d.name, 62)} ابن السيد ${field(d.fatherName, 38)}<br>
المولود في ${field(d.birthPlace, 32)} سنة ${field(d.birthYear ? toArabicDigits(d.birthYear) : "", 22)}<br>
قد نجح في اختبار القراءة العربية من كتاب <span class="hl">«مختصر التمهيد للقراءة العربية»</span><br>
وذلك بدرجة ${field(mark, 34)}<br>
ونوصيه بالاهتمام بتلاوة القرآن الكريم وحفظه، ونسأل الله تعالى له التوفيق.
</div></div>
<footer>${date}${sigs("اسم المدرس وتوقيعه", "اسم المدير وتوقيعه")}</footer>
</div>${ARCHES}</div></div>`;
}

/** صفحة HTML مستقلة فيها شهادة أو أكثر — كل شهادة في صفحة A4 أفقية */
export function certificatesHtml(list: CertificateInput[]): string {
  const a = loadAssets();
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>شهادات المعهد</title><style>${style(a)}</style></head>
<body>${list.map((c) => certificatePage(c, a.logo)).join("")}</body></html>`;
}
