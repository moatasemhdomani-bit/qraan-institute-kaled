/**
 * منهج «السنة النبوية» (إعلان السبر المرحلي في السنة النبوية — أوقاف حلب): ثلاثة أقسام منفصلة، يسير الطالب
 * في كل قسم فرعًا بعد فرع. السبر محلي (داخل المعهد، يجريه مختبر الحديث) وخارجي (من جهة الأوقاف)،
 * والحد الأدنى للنجاح 80 من 100. يشترط التدرّج ضمن القسم — يظهر تحذيرًا فقط ولا يمنع السبر.
 */
export type SunnahSectionId = "HADITH" | "SHAMAIL" | "SIRA";

export const SUNNAH_SECTIONS: { id: SunnahSectionId; label: string; branches: string[] }[] = [
  {
    id: "HADITH",
    label: "الحديث الشريف",
    branches: [
      "مختارات من الأحاديث والأذكار النبوية",
      "الأربعين النووية",
      "أحاديث مختارة من رياض الصالحين",
      "عمدة الأحكام — إلى آخر باب الاعتكاف",
      "عمدة الأحكام — كامل",
      "رياض الصالحين — المئة الأولى",
      "رياض الصالحين — المئة الثانية",
      "رياض الصالحين — 311 حديثًا",
      "رياض الصالحين — 631 حديثًا",
      "رياض الصالحين — 1270 حديثًا",
      "رياض الصالحين — كامل",
    ],
  },
  {
    id: "SHAMAIL",
    label: "الشمائل المحمدية",
    branches: [
      "نور العيون في تلخيص سيرة الأمين المأمون",
      "شمائل الترمذي — إلى باب صفة شرب رسول الله",
      "شمائل الترمذي — كامل",
      "سيدنا محمد رسول الله — إلى ص130",
      "سيدنا محمد رسول الله — ص130 إلى ص278",
      "سيدنا محمد رسول الله — ص278 إلى ص455",
      "سيدنا محمد رسول الله — كامل",
    ],
  },
  {
    id: "SIRA",
    label: "السيرة النبوية",
    branches: [
      "النفحات العطرية في سيرة خير البرية",
      "الأرجوزة الميئية في ذكر حال أشرف البرية",
      "الفصول في سيرة الرسول — الجزء الأول",
      "الفصول في سيرة الرسول — كامل",
    ],
  },
];

export const SUNNAH_PASS_MARK = 80;

const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر"];

export const sunnahSection = (id: string | null | undefined) => SUNNAH_SECTIONS.find((s) => s.id === id);
export const sunnahSectionLabel = (id: string | null | undefined) => sunnahSection(id)?.label ?? "";

/** «الفرع الثالث» */
export const branchOrdinal = (n: number) => `الفرع ${ORDINALS[n - 1] ?? n}`;

/** «الحديث الشريف — الفرع الثاني (الأربعين النووية)» */
export function sunnahBranchLabel(section: string | null | undefined, branch: number | null | undefined, withName = true): string {
  const s = sunnahSection(section);
  if (!s || branch == null) return s?.label ?? "";
  const name = s.branches[branch - 1];
  return `${s.label} — ${branchOrdinal(branch)}${withName && name ? ` (${name})` : ""}`;
}

/**
 * تحذير التدرّج: لا يُسبر الطالب في فرع حتى يشارك في الفرع الأدنى منه ضمن القسم نفسه
 * (أي سبر فيه، محليًا أو من الأوقاف، ناجحًا أو إعادة). null = لا تحذير.
 */
export function sunnahProgressWarning(history: { section: string | null; branch: number | null }[], section: SunnahSectionId, branch: number): string | null {
  if (branch <= 1) return null;
  const took = history.some((h) => h.section === section && h.branch === branch - 1);
  if (took) return null;
  return `تنبيه: لم يُسبر الطالب بعد في ${branchOrdinal(branch - 1)} من «${sunnahSectionLabel(section)}» — يشترط التدرّج ضمن القسم.`;
}

/**
 * كتب كل منهج للتسميع بالأرقام: الترقيم يبدأ من 1 في كل كتاب ويستمر عبر فروع الكتاب نفسه
 * (رياض الصالحين مثلًا من الفرع السادس إلى الحادي عشر). unit: ما يُعدّ في الكتاب.
 */
export const SUNNAH_BOOKS: Record<SunnahSectionId, { id: string; label: string; unit: string; branches: number[] }[]> = {
  HADITH: [
    { id: "MUKHTARAT", label: "مختارات من الأحاديث والأذكار النبوية", unit: "الحديث", branches: [1] },
    { id: "ARBAEEN", label: "الأربعين النووية", unit: "الحديث", branches: [2] },
    { id: "RIYAD_SELECTED", label: "أحاديث مختارة من رياض الصالحين", unit: "الحديث", branches: [3] },
    { id: "UMDA", label: "عمدة الأحكام", unit: "الحديث", branches: [4, 5] },
    { id: "RIYAD", label: "رياض الصالحين", unit: "الحديث", branches: [6, 7, 8, 9, 10, 11] },
  ],
  SHAMAIL: [
    { id: "NOOR", label: "نور العيون في تلخيص سيرة الأمين المأمون", unit: "رقم", branches: [1] },
    { id: "SHAMAIL_TIRMIDHI", label: "شمائل الترمذي", unit: "الحديث", branches: [2, 3] },
    { id: "SAYYIDUNA", label: "سيدنا محمد رسول الله", unit: "الصفحة", branches: [4, 5, 6, 7] },
  ],
  SIRA: [
    { id: "NAFAHAT", label: "النفحات العطرية في سيرة خير البرية", unit: "رقم", branches: [1] },
    { id: "URJUZA", label: "الأرجوزة الميئية في ذكر حال أشرف البرية", unit: "البيت", branches: [2] },
    { id: "FUSUL", label: "الفصول في سيرة الرسول", unit: "رقم", branches: [3, 4] },
  ],
};

export const sunnahBook = (section: string, book: string) => SUNNAH_BOOKS[section as SunnahSectionId]?.find((b) => b.id === book);

/** «الأربعين النووية — الحديث 7» / «… — الحديث 7 إلى 9» */
export function sunnahRecLabel(section: string, book: string, from: number, to: number): string {
  const b = sunnahBook(section, book);
  const range = from === to ? `${from}` : `${from} إلى ${to}`;
  return b ? `${b.label} — ${b.unit} ${range}` : range;
}

export const SUNNAH_REPEAT_GRADE = "إعادة";

/**
 * ما يُقترح على المختبِر في الجلسة التالية (للمساعدة فقط — يمكنه الرجوع والتقدّم):
 * في كتاب آخر تسميع للطالب في هذا المنهج — كل رقم آخرُ تقدير له «إعادة» (يبقى ضمن التالي)،
 * ثم الرقم بعد أعلى رقم سمّعه بغير «إعادة». بلا تسميع سابق: أول كتب المنهج من الرقم 1.
 */
export function sunnahNext(
  section: SunnahSectionId,
  history: { section: string; book: string; fromNo: number; toNo: number; grade: string; date: string; createdAt: string }[]
): { book: string; nos: number[] } {
  const mine = history
    .filter((h) => h.section === section)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const last = mine[mine.length - 1];
  if (!last) return { book: SUNNAH_BOOKS[section][0].id, nos: [1] };
  const inBook = mine.filter((h) => h.book === last.book);
  // آخر تقدير لكل رقم في الكتاب
  const latest = new Map<number, string>();
  for (const h of inBook) for (let n = h.fromNo; n <= h.toNo; n++) latest.set(n, h.grade);
  const repeats = [...latest].filter(([, g]) => g === SUNNAH_REPEAT_GRADE).map(([n]) => n).sort((a, b) => a - b);
  const done = [...latest].filter(([, g]) => g !== SUNNAH_REPEAT_GRADE).map(([n]) => n);
  // لم ينجح بعد في أي رقم من الكتاب: يبقى التالي ما كان «إعادة» وحده
  if (!done.length && repeats.length) return { book: last.book, nos: repeats };
  const next = (done.length ? Math.max(...done) : 0) + 1;
  return { book: last.book, nos: [...new Set([...repeats, next])].sort((a, b) => a - b) };
}

/**
 * مراحل كل مستوى: عدد أرقام كل مرحلة بالترتيب (كما كتبتها الإدارة) — المرحلة الأولى تبدأ من أول الكتاب،
 * وكل مرحلة بعدها تبدأ بعد نهاية السابقة. المستوى بلا مراحل مُدخلة يُسمَّع بلا قيد.
 * التسلسل: يُسمَّع كل رقم وحده ← سبر المرحلة ← … ← سبر المستوى ← المستوى التالي.
 */
export const SUNNAH_STAGE_COUNTS: Partial<Record<SunnahSectionId, Record<number, number[]>>> = {
  HADITH: {
    1: [15, 20, 40, 42], // المختارات: 117 حديثًا
    2: [10, 10, 10, 12], // الأربعين النووية: 42 حديثًا
  },
};

/** نهاية كل مرحلة في ترقيم الكتاب (تراكميًا) — null بلا مراحل مُدخلة */
export function levelStages(section: SunnahSectionId, level: number): number[] | null {
  const counts = SUNNAH_STAGE_COUNTS[section]?.[level];
  if (!counts) return null;
  // مستويات تشترك في كتاب واحد (عمدة الأحكام، رياض الصالحين): يبدأ المستوى بعد نهاية ما قبله من الكتاب
  const book = SUNNAH_BOOKS[section].find((b) => b.branches.includes(level));
  let end = 0;
  for (const l of book?.branches ?? []) {
    if (l >= level) break;
    end += (SUNNAH_STAGE_COUNTS[section]?.[l] ?? []).reduce((a, b) => a + b, 0);
  }
  return counts.map((c) => (end += c));
}

/** كتاب المستوى (الفرع) */
export const levelBook = (section: SunnahSectionId, level: number) => SUNNAH_BOOKS[section].find((b) => b.branches.includes(level)) ?? SUNNAH_BOOKS[section][0];

export type SunnahPosition = {
  section: SunnahSectionId;
  /** المستوى الحالي = بعد أعلى مستوى نجح فيه (سبر المستوى محليًا أو من الأوقاف) */
  level: number;
  book: string;
  stages: number[] | null;
  /** المرحلة الحالية (1…) — null بلا مراحل مُدخلة، أو بعد النجاح في كل المراحل */
  stage: number | null;
  /** أول رقم جديد في المرحلة الحالية وآخر رقم فيها */
  stageStart: number | null;
  stageEnd: number | null;
  /** نجح في كل مراحل المستوى — ينتظر سبر المستوى */
  awaitingLevelExam: boolean;
  /** أنهى كل مستويات المنهج */
  finished: boolean;
};

export function sunnahPosition(
  section: SunnahSectionId,
  passedLevels: number[],
  passedStages: { level: number; stage: number }[]
): SunnahPosition {
  const total = SUNNAH_SECTIONS.find((s) => s.id === section)!.branches.length;
  const top = Math.max(0, ...passedLevels);
  const finished = top >= total;
  const level = Math.min(top + 1, total);
  const book = levelBook(section, level).id;
  const stages = finished ? null : levelStages(section, level);
  let stage: number | null = null;
  if (stages) {
    const i = stages.findIndex((_, k) => !passedStages.some((p) => p.level === level && p.stage === k + 1));
    stage = i >= 0 ? i + 1 : null;
  }
  return {
    section,
    level,
    book,
    stages,
    stage,
    stageStart: stages && stage ? (stage > 1 ? stages[stage - 2] + 1 : levelStartNo(section, level)) : null,
    stageEnd: stages && stage ? stages[stage - 1] : stages ? stages[stages.length - 1] : null,
    awaitingLevelExam: !!stages && stage === null,
    finished,
  };
}

/** أعلى رقم يُسمَّع الآن — null بلا قيد */
export const sunnahMaxNo = (p: SunnahPosition) => (p.stages ? p.stageEnd : null);

/** «المستوى 1 — المرحلة 2 (من الحديث 16 إلى 20)» */
export function sunnahPositionLabel(p: SunnahPosition): string {
  if (p.finished) return "أنهى كل مستويات المنهج";
  const b = sunnahBook(p.section, p.book);
  const lvl = `المستوى ${p.level} (${b?.label ?? ""})`;
  if (!p.stages) return lvl;
  if (p.awaitingLevelExam) return `${lvl} — أنهى مراحله كلها، ينتظر سبر المستوى`;
  return `${lvl} — المرحلة ${p.stage} من ${p.stages.length} (من ${b?.unit ?? "الرقم"} ${p.stageStart} إلى ${p.stageEnd})`;
}

/** أول رقم في المستوى (ترقيم الكتاب) */
export function levelStartNo(section: SunnahSectionId, level: number): number {
  const ends = levelStages(section, level);
  const counts = SUNNAH_STAGE_COUNTS[section]?.[level];
  return ends && counts ? ends[0] - counts[0] + 1 : 1;
}

/** موقع الطالب من سبوره في المنهج: المستويات الناجحة (محليًا أو من الأوقاف، النجاح 80) والمراحل الناجحة (بغير «إعادة») */
export function positionFromExams(
  section: SunnahSectionId,
  exams: { type: string; section: string | null; branch: number | null; mark: number | null; repeat: boolean; grade?: string | null; stageNo?: number | null }[]
): SunnahPosition {
  const mine = exams.filter((e) => e.section === section && e.branch != null);
  const passedLevels = mine
    // المستوى التالي يُفتح بالنجاح في السبر المحلي للمستوى
    .filter((e) => (e.type === "SUNNAH" || e.type === "SUNNAH_AWQAF") && !e.repeat && e.mark != null && e.mark >= SUNNAH_PASS_MARK)
    .map((e) => e.branch as number);
  const passedStages = mine
    .filter((e) => e.type === "SUNNAH_STAGE" && !e.repeat && !!e.grade && e.grade !== SUNNAH_REPEAT_GRADE && e.stageNo != null)
    .map((e) => ({ level: e.branch as number, stage: e.stageNo as number }));
  return sunnahPosition(section, passedLevels, passedStages);
}

/**
 * الاقتراح مع التدرّج: في المستوى ذي المراحل يكون التسميع في كتاب المستوى، ولا يتجاوز آخر رقم في المرحلة الحالية
 * (nos فارغة = أنهى أرقام المرحلة، ينتظر سبرها أو سبر المستوى). بلا مراحل: كما في sunnahNext.
 */
export function sunnahSuggest(
  pos: SunnahPosition,
  history: { section: string; book: string; fromNo: number; toNo: number; grade: string; date: string; createdAt: string }[]
): { book: string; nos: number[] } {
  if (!pos.stages) return sunnahNext(pos.section, history);
  const inBook = history.filter((h) => h.section === pos.section && h.book === pos.book);
  const start = levelStartNo(pos.section, pos.level);
  const base = inBook.length ? sunnahNext(pos.section, inBook) : { book: pos.book, nos: [start] };
  const max = sunnahMaxNo(pos) ?? Infinity;
  return { book: pos.book, nos: base.nos.filter((n) => n >= start && n <= max) };
}

export type SunnahLevelExamType = "SUNNAH" | "SUNNAH_NOMINATION" | "SUNNAH_AWQAF";

const passedLevelExam = (
  mine: { type: string; mark: number | null; repeat: boolean }[],
  type: SunnahLevelExamType
) => mine.some((e) => e.type === type && !e.repeat && e.mark != null && e.mark >= SUNNAH_PASS_MARK);

/**
 * شرط سبر المستوى — يُرجع سبب المنع أو null (كإدارة القرآن):
 * - السبر المحلي للمستوى: بعد النجاح في كل مراحله (للمستويات ذات المراحل المُدخلة) — النجاح فيه يفتح المستوى التالي.
 * - سبر ترشيح الأوقاف: بعد النجاح في السبر المحلي للمستوى — الناجح يُرفع إلى قائمة الجاهزين لسبر الأوقاف.
 * - سبر الأوقاف: لمن نجح في سبر ترشيح الأوقاف لهذا المستوى فقط. النجاح من 80 في الثلاثة.
 */
export function levelExamBlock(
  type: SunnahLevelExamType,
  section: SunnahSectionId,
  level: number,
  exams: { type: string; section: string | null; branch: number | null; mark: number | null; repeat: boolean; grade?: string | null; stageNo?: number | null }[]
): string | null {
  const mine = exams.filter((e) => e.section === section && e.branch === level);
  if (type === "SUNNAH_AWQAF") {
    return passedLevelExam(mine, "SUNNAH_NOMINATION") ? null : `لا يدخل سبر الأوقاف للمستوى ${level} إلا من نجح في سبر ترشيح الأوقاف لهذا المستوى.`;
  }
  if (type === "SUNNAH_NOMINATION") {
    return passedLevelExam(mine, "SUNNAH") ? null : `سبر ترشيح الأوقاف للمستوى ${level} بعد النجاح في السبر المحلي لهذا المستوى.`;
  }
  const stages = levelStages(section, level);
  if (!stages) return null;
  const missing = stages
    .map((_, k) => k + 1)
    .filter((k) => !mine.some((e) => e.type === "SUNNAH_STAGE" && e.stageNo === k && !e.repeat && !!e.grade && e.grade !== SUNNAH_REPEAT_GRADE));
  return missing.length ? `سبر المستوى ${level} بعد النجاح في كل مراحله — لم ينجح بعد في: المرحلة ${missing.join("، ")}.` : null;
}

/**
 * قائمة الجاهزين لسبر الأوقاف: الناجحون في سبر ترشيح الأوقاف لمستوى، ولم تُدخل لهم نتيجة سبر الأوقاف
 * لهذا المستوى بتاريخ الترشيح أو بعده (آخر ترشيح ناجح هو المعتبر).
 */
export function sunnahReadyForAwqaf<T extends { id: string; studentId: string; type: string; section: string | null; branch: number | null; mark: number | null; repeat: boolean; date: string }>(
  exams: T[]
): T[] {
  const noms = exams
    .filter((e) => e.type === "SUNNAH_NOMINATION" && !e.repeat && e.mark != null && e.mark >= SUNNAH_PASS_MARK)
    .sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const ready: T[] = [];
  for (const n of noms) {
    const key = `${n.studentId}|${n.section}|${n.branch}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const done = exams.some(
      (e) => e.type === "SUNNAH_AWQAF" && e.studentId === n.studentId && e.section === n.section && e.branch === n.branch && e.date >= n.date
    );
    if (!done) ready.push(n);
  }
  return ready;
}

/**
 * نجوم مختبر الحديث: كل تسميع أو سبر يُعطي/يأخذ نجومًا ضمن المجال −2 … 10 — يعدّلها المختبِر بحرية.
 * الافتراضي: النجاح في سبر +3، و«إعادة» −1 (والطالب الذي رصيده صفر يُعفى من السحب).
 */
export const SUNNAH_STARS_MIN = -2;
export const SUNNAH_STARS_MAX = 10;
export const SUNNAH_PASS_STARS = 3;
export const SUNNAH_REPEAT_STARS = -1;
export const clampSunnahStars = (n: number) => Math.max(SUNNAH_STARS_MIN, Math.min(SUNNAH_STARS_MAX, Math.round(n)));
export const validSunnahStars = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= SUNNAH_STARS_MIN && n <= SUNNAH_STARS_MAX;

/** عدد الأحاديث في اليوم الذي يُنبَّه عنده المختبِر لزيادة النجوم */
export const SUNNAH_DAILY_ALERT = 5;
