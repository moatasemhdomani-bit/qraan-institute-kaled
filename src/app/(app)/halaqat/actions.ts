"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: boolean };

export async function saveHalqa(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const id = String(formData.get("id") || "") || null;
  const name = String(formData.get("name") || "").trim();
  const teacherId = String(formData.get("teacherId") || "");
  const cohortId = String(formData.get("cohortId") || "");

  if (!name) return { error: "اكتبوا اسم الحلقة." };
  if (!teacherId) return { error: "اختاروا المدرس المسؤول." };
  if (!cohortId) return { error: "اختاروا الفوج." };

  if (id) {
    await prisma.halqa.update({ where: { id }, data: { name, teacherId, cohortId } });
    await logAction(session.userId, `عدّل الحلقة «${name}»`);
  } else {
    await prisma.halqa.create({ data: { name, teacherId, cohortId } });
    await logAction(session.userId, `أنشأ الحلقة «${name}»`);
  }

  revalidatePath("/halaqat");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { ok: true };
}
