"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import type { RoleId } from "@/lib/ui";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "أدخلوا اسم المستخدم وكلمة المرور." };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.deletedAt) return { error: "بيانات الدخول غير صحيحة." };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "بيانات الدخول غير صحيحة." };
  // موظف معلَّق: يُبلَّغ بعد التحقق من كلمة المرور فقط، كي لا تُكشف الحسابات لمن لا يعرف كلمتها
  if (user.suspendedAt) return { error: "هذا الحساب معلَّق — راجعوا إدارة المعهد." };

  // يدخل على آخر حساب استعمله (دوره ونوعه) — وتعرض الصفحات بعدها التنقّل بين حساباته في الأفواج
  await createSession({ userId: user.id, role: user.role as RoleId, name: user.name, track: user.track });
  redirect("/dashboard");
}
