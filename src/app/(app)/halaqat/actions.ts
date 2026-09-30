"use server";

import { prisma, rawPrisma } from "@/lib/db";
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
  const track = String(formData.get("track") || "QURAN") === "ARABIC" ? ("ARABIC" as const) : ("QURAN" as const);

  if (!name) return { error: "اكتبوا اسم الحلقة." };
  if (!teacherId) return { error: "اختاروا المدرس المسؤول." };
  if (!cohortId) return { error: "اختاروا الفوج." };

  // عند التعديل: لا نرفض حفظًا لم يُغيّر الاسم أو تكليف المدرس/الفوج، حتى لو كانت هذه الحلقة
  // تشارك حلقة أخرى موجودة مسبقًا بنفس الاسم أو نفس تكليف المدرس (بيانات قديمة سابقة لهذه القاعدة) —
  // الفحص يمنع فقط إدخال تعارض جديد، لا يقفل تعديل حلقة متعارضة أصلاً.
  // العميل الخام: مقارنة الاسم المخزَّن نفسه (العرض العادي يُلحق به نوع الحلقة)
  const current = id ? await rawPrisma.halqa.findUnique({ where: { id }, include: { _count: { select: { students: true } } } }) : null;

  // المدرّس من نوع الحلقة نفسه، ونوع حلقة فيها طلاب لا يتغيّر (طلابها من نوعها)
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { track: true } });
  if (!teacher || teacher.track !== track) {
    return { error: track === "ARABIC" ? "حلقة القراءة العربية يدرّسها مدرس قراءة عربية فقط." : "حلقة القرآن يدرّسها مدرس قرآن فقط." };
  }
  if (current && current.track !== track && current._count.students > 0) {
    return { error: "لا يتغيّر نوع حلقة فيها طلاب — انقلوا طلابها أولًا." };
  }

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
    await prisma.halqa.update({ where: { id }, data: { name, teacherId, cohortId, track } });
    await logAction(session.userId, `عدّل الحلقة «${name}»`);
  } else {
    await prisma.halqa.create({ data: { name, teacherId, cohortId, track } });
    await logAction(session.userId, `أنشأ الحلقة «${name}»`);
  }

  revalidatePath("/halaqat");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { ok: true };
}

function revalidateHalqaPaths() {
  revalidatePath("/halaqat");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/monitor");
  revalidatePath("/recitation-monitor");
}

/** نقل كل طلاب الحلقة إلى حلقة أخرى — سجلاتهم السابقة تبقى كما هي. */
export async function moveHalqaStudents(fromId: string, toId: string): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (!toId) return { error: "اختاروا الحلقة التي يُنقل إليها الطلاب." };
  if (fromId === toId) return { error: "اختاروا حلقة أخرى غير هذه." };

  const [from, to] = await Promise.all([prisma.halqa.findUnique({ where: { id: fromId } }), prisma.halqa.findUnique({ where: { id: toId } })]);
  if (!from || !to) return { error: "الحلقة غير موجودة." };
  if (from.track !== to.track) return { error: "يُنقل الطلاب إلى حلقة من النوع نفسه فقط (قرآن / قراءة عربية)." };

  const moved = await prisma.student.updateMany({ where: { halqaId: fromId }, data: { halqaId: toId } });
  if (moved.count === 0) return { error: "لا طلاب في هذه الحلقة لنقلهم." };

  await logAction(session.userId, `نقل ${moved.count} طالبًا من حلقة «${from.name}» إلى حلقة «${to.name}»`);
  revalidateHalqaPaths();
  return { ok: true };
}

/**
 * حذف حلقة لا طلاب فيها. سجلات الحضور والتسميع القديمة المسجّلة فيها تنتقل مع كل طالب إلى حلقته الحالية
 * (فلا ينقص تاريخه ولا تقاريره)؛ وسجلات طالب لم يعد مفروزًا على أي حلقة تُحذف لتعذّر نسبتها.
 */
export async function deleteHalqa(id: string): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const halqa = await prisma.halqa.findUnique({ where: { id }, include: { _count: { select: { students: true } } } });
  if (!halqa) return { error: "الحلقة غير موجودة." };
  if (halqa._count.students > 0) {
    return { error: `لا يمكن حذف حلقة فيها ${halqa._count.students} طالبًا — انقلوا طلابها إلى حلقة أخرى أولًا.` };
  }

  const [attendance, recitations] = await Promise.all([
    prisma.attendance.findMany({ where: { halqaId: id }, select: { studentId: true, student: { select: { halqaId: true } } } }),
    prisma.recitation.findMany({ where: { halqaId: id }, select: { studentId: true, student: { select: { halqaId: true } } } }),
  ]);
  const targetOf = new Map<string, string | null>();
  for (const r of [...attendance, ...recitations]) targetOf.set(r.studentId, r.student.halqaId);

  await prisma.$transaction(async (tx) => {
    for (const [studentId, target] of targetOf) {
      if (target) {
        await tx.attendance.updateMany({ where: { halqaId: id, studentId }, data: { halqaId: target } });
        await tx.recitation.updateMany({ where: { halqaId: id, studentId }, data: { halqaId: target } });
      } else {
        await tx.attendance.deleteMany({ where: { halqaId: id, studentId } });
        await tx.recitation.deleteMany({ where: { halqaId: id, studentId } });
      }
    }
    await tx.halqa.delete({ where: { id } });
  });

  await logAction(session.userId, `حذف الحلقة «${halqa.name}»`);
  revalidateHalqaPaths();
  return { ok: true };
}
