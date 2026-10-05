"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { generatePassword, encryptPassword } from "@/lib/guardian";
import { logAction } from "@/lib/audit";
import { ROLE_LABELS } from "@/lib/ui";
import { staffRoleLabel, teacherTrackFor } from "@/lib/track";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { normalizePhone, isValidMobile } from "@/lib/phone";
import { uploadFile, mimeFromExt } from "@/lib/storage";
import { cleanNationalId, MARITAL_OPTIONS, EDUCATION_OPTIONS, QURAN_LEVEL_OPTIONS, STAFF_KIND_ROLES } from "@/lib/staff";

export type FormState = { error?: string; ok?: boolean; generatedPassword?: string };

async function savePhoto(file: File, prefix: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${prefix}-${crypto.randomUUID()}.${ext}`;
  return uploadFile(filename, bytes, mimeFromExt(ext));
}

export async function saveStaff(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") {
    return { error: "إدارة المستخدمين من صلاحية مدير المعهد فقط." };
  }

  const id = String(formData.get("id") || "") || null;
  // الدور في كل فوج — الموظف قد يأخذ أدوارًا مختلفة باختلاف الأفواج
  let rawAssignments: { cohortId: string; kind: string }[] = [];
  try {
    rawAssignments = JSON.parse(String(formData.get("assignmentsJson") || "[]"));
  } catch {
    rawAssignments = [];
  }
  const cohortRows = await prisma.cohort.findMany({ select: { id: true, name: true } });
  const assignments = rawAssignments
    .filter((a) => STAFF_KIND_ROLES[a.kind] && cohortRows.some((c) => c.id === a.cohortId))
    .map((a) => ({ cohortId: a.cohortId, ...STAFF_KIND_ROLES[a.kind] }));
  if (assignments.length === 0) return { error: "اختاروا دور الموظف في فوج واحد على الأقل." };
  // الحساب الذي يدخل عليه أولًا: أول أدواره بالترتيب
  const { role, track } = assignments[0];
  const name = String(formData.get("name") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!name) return { error: "اكتبوا اسم العامل." };
  const phone = normalizePhone(String(formData.get("phone") || ""));
  if (phone && !isValidMobile(phone)) return { error: "رقم التواصل بصيغة 09XX XXX XXX — عشرة أرقام تبدأ بـ 09." };
  // مدرّس له حلقات: يبقى مدرّسًا من نوع حلقته في فوجها — وإلا تُسند الحلقة إلى مدرّس غيره أولًا
  if (id) {
    const taught = await prisma.halqa.findMany({ where: { teacherId: id }, select: { name: true, cohortId: true, track: true } });
    for (const h of taught) {
      const a = assignments.find((x) => x.cohortId === h.cohortId);
      if (!a || a.role !== "TEACHER" || a.track !== teacherTrackFor(h.track)) {
        const cohortName = cohortRows.find((c) => c.id === h.cohortId)?.name ?? "";
        return {
          error: `له حلقة «${h.name}» في فوج «${cohortName}» — يبقى فيه «${staffRoleLabel("TEACHER", teacherTrackFor(h.track), ROLE_LABELS)}» حتى تُسند الحلقة إلى مدرّس غيره.`,
        };
      }
    }
  }

  const data = {
    name,
    role,
    track,
    fatherName: String(formData.get("father") || "") || null,
    motherName: String(formData.get("mother") || "") || null,
    familyName: String(formData.get("family") || "") || null,
    phone,
    birthDate: String(formData.get("birth") || "") || null,
    nationalId: cleanNationalId(String(formData.get("nid") || "")) || null,
    address: String(formData.get("address") || "") || null,
    currentJob: String(formData.get("job") || "") || null,
    maritalStatus: String(formData.get("marital") || "") || null,
    education: String(formData.get("education") || "") || null,
    quranLevel: String(formData.get("quran") || "") || null,
  };

  const rawNid = String(formData.get("nid") || "").trim();
  if (rawNid && !/^\d+$/.test(rawNid.replace(/[٠-٩]/g, "0"))) return { error: "الرقم الوطني أرقام فقط." };
  if (data.maritalStatus && !MARITAL_OPTIONS.includes(data.maritalStatus) && data.maritalStatus !== existingValue(formData, "marital")) {
    return { error: "اختاروا الحالة الاجتماعية من القائمة." };
  }
  if (data.education && !EDUCATION_OPTIONS.includes(data.education) && data.education !== existingValue(formData, "education")) {
    return { error: "اختاروا التحصيل العلمي من القائمة." };
  }
  if (data.quranLevel && !QURAN_LEVEL_OPTIONS.includes(data.quranLevel) && data.quranLevel !== existingValue(formData, "quran")) {
    return { error: "اختاروا المستوى القرآني من القائمة." };
  }

  // موظف جديد: كل المعلومات إجبارية ما عدا الصورة الشخصية
  if (!id) {
    const required: [unknown, string][] = [
      [username, "اسم المستخدم"],
      [data.fatherName, "اسم الأب"],
      [data.motherName, "اسم الأم"],
      [data.familyName, "النسبة"],
      [data.phone, "رقم التواصل"],
      [data.birthDate, "تاريخ الميلاد"],
      [data.nationalId, "الرقم الوطني"],
      [data.address, "عنوان السكن"],
      [data.currentJob, "العمل الحالي"],
      [data.maritalStatus, "الحالة الاجتماعية"],
      [data.education, "التحصيل العلمي"],
      [data.quranLevel, "المستوى القرآني"],
    ];
    const missing = required.filter(([v]) => !v || !String(v).trim()).map(([, label]) => label);
    if (missing.length) return { error: `كل المعلومات إجبارية ما عدا الصورة الشخصية — ناقص: ${missing.join("، ")}.` };
  }

  let userId = id;
  let generatedPassword: string | undefined;

  if (id) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { error: "الحساب غير موجود." };
    if (existing.role === "DIRECTOR" && session.role !== "DIRECTOR") {
      return { error: "تعديل حساب مدير المعهد من اختصاصه وحده." };
    }

    const updateData: typeof data & { username?: string; passwordHash?: string; passwordEnc?: string } = { ...data };

    if (username && username !== existing.username) {
      const clash = await prisma.user.findUnique({ where: { username } });
      if (clash) return { error: "اسم المستخدم مستخدَم مسبقًا." };
      updateData.username = username;
    }
    if (password) {
      updateData.passwordHash = await hashPassword(password);
      updateData.passwordEnc = encryptPassword(password);
    }

    await prisma.user.update({ where: { id }, data: updateData });
    await logAction(session.userId, `عدّل بيانات العامل «${name}»`);
  } else {
    if (!username) return { error: "اسم المستخدم مطلوب لحساب جديد." };
    const clash = await prisma.user.findUnique({ where: { username } });
    if (clash) return { error: "اسم المستخدم مستخدَم مسبقًا." };
    const finalPassword = password || generatePassword();
    generatedPassword = finalPassword;
    const passwordHash = await hashPassword(finalPassword);
    const passwordEnc = encryptPassword(finalPassword);
    const created = await prisma.user.create({ data: { ...data, username, passwordHash, passwordEnc } });
    userId = created.id;
    await logAction(session.userId, `سجّل عاملًا جديدًا «${name}» بدور ${staffRoleLabel(role, track, ROLE_LABELS)}`);
  }

  if (userId) {
    // أدواره في الأفواج، ومعها أفواج التدريس (CohortTeacher) لشاشة إدارة الأفواج
    const teacherCohorts = assignments.filter((a) => a.role === "TEACHER").map((a) => a.cohortId);
    await prisma.$transaction([
      prisma.staffAssignment.deleteMany({ where: { userId } }),
      prisma.staffAssignment.createMany({ data: assignments.map((a) => ({ ...a, userId: userId as string })) }),
      prisma.cohortTeacher.deleteMany({ where: { userId } }),
      prisma.cohortTeacher.createMany({ data: teacherCohorts.map((cohortId) => ({ cohortId, userId: userId as string })), skipDuplicates: true }),
    ]);
  }

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0 && userId) {
    const url = await savePhoto(photo, "staff");
    await prisma.user.update({ where: { id: userId }, data: { photoUrl: url } });
  }

  revalidatePath("/users");
  return { ok: true, generatedPassword };
}

/** قيمة قديمة مخزَّنة قبل القوائم المنسدلة (نص حرّ) — تُقبل كما هي عند تعديل موظف قائم. */
function existingValue(formData: FormData, key: string): string {
  return String(formData.get(`${key}Existing`) || "");
}

/** تعليق الموظف: لا يدخل ولا تبقى جلسته (كالحذف)، لكن تبقى بياناته الشخصية كاملة، ويمكن إلغاء التعليق. */
export async function setStaffSuspended(id: string, suspended: boolean): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") return { error: "تعليق الموظف من صلاحية مدير المعهد فقط." };
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.deletedAt) return { error: "الموظف غير موجود." };
  if (target.id === session.userId) return { error: "لا يمكنك تعليق حسابك الخاص." };

  await prisma.user.update({ where: { id }, data: { suspendedAt: suspended ? new Date() : null } });
  await logAction(
    session.userId,
    `${suspended ? "علّق" : "ألغى تعليق"} الموظف ${staffRoleLabel(target.role, target.track, ROLE_LABELS)} «${target.name}»`
  );
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteStaff(id: string): Promise<FormState> {
  const session = await getSession();
  if (!session || session.role !== "DIRECTOR") return { error: "حذف الموظف من صلاحية مدير المعهد فقط." };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "الموظف غير موجود." };
  if (target.id === session.userId) return { error: "لا يمكنك حذف حسابك الخاص." };

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    if (target.role === "TEACHER") {
      return {
        error:
          "لا يمكن حذف هذا المدرّس لارتباطه ببيانات أخرى (حلقة مُسندة إليه، أو سجلات حضور/تسميع سجّلها) — انقل هذه الارتباطات أولًا.",
      };
    }
    // المدير والإداري والمختبِر يُحذفون بلا قيود: إن ارتبط الحساب بسجلات سابقة (سبر أجراه، سجل تدقيق، تقارير…)
    // يُعطَّل بدل مسحه — لا يدخل ولا يظهر في القوائم، ويبقى اسمه ظاهرًا في تلك السجلات.
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        username: `deleted-${id}`,
        passwordHash: await hashPassword(crypto.randomUUID()),
        passwordEnc: null,
      },
    });
    await prisma.cohortTeacher.deleteMany({ where: { userId: id } });
  }

  await logAction(session.userId, `حذف الموظف ${staffRoleLabel(target.role, target.track, ROLE_LABELS)} «${target.name}»`);
  revalidatePath("/users");
  return { ok: true };
}
