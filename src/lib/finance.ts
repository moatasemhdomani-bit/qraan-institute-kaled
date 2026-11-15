/** المالية: صندوق المعهد بعملتين — الليرة السورية الجديدة والدولار، لكل منهما رصيدها. */

export type Currency = "SYP" | "USD";
export const CURRENCIES: Currency[] = ["SYP", "USD"];
export const CURRENCY_LABEL: Record<Currency, string> = { SYP: "ليرة سورية جديدة", USD: "دولار" };
export const CURRENCY_SIGN: Record<Currency, string> = { SYP: "ل.س.ج", USD: "$" };

/** الرقم بفاصلة كل 3 أرقام: «150,000» */
export const groupDigits = (n: number | string) => {
  const v = typeof n === "number" ? n : Number(String(n).replace(/[^\d]/g, "") || 0);
  return v.toLocaleString("en-US");
};

/** «150,000 ل.س.ج» / «150 $» */
export const formatMoney = (n: number, c: Currency = "SYP") => `${groupDigits(n)} ${CURRENCY_SIGN[c]}`;
export const formatSyp = (n: number) => formatMoney(n, "SYP");

/** أسباب جاهزة تملأ حقل السبب بنقرة — ويمكن تعديله أو كتابة غيره */
export const FINANCE_REASONS: Record<"DEPOSIT" | "WITHDRAW", string[]> = {
  DEPOSIT: ["رسوم تسجيل طالب", "بيع كتب", "تبرع"],
  WITHDRAW: ["شراء كتب", "شراء هدايا", "مكافآت الطلاب"],
};
