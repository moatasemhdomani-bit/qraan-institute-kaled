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
export type ResultCell = { won: boolean; opponentNo: number | null; qualified: boolean };

export type EntryState = { level: number; wins: number; losses: number; status: EntryStatus; cells: ResultCell[] };

/** مستوى المشارك وحالته من نتائجه بالترتيب */
export function entryState(results: { won: boolean; opponentNo: number | null }[], levels: number): EntryState {
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
    cells.push({ won: r.won, opponentNo: r.opponentNo, qualified });
  }
  return { level, wins, losses, status, cells };
}

export const STATUS_LABELS: Record<EntryStatus, string> = { ACTIVE: "مستمر", OUT: "خرج", WON: "فاز بالمسابقة" };
