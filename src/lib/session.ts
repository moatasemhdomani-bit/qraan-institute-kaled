import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { RoleId } from "./ui";
import type { TrackId } from "./track";
import { prisma } from "./db";

const COOKIE_NAME = "khs_session";
/** مدة الجلسة: شهران من تسجيل الدخول — يبقى المستخدم داخلًا طوالها ما لم يسجّل خروجه. */
const SESSION_DAYS = 60;
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

/** ما يُحفظ في ملف الجلسة: المستخدم والحساب النشط (الدور والنوع). */
export type SessionPayload = {
  userId: string;
  role: RoleId;
  name: string;
  track?: TrackId;
};

/**
 * حساب الموظف: دور ونوع، والأفواج التي له فيها هذا الدور. الموظف قد يأخذ أدوارًا مختلفة باختلاف الأفواج،
 * والأفواج ذات الدور والنوع نفسيهما تجتمع في حساب واحد — يتنقّل بين حساباته أعلى الشاشة.
 */
export type StaffAccount = { role: RoleId; track: TrackId; cohortIds: string[]; cohortNames: string[] };

/** الجلسة كما تصل إلى الصفحات: الحساب النشط وأفواجه، وكل حسابات الموظف. */
export type Session = SessionPayload & { track: TrackId; cohortIds: string[]; accounts: StaffAccount[] };

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
}

/** يجمع أدوار الموظف في الأفواج إلى حسابات (دور + نوع)، بترتيب الأفواج. */
export function groupAccounts(assignments: { role: string; track: string; cohortId: string; cohort: { name: string } }[]): StaffAccount[] {
  const accounts: StaffAccount[] = [];
  for (const a of [...assignments].sort((x, y) => x.cohort.name.localeCompare(y.cohort.name, "ar"))) {
    const acc = accounts.find((x) => x.role === a.role && x.track === a.track);
    if (acc) {
      acc.cohortIds.push(a.cohortId);
      acc.cohortNames.push(a.cohort.name);
    } else {
      accounts.push({ role: a.role as RoleId, track: a.track as TrackId, cohortIds: [a.cohortId], cohortNames: [a.cohort.name] });
    }
  }
  return accounts;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  let payload: SessionPayload;
  try {
    payload = (await jwtVerify(token, secret)).payload as unknown as SessionPayload;
  } catch {
    return null;
  }
  // حساب حُذف بعد دخوله: تسقط جلسته فورًا بدل أن تبقى صالحة حتى انتهاء مدتها — وكذلك الموظف المعلَّق
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      deletedAt: true,
      suspendedAt: true,
      assignments: { select: { role: true, track: true, cohortId: true, cohort: { select: { name: true } } } },
    },
  });
  if (!user || user.deletedAt || user.suspendedAt) return null;

  if (payload.role === "GUARDIAN") return { ...payload, track: "QURAN", cohortIds: [], accounts: [] };

  // الحساب النشط من أدوار الموظف الحالية — إن تغيّرت أدواره بعد دخوله يُختار أقرب حساب له
  const accounts = groupAccounts(user.assignments);
  if (accounts.length === 0) return null;
  const active =
    accounts.find((a) => a.role === payload.role && (!payload.track || a.track === payload.track)) ??
    accounts.find((a) => a.role === payload.role) ??
    accounts[0];
  return { userId: payload.userId, name: payload.name, role: active.role, track: active.track, cohortIds: active.cohortIds, accounts };
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
