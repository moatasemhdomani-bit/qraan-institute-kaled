/**
 * زخرفة الأقواس أسفل صفحات التقارير — مرسومة متجهيًا (SVG) بذهبي هوية المعهد، لا صورة.
 * الوحدة: قوس صغير بخطين، ثم قوس كبير بأربعة خطوط، ثم قوس صغير بخطين؛ تتكرّر 9 مرات على عرض 1600×77.
 */
const GOLD = "#d4af37";
const W = 1600;
const H = 77;
const UNIT = W / 9;
const STROKE = 2.4;
const GAP = 4.2;

/** قوس مدبَّب (جانبان قائمان ثم كتفان منحنيان ثم خطّان إلى الرأس) — مفتوح من الأسفل. */
function arch(cx: number, hw: number, top: number): string {
  const f = (n: number) => n.toFixed(2);
  const sideTop = top + hw * 1.0;
  const shoulderX = hw * 0.45;
  const shoulderY = top + hw * 0.3;
  // نقطة التحكّم على امتداد خط الرأس حتى الجانب — فينساب الكتف إلى الخط المائل بلا انكسار
  const ctrlY = top + (shoulderY - top) * (hw / shoulderX);
  return [
    `M${f(cx - hw)},${H + 2}`,
    `L${f(cx - hw)},${f(sideTop)}`,
    `Q${f(cx - hw)},${f(ctrlY)} ${f(cx - shoulderX)},${f(shoulderY)}`,
    `L${f(cx)},${f(top)}`,
    `L${f(cx + shoulderX)},${f(shoulderY)}`,
    `Q${f(cx + hw)},${f(ctrlY)} ${f(cx + hw)},${f(sideTop)}`,
    `L${f(cx + hw)},${H + 2}`,
  ].join(" ");
}

/** أقواس متداخلة: الخارجي أولًا، وكل خط داخلي أضيق وأخفض بمسافة ثابتة. */
function nested(cx: number, hw: number, top: number, lines: number): string[] {
  return Array.from({ length: lines }, (_, i) => arch(cx, hw - i * GAP, top + i * GAP * 1.05));
}

function buildPaths(): string {
  const paths: string[] = [];
  for (let u = 0; u < 9; u++) {
    const x = u * UNIT;
    paths.push(...nested(x + 19, 16.5, 27, 2));
    paths.push(...nested(x + 77, 31, 1.5, 4));
    paths.push(...nested(x + 135, 16.5, 27, 2));
  }
  return paths.map((d) => `<path d="${d}"/>`).join("");
}

const PATHS = buildPaths();

/** SVG الزخرفة بعرض حاويته كاملًا (نسبة 1600×77). */
export function reportFooterSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" style="display:block;width:100%;height:auto;"><g fill="none" stroke="${GOLD}" stroke-width="${STROKE}" stroke-linejoin="miter" stroke-linecap="butt">${PATHS}</g></svg>`;
}

/** نسبة الارتفاع إلى العرض — لحساب الهامش السفلي للصفحة. */
export const REPORT_FOOTER_RATIO = H / W;
