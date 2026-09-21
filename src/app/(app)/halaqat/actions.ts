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

  // عند التعديل: لا نرفض حفظًا لم يُغيّر الاسم أو تكليف المدرس/الفوج، حتى لو كانت هذه الحلقة
  // تشارك حلقة أخرى موجودة مسبقًا بنفس الاسم أو نفس تكليف المدرس (بيانات قديمة سابقة لهذه القاعدة) —
  // الفحص يمنع فقط إدخال تعارض جديد، لا يقفل تعديل حلقة متعارضة أصلاً.
  const current = id ? await prisma.halqa.findUnique({ where: { id } }) : null;

  if (!current || current.name !== name) {
    const duplicateName = await prisma.halqa.findFirst({
      where: { name, NOT: id ? { id } : undefined },
    });
    if (duplicateName) return { error: "يوجد بالفعل حلقة بهذا الاسم." };
  }

  // المدرس يمكن أن يدرّس في أكثر من فوج، لكن حلقة واحدة فقط ضمن كل فوج.
  if (!current || current.teacherId !== teacherId || current.cohortId !== cohortId) {
    const teacherBusyInCohort = await prisma.halqa.findFirst({
      where: { teacherId, cohortId, NOT: id ? { id } : undefined },
    });
    if (teacherBusyInCohort) {
      return { error: `هذا المدرس يدرّس بالفعل حلقة «${teacherBusyInCohort.name}» في هذا الفوج — لا يمكنه حلقتين ضمن الفوج نفسه.` };
    }
  }

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
