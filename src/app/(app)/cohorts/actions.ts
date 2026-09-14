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

export async function updateCohortTiming(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }
  const id = String(formData.get("id") || "");
  const time1 = String(formData.get("time1") || "") || null;
  const time2 = String(formData.get("time2") || "") || null;

  const cohort = await prisma.cohort.update({ where: { id }, data: { time1, time2 } });
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
