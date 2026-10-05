import { toWesternDigits } from "./numbers";

/** خيارات القوائم المنسدلة في نموذج الموظف. */
export const MARITAL_OPTIONS = ["متزوج", "أعزب", "مطلق"];
export const EDUCATION_OPTIONS = ["ابتدائي", "إعدادي", "ثانوي", "جامعي", "فوق ذلك"];
export const QURAN_LEVEL_OPTIONS = ["30 تلاوة", "5 غيبًا", "10 غيبًا", "15 غيبًا", "20 غيبًا", "25 غيبًا", "30 غيبًا", "فوق ذلك"];

/** الرقم الوطني: أرقام فقط، ويُحفظ نصًّا كي لا تضيع الأصفار على يساره. */
export function cleanNationalId(raw: string): string {
  return toWesternDigits(raw).replace(/\D/g, "");
}

/** أنواع الموظفين (الدور مع النوع) كما تُختار لكل فوج — والمعرّف «kind» المحفوظ في النموذج. */
export const STAFF_KIND_ROLES: Record<string, { role: "DIRECTOR" | "ADMIN" | "TEACHER" | "EXAMINER" | "EXAM_SUPERVISOR"; track: "ARABIC" | "AMMA" | "QURAN" }> = {
  DIRECTOR: { role: "DIRECTOR", track: "QURAN" },
  ADMIN: { role: "ADMIN", track: "QURAN" },
  TEACHER_AR: { role: "TEACHER", track: "ARABIC" },
  TEACHER_AMMA: { role: "TEACHER", track: "AMMA" },
  TEACHER: { role: "TEACHER", track: "QURAN" },
  EXAMINER: { role: "EXAMINER", track: "QURAN" },
  EXAMINER_AR: { role: "EXAMINER", track: "ARABIC" },
  EXAM_SUPERVISOR: { role: "EXAM_SUPERVISOR", track: "QURAN" },
};

/** معرّف النوع من الدور والنوع المحفوظين. */
export function staffKindOf(role: string, track: string): string {
  if (role === "TEACHER") return track === "ARABIC" ? "TEACHER_AR" : track === "AMMA" ? "TEACHER_AMMA" : "TEACHER";
  if (role === "EXAMINER") return track === "ARABIC" ? "EXAMINER_AR" : "EXAMINER";
  return role;
}
