"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { dayLockReason, isValidDate, ATT_STATES, formatDateAr } from "@/lib/daily";
import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@prisma/client";

export type FormState = { error?: string; ok?: boolean; missing?: number };

const VALID = new Set(ATT_STATES.map((a) => a.id));

/**
 * يُرفع حضور الحلقة دفعة واحدة: لا يُقبل رفع ناقص، ولا تسجيل في يوم مقفل.
 * التعديل بعد الرفع مسموح ويُسجَّل في سجل التدقيق.
 */
export async function uploadAttendance(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "تسجيل الحضور من صلاحية المدرّس." };
  }

  const halqaId = String(formData.get("halqaId") || "");
  const date = String(formData.get("date") || "");
  if (!isValidDate(date)) return { error: "التاريخ غير صحيح." };

  const locked = await dayLockReason(date);
  if (locked) return { error: `${locked} — لا يُسجَّل حضور في يوم لا دوام فيه.` };

  const halqa = await prisma.halqa.findUnique({
    where: { id: halqaId },
    include: { students: { select: { id: true } } },
  });
  if (!halqa) return { error: "الحلقة غير موجودة." };
  if (halqa.teacherId !== session.userId) return { error: "هذه ليست حلقتك." };

  const entries = halqa.students.map((st) => ({
    studentId: st.id,
    status: String(formData.get(`att_${st.id}`) || "") as AttendanceStatus,
  }));

  const missing = entries.filter((e) => !VALID.has(e.status as never));
  if (missing.length) {
    return {
      error: `بقي ${missing.length} طالبًا بلا حالة — لا يمكن الرفع قبل تسجيل الجميع.`,
      missing: missing.length,
    };
  }

  const existing = await prisma.attendance.count({ where: { halqaId, date } });

  await prisma.$transaction(
    entries.map((e) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: e.studentId, date } },
        update: { status: e.status, halqaId, recordedById: session.userId },
        create: { studentId: e.studentId, date, status: e.status, halqaId, recordedById: session.userId },
      })
    )
  );

  await logAction(
    session.userId,
    existing > 0
      ? `عدّل حضور حلقة ${halqa.name} ليوم ${formatDateAr(date)}`
      : `رفع حضور حلقة ${halqa.name} ليوم ${formatDateAr(date)}`
  );

  revalidatePath("/attendance");
  revalidatePath("/monitor");
  return { ok: true };
}
