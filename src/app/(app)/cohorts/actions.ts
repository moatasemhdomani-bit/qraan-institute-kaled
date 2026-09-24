"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export type FormState = { error?: string; ok?: boolean };

async function assertStaff() {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    throw new Error("غير مصرَّح لك بهذا الإجراء.");
  }
  return session;
}

export async function updateCohortTiming(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }
  const id = String(formData.get("id") || "");
  const time1Start = String(formData.get("time1Start") || "") || null;
  const time1End = String(formData.get("time1End") || "") || null;
  const time2Start = String(formData.get("time2Start") || "") || null;
  const time2End = String(formData.get("time2End") || "") || null;
  const rotationStart = String(formData.get("rotationStart") || "") || null;

  const cohort = await prisma.cohort.update({ where: { id }, data: { time1Start, time1End, time2Start, time2End, rotationStart } });
  await logAction(session.userId, `عدّل توقيت الفوج «${cohort.name}»`);
  revalidatePath("/cohorts");
  return { ok: true };
}

export async function addTeacherToCohort(cohortId: string, userId: string) {
  const session = await assertStaff();
  await prisma.cohortTeacher.upsert({
    where: { cohortId_userId: { cohortId, userId } },
    update: {},
    create: { cohortId, userId },
  });
  const [cohort, user] = await Promise.all([
    prisma.cohort.findUnique({ where: { id: cohortId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  await logAction(session.userId, `أسند المدرّس «${user?.name ?? ""}» إلى الفوج «${cohort?.name ?? ""}»`);
  revalidatePath("/cohorts");
}

export async function removeTeacherFromCohort(cohortId: string, userId: string) {
  const session = await assertStaff();
  const [cohort, user] = await Promise.all([
    prisma.cohort.findUnique({ where: { id: cohortId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  await prisma.cohortTeacher.delete({ where: { cohortId_userId: { cohortId, userId } } }).catch(() => {});
  await logAction(session.userId, `أزال إسناد المدرّس «${user?.name ?? ""}» عن الفوج «${cohort?.name ?? ""}»`);
  revalidatePath("/cohorts");
}

export async function createCohort(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const name = String(formData.get("name") || "").trim();
  const isRotating = formData.get("isRotating") === "1";
  if (!name) return { error: "اكتبوا اسم الفوج." };

  const duplicate = await prisma.cohort.findUnique({ where: { name } });
  if (duplicate) return { error: "يوجد بالفعل فوج بهذا الاسم." };

  await prisma.cohort.create({ data: { id: `cohort-${randomUUID()}`, name, isRotating } });
  await logAction(session.userId, `أضاف الفوج «${name}» (${isRotating ? "قلّاب" : "ثابت"})`);
  revalidatePath("/cohorts");
  revalidatePath("/halaqat");
  revalidatePath("/students");
  return { ok: true };
}

export async function deleteCohort(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const id = String(formData.get("id") || "");
  const cohort = await prisma.cohort.findUnique({ where: { id }, include: { _count: { select: { halaqat: true } } } });
  if (!cohort) return { error: "الفوج غير موجود." };
  // الحلقات تحمل طلابها وحضورهم وتسميعهم — لا يُحذف فوج فيه حلقات، بل تُنقل أو تُحذف أولًا.
  if (cohort._count.halaqat > 0) {
    return { error: `لا يمكن حذف الفوج «${cohort.name}» لأن فيه ${cohort._count.halaqat} حلقة — انقلوا حلقاته إلى فوج آخر أولًا.` };
  }

  await prisma.cohort.delete({ where: { id } });
  await logAction(session.userId, `حذف الفوج «${cohort.name}»`);
  revalidatePath("/cohorts");
  revalidatePath("/halaqat");
  revalidatePath("/students");
  return { ok: true };
}
