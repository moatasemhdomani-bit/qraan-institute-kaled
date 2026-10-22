/** توحيد الألف في البحث: أ وإ وآ تُعامَل كلها ألفًا (ا) — فكتابة «ا» أو «أ» تجد الاثنين. */
export const normAr = (s: string) => s.replace(/[أإآ]/g, "ا");

/** هل يحوي النص كلمة البحث، مع توحيد الألف */
export const textHas = (text: string, q: string) => normAr(text).includes(normAr(q));
