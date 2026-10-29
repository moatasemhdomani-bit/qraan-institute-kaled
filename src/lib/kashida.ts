/** التطويل (الكشيدة) */
const TATWEEL = "ـ";
/** حروف لا تتصل بما بعدها — لا يوضع التطويل بعدها */
const NON_JOINING = new Set("اأإآٱدذرزوؤةىءـ");
const isArabic = (c: string) => /[ؠ-ي]/.test(c);
/** صور الألف التي تُربط باللام قبلها ربطة واحدة */
const ALEFS = new Set("اأإآٱ");

/** مواضع التطويل الممكنة: بعد حرف يتصل بما بعده، وقبل حرف عربي في الكلمة نفسها */
function slots(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length - 1; i++) {
    const a = text[i];
    let j = i + 1;
    // تجاوز الحركات بعد الحرف
    while (j < text.length && /[ً-ٰٟ]/.test(text[j])) j++;
    if (j >= text.length) break;
    // لا تطويل بين اللام والألف بعدها (لا، لأ، لإ، لآ) — يكسر ربطة «لا»
    if (a === "ل" && ALEFS.has(text[j])) continue;
    if (isArabic(a) && !NON_JOINING.has(a) && isArabic(text[j])) out.push(j);
  }
  return out;
}

/**
 * يُطيل النص بالتطويل «ـ» بين الحروف المتصلة حتى يقارب العرض المطلوب (دون تجاوزه)،
 * موزَّعًا على مواضع الكلمة الأخيرة أولًا ثم بقية الكلمات.
 * measure: يقيس عرض النص بالخط المستعمل.
 */
export function stretchWithKashida(text: string, target: number, measure: (s: string) => number): string {
  if (measure(text) >= target - 1) return text;
  const pos = slots(text);
  if (pos.length === 0) return text;
  const counts = new Map<number, number>(pos.map((p) => [p, 0]));
  const build = () => {
    let s = "";
    for (let i = 0; i < text.length; i++) s += TATWEEL.repeat(counts.get(i) ?? 0) + text[i];
    return s;
  };
  // التطويل يتوزّع بالتناوب بين المواضع — الأقل تطويلًا أولًا
  let best = text;
  for (let guard = 0; guard < 200; guard++) {
    const p = pos.reduce((m, x) => ((counts.get(x) ?? 0) < (counts.get(m) ?? 0) ? x : m), pos[pos.length - 1]);
    counts.set(p, (counts.get(p) ?? 0) + 1);
    const s = build();
    if (measure(s) > target + 0.5) break;
    best = s;
  }
  return best;
}
