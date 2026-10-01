import { toWesternDigits } from "./numbers";

/** خيارات القوائم المنسدلة في نموذج الموظف. */
export const MARITAL_OPTIONS = ["متزوج", "أعزب", "مطلق"];
export const EDUCATION_OPTIONS = ["ابتدائي", "إعدادي", "ثانوي", "جامعي", "فوق ذلك"];
export const QURAN_LEVEL_OPTIONS = ["30 تلاوة", "5 غيبًا", "10 غيبًا", "15 غيبًا", "20 غيبًا", "25 غيبًا", "30 غيبًا", "فوق ذلك"];

/** الرقم الوطني: أرقام فقط، ويُحفظ نصًّا كي لا تضيع الأصفار على يساره. */
export function cleanNationalId(raw: string): string {
  return toWesternDigits(raw).replace(/\D/g, "");
}
