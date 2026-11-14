/** المالية: صندوق المعهد بالليرة السورية. */

/** «150,000 ل.س» */
export const formatSyp = (n: number) => `${n.toLocaleString("en-US")} ل.س`;

/** أسباب جاهزة تملأ حقل السبب بنقرة — ويمكن تعديله أو كتابة غيره */
export const FINANCE_REASONS: Record<"DEPOSIT" | "WITHDRAW", string[]> = {
  DEPOSIT: ["رسوم تسجيل طالب", "بيع كتب", "تبرع"],
  WITHDRAW: ["شراء كتب", "شراء هدايا", "مكافآت الطلاب"],
};
