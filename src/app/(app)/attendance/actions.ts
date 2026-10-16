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
  // مدير المعهد يتمتع بخواص كل الموظفين، فيسجّل لأي حلقة؛ والمدرّس لحلقته وحدها
  if (!session || (session.role !== "TEACHER" && session.role !== "DIRECTOR")) {
    return { error: "تسجيل الحضور من صلاحية المدرّس أو مدير المعهد." };
  }

  // «كل الحلقات»: حلقات المدرّس كلها في رفع واحد
  const halqaIds = [...new Set(formData.getAll("halqaId").map(String).filter(Boolean))];
  const date = String(formData.get("date") || "");
  if (!isValidDate(date)) return { error: "التاريخ غير صحيح." };

  const locked = await dayLockReason(date);
  if (locked) return { error: `${locked} — لا يُسجَّل حضور في يوم لا دوام فيه.` };

  if (halqaIds.length === 0) return { error: "الحلقة غير موجودة." };
  const halaqat = await prisma.halqa.findMany({
    where: { id: { in: halqaIds } },
    include: { students: { select: { id: true } } },
  });
  if (halaqat.length !== halqaIds.length) return { error: "الحلقة غير موجودة." };
  if (session.role === "TEACHER" && halaqat.some((h) => h.teacherId !== session.userId || !session.cohortIds.includes(h.cohortId))) {
    return { error: "هذه ليست حلقتك." };
  }

  const entries = halaqat.flatMap((h) =>
    h.students.map((st) => ({
      studentId: st.id,
      halqaId: h.id,
      status: String(formData.get(`att_${st.id}`) || "") as AttendanceStatus,
    }))
  );

  const missing = entries.filter((e) => !VALID.has(e.status as never));
  if (missing.length) {
    return {
      error: `بقي ${missing.length} طالبًا بلا حالة — لا يمكن الرفع قبل تسجيل الجميع.`,
      missing: missing.length,
    };
  }

  const existing = await prisma.attendance.count({ where: { halqaId: { in: halqaIds }, date } });

  await prisma.$transaction(
    entries.map((e) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: e.studentId, date } },
        update: { status: e.status, halqaId: e.halqaId, recordedById: session.userId },
        create: { studentId: e.studentId, date, status: e.status, halqaId: e.halqaId, recordedById: session.userId },
      })
    )
  );

  const names = halaqat.map((h) => h.name).join("، ");
  await logAction(
    session.userId,
    existing > 0
      ? `عدّل حضور ${halaqat.length > 1 ? "الحلقات" : "حلقة"} ${names} ليوم ${formatDateAr(date)}`
      : `رفع حضور ${halaqat.length > 1 ? "الحلقات" : "حلقة"} ${names} ليوم ${formatDateAr(date)}`
  );

  revalidatePath("/attendance");
  revalidatePath("/monitor");
  return { ok: true };
}
