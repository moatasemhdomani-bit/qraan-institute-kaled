"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { dayLockReason, isValidDate, GRADES, formatDateAr } from "@/lib/daily";
import { validateEntry, type RecEntry } from "@/lib/recitation";
import { revalidatePath } from "next/cache";

export type SaveResult = { error?: string; ok?: boolean };

export type StudentRecitationInput = {
  halqaId: string;
  date: string;
  studentId: string;
  none: boolean;
  noNew: boolean;
  noPast: boolean;
  nf: string;
  nt: string;
  rf: string;
  rt: string;
  gradeNew: string;
  gradePast: string;
};

const page = (v: string): number | null => {
  const raw = v.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
};

/** حفظ تسميع طالب واحد ليوم واحد — يُستدعى من زر «حفظ» في بطاقة الطالب. */
export async function saveStudentRecitation(input: StudentRecitationInput): Promise<SaveResult> {
  const session = await getSession();
  if (!session || (session.role !== "TEACHER" && session.role !== "DIRECTOR")) {
    return { error: "تسجيل التسميع من صلاحية المدرّس أو مدير المعهد." };
  }

  const { halqaId, date, studentId } = input;
  if (!isValidDate(date)) return { error: "التاريخ غير صحيح." };

  const locked = await dayLockReason(date);
  if (locked) return { error: `${locked} — لا يُسجَّل تسميع في يوم لا دوام فيه.` };

  const halqa = await prisma.halqa.findUnique({ where: { id: halqaId } });
  if (!halqa) return { error: "الحلقة غير موجودة." };
  if (session.role === "TEACHER" && halqa.teacherId !== session.userId) {
    return { error: "هذه ليست حلقتك." };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { name: true, halqaId: true } });
  if (!student || student.halqaId !== halqaId) return { error: "الطالب ليس في هذه الحلقة." };

  const prior = await prisma.recitation.aggregate({
    where: { studentId, date: { lt: date }, none: false, noNew: false },
    _max: { newTo: true },
  });

  const e: RecEntry = {
    studentId,
    none: input.none,
    noNew: input.noNew,
    noPast: input.noPast,
    newFrom: page(input.nf),
    newTo: page(input.nt),
    pastFrom: page(input.rf),
    pastTo: page(input.rt),
    gradeNew: input.gradeNew || null,
    gradePast: input.gradePast || null,
  };

  if (e.gradeNew && !GRADES.includes(e.gradeNew as never)) return { error: "تقدير غير معروف." };
  if (e.gradePast && !GRADES.includes(e.gradePast as never)) return { error: "تقدير غير معروف." };
  const bad = validateEntry(e, prior._max.newTo);
  if (bad) return { error: bad };

  const data = {
    none: e.none,
    noNew: e.none ? false : e.noNew,
    noPast: e.none ? false : e.noPast,
    newFrom: e.none || e.noNew ? null : e.newFrom,
    newTo: e.none || e.noNew ? null : e.newTo,
    pastFrom: e.none || e.noPast ? null : e.pastFrom,
    pastTo: e.none || e.noPast ? null : e.pastTo,
    gradeNew: e.none || e.noNew ? null : e.gradeNew,
    gradePast: e.none || e.noPast ? null : e.gradePast,
    halqaId,
    recordedById: session.userId,
  };

  const existing = await prisma.recitation.findUnique({ where: { studentId_date: { studentId, date } } });
  await prisma.recitation.upsert({
    where: { studentId_date: { studentId, date } },
    update: data,
    create: { ...data, studentId, date },
  });

  await logAction(
    session.userId,
    `${existing ? "عدّل" : "سجّل"} تسميع ${student.name} (حلقة ${halqa.name}) ليوم ${formatDateAr(date)}`
  );

  revalidatePath("/recitation");
  revalidatePath("/recitation-monitor");
  return { ok: true };
}
