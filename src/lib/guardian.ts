import crypto from "crypto";
import { prisma } from "./db";
import { hashPassword } from "./password";

/**
 * حساب ولي الأمر:
 *  - اسم المستخدم = رقم الطالب
 *  - يُنشأ تلقائيًا عند تسجيل الطالب
 *  - كلمة المرور يولّدها النظام، وتُخزَّن مشفَّرة (قابلة للاسترجاع) لتظهر للإداريين
 *    في ملف الطالب — بخلاف حسابات العاملين التي تُخزَّن بتجزئة أحادية الاتجاه.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // بلا حروف/أرقام متشابهة

export function generatePassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function key(): Buffer {
  return crypto.createHash("sha256").update(process.env.SESSION_SECRET || "dev-secret-change-me").digest();
}

export function encryptPassword(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptPassword(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const parts = stored.split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, enc] = parts.map((p) => Buffer.from(p, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** يُنشئ حساب ولي الأمر لطالب جديد ويعيد كلمة المرور الظاهرة. */
export async function createGuardianAccount(studentNo: number, studentName: string) {
  const password = generatePassword();
  const user = await prisma.user.create({
    data: {
      name: `ولي أمر ${studentName}`,
      username: String(studentNo),
      passwordHash: await hashPassword(password),
      passwordEnc: encryptPassword(password),
      role: "GUARDIAN",
    },
  });
  return { user, password };
}

/** يولّد كلمة مرور جديدة لحساب ولي أمر قائم (إن فُقدت السابقة). */
export async function regenerateGuardianPassword(guardianUserId: string) {
  return setUserPassword(guardianUserId);
}

/** يولّد كلمة مرور جديدة لأي مستخدم (موظف أو ولي أمر) ويعيدها ظاهرة. */
export async function setUserPassword(userId: string, password: string = generatePassword()) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      passwordEnc: encryptPassword(password),
    },
  });
  return password;
}

/**
 * إخوة الطالب = الطلاب الذين يحملون رقم ولي الأمر نفسه.
 * الأرقام موحَّدة الصيغة عند الحفظ، فالمطابقة النصية كافية.
 */
export async function siblingsOf(student: { id: string; guardianPhone: string | null }) {
  if (!student.guardianPhone) return [];
  return prisma.student.findMany({
    where: { guardianPhone: student.guardianPhone },
    orderBy: { studentNo: "asc" },
    select: { id: true, studentNo: true, name: true },
  });
}
