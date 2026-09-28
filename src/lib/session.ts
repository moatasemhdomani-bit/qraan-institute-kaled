import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { RoleId } from "./ui";
import { prisma } from "./db";

const COOKIE_NAME = "khs_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");

export type SessionPayload = {
  userId: string;
  role: RoleId;
  name: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  let payload: SessionPayload;
  try {
    payload = (await jwtVerify(token, secret)).payload as unknown as SessionPayload;
  } catch {
    return null;
  }
  // حساب حُذف بعد دخوله: تسقط جلسته فورًا بدل أن تبقى صالحة حتى انتهاء مدتها
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { deletedAt: true } });
  if (!user || user.deletedAt) return null;
  return payload;
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
