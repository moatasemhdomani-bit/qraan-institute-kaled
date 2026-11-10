import { passThreshold } from "./exam";
import { SUNNAH_PASS_MARK } from "./sunnah";

/** نتيجة سبر الأوقاف الفعلي: ناجح (بعلامة)، أو إعادة، أو لم يحضر — null بانتظار النتيجة */
export type AwqafOutcome = "PASS" | "REPEAT" | "ABSENT";

type AwqafResultShape = { score: number | null | undefined; nominationPresent: boolean; outcome?: string | null; sunnahSection?: string | null };

/** حدّ النجاح: السنة النبوية 80، والقرآن 90 حاضرًا (تلاوة) أو 80 غيبًا (حفظ) بحسب مسار ترشيحه */
export function awqafPassMark(r: { nominationPresent: boolean; sunnahSection?: string | null }): number {
  if (r.sunnahSection) return SUNNAH_PASS_MARK;
  return passThreshold("WAQF_NOMINATION", null, r.nominationPresent) ?? 100;
}

/** ناجح (true) / إعادة (false) — null بانتظار النتيجة أو لم يحضر */
export function awqafPassed(r: AwqafResultShape): boolean | null {
  if (r.outcome === "PASS") return true;
  if (r.outcome === "REPEAT") return false;
  if (r.outcome === "ABSENT") return null;
  // سجلات قديمة بلا نتيجة: بالعلامة وحدها
  if (r.score == null) return null;
  return r.score >= awqafPassMark(r);
}

/** نص النتيجة للعرض: «92 / 100» أو «إعادة» أو «لم يحضر» أو «بانتظار النتيجة» */
export function awqafResultLabel(r: AwqafResultShape): string {
  if (r.outcome === "ABSENT") return "لم يحضر";
  if (r.outcome === "REPEAT") return r.score != null ? `${r.score} / 100 — إعادة` : "إعادة";
  if (r.score != null) return `${r.score} / 100`;
  return "بانتظار النتيجة";
}

/** سُجّلت نتيجته (ناجح أو إعادة أو لم يحضر) */
export const awqafDecided = (r: AwqafResultShape) => r.outcome != null || r.score != null;

export type CertStep = "arrived" | "archived" | "delivered";

/** كل خطوة مقفلة حتى تتحقق سابقتها — الأرشفة تحتاج وصولاً أولاً، والتسليم يحتاج أرشفة أولاً. */
export function certStepLocked(
  step: CertStep,
  result: { certArrived: boolean; certArchived: boolean }
): boolean {
  if (step === "archived") return !result.certArrived;
  if (step === "delivered") return !result.certArchived;
  return false;
}

export function certCycleLabel(result: { certArrived: boolean; certArchived: boolean; certDelivered: boolean }): string {
  if (result.certDelivered) return "سُلّمت الشهادة";
  if (result.certArchived) return "أُرشفت — بانتظار التسليم";
  if (result.certArrived) return "وصلت — بانتظار الأرشفة";
  return "بانتظار وصول الشهادة";
}
