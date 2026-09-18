import { passThreshold } from "./exam";

/** ناجح/راسب — حدّ النجاح ثابت: 90 حاضرًا (تلاوة) أو 80 غيبًا (حفظ)، بحسب مسار ترشيحه. null ما دامت العلامة لم تُدخل بعد. */
export function awqafPassed(score: number | null | undefined, nominationPresent: boolean): boolean | null {
  if (score == null) return null;
  return score >= (passThreshold("WAQF_NOMINATION", null, nominationPresent) ?? 100);
}

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
