"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { dayLockReason, isValidDate, GRADES, formatDateAr } from "@/lib/daily";
import { validateEntry, type RecEntry } from "@/lib/recitation";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: boolean; focusStudentId?: string };

const page = (v: FormDataEntryValue | null): number | null => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
};

export async function uploadRecitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") {
    return { error: "تسجيل التسميع من صلاحية المدرّس." };
  }

  const halqaId = String(formData.get("halqaId") || "");
  const date = String(formData.get("date") || "");
  if (!isValidDate(date)) return { error: "التاريخ غير صحيح." };

  const locked = await dayLockReason(date);
  if (locked) return { error: `${locked} — لا يُسجَّل تسميع في يوم لا دوام فيه.` };

  const halqa = await prisma.halqa.findUnique({
    where: { id: halqaId },
    include: { students: { select: { id: true, name: true } } },
  });
  if (!halqa) return { error: "الحلقة غير موجودة." };
  if (halqa.teacherId !== session.userId) return { error: "هذه ليست حلقتك." };

  const entries: RecEntry[] = halqa.students.map((st) => ({
    studentId: st.id,
    none: formData.get(`none_${st.id}`) === "1",
    noNew: formData.get(`noNew_${st.id}`) === "1",
    noPast: formData.get(`noPast_${st.id}`) === "1",
    newFrom: page(formData.get(`nf_${st.id}`)),
    newTo: page(formData.get(`nt_${st.id}`)),
    pastFrom: page(formData.get(`rf_${st.id}`)),
    pastTo: page(formData.get(`rt_${st.id}`)),
    gradeNew: (String(formData.get(`gn_${st.id}`) || "") || null) as string | null,
    gradePast: (String(formData.get(`gp_${st.id}`) || "") || null) as string | null,
  }));

  for (const e of entries) {
    if (e.gradeNew && !GRADES.includes(e.gradeNew as never)) return { error: "تقدير غير معروف." };
    if (e.gradePast && !GRADES.includes(e.gradePast as never)) return { error: "تقدير غير معروف." };
    const bad = validateEntry(e);
    if (bad) {
      const name = halqa.students.find((s) => s.id === e.studentId)?.name ?? "";
      return { error: `${name}: ${bad}`, focusStudentId: e.studentId };
    }
  }

  const existing = await prisma.recitation.count({ where: { halqaId, date } });

  await prisma.$transaction(
    entries.map((e) => {
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
      return prisma.recitation.upsert({
        where: { studentId_date: { studentId: e.studentId, date } },
        update: data,
        create: { ...data, studentId: e.studentId, date },
      });
    })
  );

  await logAction(
    session.userId,
    existing > 0
      ? `عدّل تسميع حلقة ${halqa.name} ليوم ${formatDateAr(date)}`
      : `رفع تسميع حلقة ${halqa.name} ليوم ${formatDateAr(date)}`
  );

  revalidatePath("/recitation");
  return { ok: true };
}
