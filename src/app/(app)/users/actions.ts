"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/audit";
import { ROLE_LABELS } from "@/lib/ui";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { normalizePhone } from "@/lib/phone";

export type FormState = { error?: string; ok?: boolean };

async function savePhoto(file: File, prefix: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${prefix}-${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/${filename}`;
}

export async function saveStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const id = String(formData.get("id") || "") || null;
  const role = String(formData.get("role") || "TEACHER") as "DIRECTOR" | "ADMIN" | "TEACHER" | "EXAMINER";
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name) return { error: "اكتبوا اسم العامل." };
  if (role === "DIRECTOR" && session.role !== "DIRECTOR") {
    return { error: "إسناد دور «مدير المعهد» من اختصاص مدير المعهد وحده." };
  }

  const data = {
    name,
    role,
    fatherName: String(formData.get("father") || "") || null,
    motherName: String(formData.get("mother") || "") || null,
    familyName: String(formData.get("family") || "") || null,
    phone: normalizePhone(String(formData.get("phone") || "")),
    birthDate: String(formData.get("birth") || "") || null,
    nationalId: String(formData.get("nid") || "") || null,
    address: String(formData.get("address") || "") || null,
    currentJob: String(formData.get("job") || "") || null,
    maritalStatus: String(formData.get("marital") || "") || null,
    education: String(formData.get("education") || "") || null,
    quranLevel: String(formData.get("quran") || "") || null,
  };

  let userId = id;

  if (id) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { error: "الحساب غير موجود." };
    if (existing.role === "DIRECTOR" && session.role !== "DIRECTOR") {
      return { error: "تعديل حساب مدير المعهد من اختصاصه وحده." };
    }

    const updateData: typeof data & { username?: string; passwordHash?: string } = { ...data };

    if (username && username !== existing.username) {
      const clash = await prisma.user.findUnique({ where: { username } });
      if (clash) return { error: "اسم المستخدم مستخدَم مسبقًا." };
      updateData.username = username;
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    await prisma.user.update({ where: { id }, data: updateData });
    await logAction(session.userId, `عدّل بيانات العامل «${name}»`);
  } else {
    if (!username || !password) return { error: "اسم المستخدم وكلمة المرور مطلوبان لحساب جديد." };
    const clash = await prisma.user.findUnique({ where: { username } });
    if (clash) return { error: "اسم المستخدم مستخدَم مسبقًا." };
    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({ data: { ...data, username, passwordHash } });
    userId = created.id;
    await logAction(session.userId, `سجّل عاملًا جديدًا «${name}» بدور ${ROLE_LABELS[role]}`);
  }

  if (role === "TEACHER" && userId) {
    const cohortIds = formData.getAll("cohortIds").map(String).filter(Boolean);
    await prisma.cohortTeacher.deleteMany({ where: { userId } });
    if (cohortIds.length) {
      await prisma.cohortTeacher.createMany({
        data: cohortIds.map((cohortId) => ({ cohortId, userId: userId as string })),
        skipDuplicates: true,
      });
    }
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0 && userId) {
    const url = await savePhoto(photo, "staff");
    await prisma.user.update({ where: { id: userId }, data: { photoUrl: url } });
  }

  revalidatePath("/users");
  return { ok: true };
}

export async function deleteStaff(id: string): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") return { error: "حذف الحساب من صلاحية مدير المعهد فقط." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "الحساب غير موجود." };
  if (target.id === session.userId) return { error: "لا يمكنك حذف حسابك الخاص." };

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return {
      error:
        "لا يمكن حذف هذا الحساب لارتباطه ببيانات أخرى (حلقة مُسندة إليه، أو سجلات حضور/تسميع سجّلها) — انقل هذه الارتباطات أولًا.",
    };
  }

  await logAction(session.userId, `حذف حساب ${ROLE_LABELS[target.role]} «${target.name}»`);
  revalidatePath("/users");
  return { ok: true };
}
