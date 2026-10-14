import { formatTime12, padTime } from "./daily";

/** أوقات دوام الفوج: الثابت فترة واحدة، والقلّاب فترتان (يتناوبهما أسبوعًا بأسبوع). */
export type CohortTimes = { isRotating: boolean; time1Start: string | null; time1End: string | null; time2Start: string | null; time2End: string | null };

export function cohortWindows(c: CohortTimes | null | undefined): { start: string; end: string }[] {
  if (!c) return [];
  const out: { start: string; end: string }[] = [];
  if (c.time1Start && c.time1End) out.push({ start: padTime(c.time1Start), end: padTime(c.time1End) });
  if (c.isRotating && c.time2Start && c.time2End) out.push({ start: padTime(c.time2Start), end: padTime(c.time2End) });
  return out;
}

/** الوقت (HH:MM) ضمن دوام الفوج — بلا أوقات مضبوطة للفوج لا قيد */
export function withinCohort(time: string, windows: { start: string; end: string }[]): boolean {
  if (windows.length === 0) return true;
  const t = padTime(time);
  return windows.some((w) => t >= w.start && t <= w.end);
}

/** صباحي أو مسائي تلقائيًا: مسائي إن كان دوام الفوج كله مساءً، وإلا صباحي */
export function cohortDefaultPm(windows: { start: string; end: string }[]): boolean {
  return windows.length > 0 && windows.every((w) => Number(w.start.slice(0, 2)) >= 12);
}

/** «دوام الفوج: 8:00 صباحاً — 12:00 مساءً» (وللقلّاب الفترتان) */
export function cohortWindowsLabel(windows: { start: string; end: string }[]): string {
  return windows.map((w) => `${formatTime12(w.start)} — ${formatTime12(w.end)}`).join(" أو ");
}
