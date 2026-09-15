"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { EVAL_MODE_LABELS, type EvalModeId } from "@/lib/exam";

export type SettingsState = { error?: string; ok?: boolean };

export async function saveEvalSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const placementMode = String(formData.get("placementMode") || "MARK100") as EvalModeId;
  const awqafMode = String(formData.get("awqafMode") || "MARK100") as EvalModeId;

  await prisma.evaluationSettings.upsert({
    where: { id: 1 },
    create: { id: 1, placementMode, awqafMode },
    update: { placementMode, awqafMode },
  });

  await logAction(
    session.userId,
    `ضبط طريقة التقييم: تحديد مستوى — ${EVAL_MODE_LABELS[placementMode]}، ترشيح الأوقاف — ${EVAL_MODE_LABELS[awqafMode]}`
  );

  revalidatePath("/exam-settings");
  revalidatePath("/exam-monitor");
  revalidatePath("/exams/placement");
  revalidatePath("/exams/awqaf");
  return { ok: true };
}
