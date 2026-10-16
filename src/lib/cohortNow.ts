import { padTime, rotationSlot } from "./daily";

/** أوقات الفوج كما في قاعدة البيانات */
export type CohortClock = {
  id: string;
  isRotating: boolean;
  time1Start: string | null;
  time1End: string | null;
  time2Start: string | null;
  time2End: string | null;
  rotationStart: string | null;
};

/** التاريخ والوقت الآن بتوقيت دمشق: { date: YYYY-MM-DD, time: HH:MM } */
export function damascusNow(d = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Damascus", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** دوام الفوج اليوم — القلّاب بفترة أسبوعه، والثابت بفترته الأولى */
function todayWindow(c: CohortClock, date: string): { start: string; end: string } | null {
  const slot = c.isRotating ? rotationSlot(c, date) : null;
  const start = slot ? slot.start : c.time1Start;
  const end = slot ? slot.end : c.time1End;
  return start && end ? { start: padTime(start), end: padTime(end) } : null;
}

/**
 * الفوج الذي يُفتح تلقائيًا: الجاري الآن (بدأ دوامه ولم ينتهِ)، وإلا آخر فوج بدأ دوامه قبل الآن —
 * null إن لم يبدأ أي فوج بعد أو لم تُضبط أوقاتها.
 */
export function currentCohortId(cohorts: CohortClock[], now = damascusNow()): string | null {
  const started = cohorts
    .map((c) => ({ id: c.id, w: todayWindow(c, now.date) }))
    .filter((x): x is { id: string; w: { start: string; end: string } } => !!x.w && x.w.start <= now.time);
  const running = started.find((x) => now.time <= x.w.end);
  if (running) return running.id;
  started.sort((a, b) => b.w.start.localeCompare(a.w.start));
  return started[0]?.id ?? null;
}

/** الحلقة الافتراضية: حلقة الفوج الجاري (أو الذي بدأ آخرًا)، وإلا الأولى */
export function defaultHalqa<T extends { cohort: CohortClock }>(halaqat: T[]): T | null {
  if (halaqat.length <= 1) return halaqat[0] ?? null;
  const cohorts = [...new Map(halaqat.map((h) => [h.cohort.id, h.cohort])).values()];
  const id = currentCohortId(cohorts);
  return halaqat.find((h) => h.cohort.id === id) ?? halaqat[0];
}
