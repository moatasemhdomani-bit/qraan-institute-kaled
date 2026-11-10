/** شهادات المعهد — الأنواع وتسمياتها وتنسيق ما يُكتب فيها (آمن للاستيراد في الواجهة). */

export type CertificateKindId = "AMMA" | "ARABIC";

export const CERTIFICATE_KINDS: CertificateKindId[] = ["ARABIC", "AMMA"];

/** اسم الخيار في الشاشة */
export const CERTIFICATE_CHOICES: Record<CertificateKindId, string> = {
  ARABIC: "قراءة عربية",
  AMMA: "عمّ غيباً",
};

export const CERTIFICATE_LABELS: Record<CertificateKindId, string> = {
  AMMA: "شهادة حفظ جزء عمّ",
  ARABIC: "شهادة نجاح في القراءة العربية",
};

/** السبر الذي يؤهّل لها — يظهر في الشاشة */
export const CERTIFICATE_RULES: Record<CertificateKindId, string> = {
  AMMA: "السبر المحلي «عمّ غيباً»",
  ARABIC: "المرحلة 6 من سبر القراءة العربية",
};

/** شهادة القراءة العربية تُمنح بالنجاح في المرحلة 6 (علامة من 100) */
export const ARABIC_CERT_STAGE = 6;

/** ما يُكتب في الشهادة — لقطة يوم الإصدار */
export type CertificateData = {
  /** اسم الطالب كما يُكتب في الشهادة (ثلاثي لشهادة عمّ، والاسم مع النسبة لشهادة القراءة العربية) */
  name: string;
  fatherName: string;
  birthPlace: string;
  birthYear: string;
  /** العلامة من 100 (شهادة القراءة العربية) */
  mark: number | null;
  examDate: string; // YYYY-MM-DD
  issueDate: string; // YYYY-MM-DD
};

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
/** أرقام عربية مشرقية (١٢٣) — والفاصلة العشرية «٫» */
export const toArabicDigits = (s: string | number) => String(s).replace(/\d/g, (d) => AR_DIGITS[+d]).replace(/\./g, "٫");

/** التاريخ الهجري (أم القرى) لتاريخ ميلادي YYYY-MM-DD: { d, m, y } */
export function hijriParts(date: string): { d: string; m: string; y: string } {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const get = (t: string) => parts.find((p) => p.type === t)?.value.replace(/\D/g, "") ?? "";
  return { d: get("day"), m: get("month"), y: get("year") };
}

/** «١٩ / ٥ / ١٤٤٨ هـ» */
export function hijriLabel(date: string): string {
  const { d, m, y } = hijriParts(date);
  return toArabicDigits(`${d} / ${m} / ${y}`) + " هـ";
}

/** «١٠ / ١١ / ٢٠٢٦ م» */
export function gregorianLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return toArabicDigits(`${d} / ${m} / ${y}`) + " م";
}
