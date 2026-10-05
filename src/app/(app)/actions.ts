"use server";

import { destroySession, getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { RoleId } from "@/lib/ui";
import type { TrackId } from "@/lib/track";

/** التنقّل بين حسابات الموظف (أدواره في الأفواج) — يُحفظ آخر حساب ليدخل عليه في المرة القادمة. */
export async function switchAccount(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = String(formData.get("role") || "") as RoleId;
  const track = String(formData.get("track") || "") as TrackId;
  const acc = session.accounts.find((a) => a.role === role && a.track === track);
  if (acc) {
    await prisma.user.update({ where: { id: session.userId }, data: { role: acc.role, track: acc.track } });
    await createSession({ userId: session.userId, role: acc.role, name: session.name, track: acc.track });
  }
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
