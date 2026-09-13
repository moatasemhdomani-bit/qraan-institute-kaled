"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type FormState = { error?: string; ok?: boolean };

async function savePhoto(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `student-${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/${filename}`;
}

export async function saveStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const id = String(formData.get("id") || "") || null;
  const name = String(formData.get("name") || "").trim();
  const halqaId = String(formData.get("halqaId") || "") || null;

  if (!name) return { error: "اكتبوا اسم الطالب." };

  const data = {
    name,
    fatherName: String(formData.get("father") || "") || null,
    motherName: String(formData.get("mother") || "") || null,
    birthDate: String(formData.get("birth") || "") || null,
    address: String(formData.get("address") || "") || null,
    fatherJob: String(formData.get("job") || "") || null,
    studentPhone: String(formData.get("phone") || "") || null,
    guardianPhone: String(formData.get("guardianPhone") || "") || null,
    halqaId,
  };

  let studentId = id;
  if (id) {
    await prisma.student.update({ where: { id }, data });
    await logAction(session.userId, `عدّل بيانات الطالب «${name}»`);
  } else {
    const last = await prisma.student.findFirst({ orderBy: { studentNo: "desc" } });
    const nextNo = (last?.studentNo ?? 1000) + 1;
    const created = await prisma.student.create({ data: { ...data, studentNo: nextNo } });
    studentId = created.id;
    const halqa = halqaId ? await prisma.halqa.findUnique({ where: { id: halqaId } }) : null;
    await logAction(
      session.userId,
      halqa ? `سجّل الطالب «${name}» في حلقة ${halqa.name}` : `سجّل الطالب «${name}»`
    );
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0 && studentId) {
    const url = await savePhoto(photo);
    await prisma.student.update({ where: { id: studentId }, data: { photoUrl: url } });
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { ok: true };
}
