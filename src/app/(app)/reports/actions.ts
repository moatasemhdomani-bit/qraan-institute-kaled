"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; ok?: boolean };

export async function deleteIssuedReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") return { error: "مدير المعهد فقط يمكنه حذف تقرير من السجل." };

  const id = String(formData.get("id") || "");
  if (!id) return { error: "تعذّر تحديد التقرير." };

  await prisma.issuedReport.delete({ where: { id } });
  revalidatePath("/reports");
  return { ok: true };
}

export async function renameIssuedReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") return { error: "مدير المعهد فقط يمكنه تعديل اسم تقرير في السجل." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id) return { error: "تعذّر تحديد التقرير." };
  if (!name) return { error: "اكتبوا اسمًا للتقرير." };

  await prisma.issuedReport.update({ where: { id }, data: { name } });
  revalidatePath("/reports");
  return { ok: true };
}
