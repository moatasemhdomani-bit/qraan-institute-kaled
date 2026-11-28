/**
 * قوانين المسابقات (مسؤول النشاط):
 * - 3 انتصارات في المستوى ← ينتقل إلى المستوى التالي (ومن يكمل آخر مستوى يفوز بالمسابقة)
 * - 3 خسارات في المستوى نفسه ← يخرج من المسابقة
 * - يشارك الطالب مرتين على الأكثر في المسابقة الواحدة، وكل مشاركة تبدأ من المستوى الأول وتُخصم نجومها
 */
export const WINS_TO_ADVANCE = 3;
export const LOSSES_TO_EXIT = 3;
export const MAX_ATTEMPTS = 2;

export type EntryStatus = "ACTIVE" | "OUT" | "WON";

/** خانة في سطر الطالب كما في ورقة الدوري: «ف 4» / «خ 12»، و«تأهل» بعد الانتقال إلى مستوى */
export type ResultCell = { won: boolean; opponentNo: number | null; opponents?: string | null; qualified: boolean; points?: number | null };

/** played/points: مسابقة الطالب الواحد — مبارياته ومجموع نقاطه في مستواه الحالي */
export type EntryState = { level: number; wins: number; losses: number; status: EntryStatus; cells: ResultCell[]; played?: number; points?: number };

/** مسابقة الطالب الواحد: عدد مباريات المستوى ونقاط التأهل */
export type SoloRules = { matches: number; qualify: number };

export const soloRules = (c: { matchSize: number; soloMatches: number | null; soloQualify: number | null }): SoloRules | null =>
  c.matchSize === 1 && c.soloMatches && c.soloQualify != null ? { matches: c.soloMatches, qualify: c.soloQualify } : null;

/**
 * مسابقة الطالب الواحد: يلعب مباريات المستوى كلها، فإن بلغ مجموع نقاطه حدّ التأهل انتقل إلى التالي
 * (ومن يتأهل من آخر مستوى يفوز بالمسابقة)، وإلا خرج منها.
 */
function soloState(results: { points?: number | null }[], levels: number, rules: SoloRules): EntryState {
  let level = 1;
  let played = 0;
  let points = 0;
  let status: EntryStatus = "ACTIVE";
  const cells: ResultCell[] = [];
  for (const r of results) {
    if (status !== "ACTIVE") break;
    played++;
    points += r.points ?? 0;
    let qualified = false;
    if (played >= rules.matches) {
      if (points >= rules.qualify) {
        qualified = true;
        if (level >= levels) status = "WON";
        else {
          level++;
          played = 0;
          points = 0;
        }
      } else status = "OUT";
    }
    cells.push({ won: true, opponentNo: null, opponents: null, qualified, points: r.points ?? 0 });
  }
  return { level, wins: 0, losses: 0, status, cells, played, points };
}

/** مستوى المشارك وحالته من نتائجه بالترتيب */
export function entryState(
  results: { won: boolean; opponentNo: number | null; opponents?: string | null; points?: number | null }[],
  levels: number,
  solo?: SoloRules | null
): EntryState {
  if (solo) return soloState(results, levels, solo);
  let level = 1;
  let wins = 0;
  let losses = 0;
  let status: EntryStatus = "ACTIVE";
  const cells: ResultCell[] = [];
  for (const r of results) {
    if (status !== "ACTIVE") break;
    let qualified = false;
    if (r.won) {
      wins++;
      if (wins >= WINS_TO_ADVANCE) {
        qualified = true;
        if (level >= levels) status = "WON";
        else {
          level++;
          wins = 0;
          losses = 0;
        }
      }
    } else {
      losses++;
      if (losses >= LOSSES_TO_EXIT) status = "OUT";
    }
    cells.push({ won: r.won, opponentNo: r.opponentNo, opponents: r.opponents ?? null, qualified });
  }
  return { level, wins, losses, status, cells };
}

export const STATUS_LABELS: Record<EntryStatus, string> = { ACTIVE: "مستمر", OUT: "خرج", WON: "فاز بالمسابقة" };
