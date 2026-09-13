"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: boolean };

async function assertStaff() {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    throw new Error("غير مصرَّح لك بهذا الإجراء.");
  }
  return session;
}

export async function toggleWorkingDay(day: string, on: boolean) {
  const session = await assertStaff();
  const row = await prisma.workingDays.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, days: "[]" },
  });
  const days: string[] = JSON.parse(row.days || "[]");
  const next = on ? Array.from(new Set([...days, day])) : days.filter((d) => d !== day);
  await prisma.workingDays.update({ where: { id: 1 }, data: { days: JSON.stringify(next) } });
  await logAction(session.userId, `${on ? "أضاف" : "أزال"} «${day}» من أيام الدوام الرسمية`);
  revalidatePath("/schedule");
}

export async function addHoliday(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }
  const name = String(formData.get("name") || "").trim();
  const date = String(formData.get("date") || "").trim();
  if (!name) return { error: "اكتبوا اسم العطلة أولًا." };

  await prisma.holiday.create({ data: { name, date: date || "—" } });
  await logAction(session.userId, `أضاف عطلة «${name}» بتاريخ ${date || "—"}`);
  revalidatePath("/schedule");
  return { ok: true };
}

export async function deleteHoliday(id: string) {
  const session = await assertStaff();
  const h = await prisma.holiday.findUnique({ where: { id } });
  await prisma.holiday.delete({ where: { id } }).catch(() => {});
  if (h) await logAction(session.userId, `حذف العطلة «${h.name}»`);
  revalidatePath("/schedule");
}
