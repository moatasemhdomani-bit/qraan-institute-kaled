"use server";

import { prisma, rawPrisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { createGuardianAccount } from "@/lib/guardian";
import { dateOnly } from "@/lib/daily";
import { revalidatePath } from "next/cache";
import { readStudentSheet, sheetCsvUrl, pickMobile, pickBirthYear, pickDate, looseName, type SheetRow } from "@/lib/studentImport";

async function assertStaff() {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return null;
  return session;
}

/** يقرأ جدول الطلاب من رابط Google Sheets (يجب أن يكون الرابط «لأي شخص لديه الرابط»). */
export async function readSheet(link: string): Promise<{ rows: SheetRow[] } | { error: string }> {
  if (!(await assertStaff())) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const url = sheetCsvUrl(link.trim());
  if (!url) return { error: "هذا ليس رابط Google Sheets صحيحًا." };
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(20000) });
  } catch {
    return { error: "تعذّر الوصول إلى الجدول — تحققوا من الاتصال وأعيدوا المحاولة." };
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("text/csv")) {
    return { error: "تعذّرت قراءة الجدول — تأكدوا أن مشاركته «أي شخص لديه الرابط» (عارض على الأقل)." };
  }
  return readStudentSheet(await res.text());
}

export type ImportMapping = {
  fileTeacher: string; // اسم المدرس كما في الجدول
  siteTeacherId: string; // المدرس المقابل في الموقع (لا يلزم لصفوف المنقطعين)
  cohorts: Record<string, string>; // قيمة «الفوج» في الجدول ← معرّف الفوج في الموقع
};

/**
 * new: طالب جديد يُسجَّل · update: مسجّل وتغيّرت معلوماته في الجدول فتُحدَّث · same: مسجّل بلا تغيير ·
 * skip: لا يُمسّ (مكرّر في الجدول نفسه).
 */
export type RowStatus = "new" | "update" | "same" | "skip";

export type PreviewRow = {
  line: number;
  name: string;
  father: string;
  mother: string;
  birthYear: string | null;
  phone: string | null;
  registered: string | null;
  cohortLabel: string;
  halqaName: string | null;
  orphan: boolean;
  active: boolean;
  status: RowStatus;
  changes: string[]; // للتحديث: ما سيتغيّر («الهاتف: 0933… ← 0944…»)
  issues: string[]; // معلومات ناقصة تبقى فارغة، ونحوها
};

/** صفوف «منقطعين» في الجدول تُستورد (وتُحدَّث) بحالة «منقطع» وبلا حلقة. */
const isInactiveTeacher = (t: string) => t.includes("منقطع");

type Existing = {
  id: string;
  name: string;
  fatherName: string | null;
  motherName: string | null;
  birthDate: string | null;
  guardianPhone: string | null;
  registeredAt: Date | null;
  halqaId: string | null;
  active: boolean;
  isOrphan: boolean;
};

/** حقول الطالب بعد تطبيق الجدول عليه — الخانة الفارغة في الجدول لا تمسح قيمة موجودة في الموقع. */
type Patch = {
  fatherName?: string;
  motherName?: string;
  birthDate?: string;
  guardianPhone?: string;
  registeredAt?: Date;
  halqaId?: string | null;
  active?: boolean;
  isOrphan?: boolean;
};

async function buildPreview(
  rows: SheetRow[],
  mapping: ImportMapping
): Promise<{ rows: (PreviewRow & { existingId: string | null; patch: Patch; halqaId: string | null })[] } | { error: string }> {
  const inactive = isInactiveTeacher(mapping.fileTeacher);
  const mine = rows.filter((r) => r.teacher === mapping.fileTeacher);
  if (mine.length === 0) return { error: "لا صفوف لهذا المدرس في الجدول." };
  if (!inactive && !mapping.siteTeacherId) return { error: "اختاروا المدرس المقابل في الموقع." };

  const halaqat = inactive
    ? []
    : await prisma.halqa.findMany({ where: { teacherId: mapping.siteTeacherId }, select: { id: true, name: true, cohortId: true } });
  const halqaNames = new Map((await prisma.halqa.findMany({ select: { id: true, name: true } })).map((h) => [h.id, h.name]));

  // مطابقة المسجّلين: نفس الاسم ونفس الأب، أو نفس الاسم ونفس رقم ولي الأمر، أو الاسم وحده إن خلا الطرفان منهما
  const existing: Existing[] = await rawPrisma.student.findMany({
    select: { id: true, name: true, fatherName: true, motherName: true, birthDate: true, guardianPhone: true, registeredAt: true, halqaId: true, active: true, isOrphan: true },
  });
  const byKey = new Map<string, Existing>();
  for (const s of existing) {
    const n = looseName(s.name);
    if (s.fatherName) byKey.set(`${n}|f|${looseName(s.fatherName)}`, s);
    if (s.guardianPhone) byKey.set(`${n}|p|${s.guardianPhone}`, s);
    if (!s.fatherName && !s.guardianPhone) byKey.set(`${n}|bare`, s);
  }

  const inFile = new Set<string>();
  const out = mine.map((r) => {
    const issues: string[] = [];
    const phone = pickMobile(r.phone);
    const registered = pickDate(r.registered);
    const birthYear = pickBirthYear(r.birth);
    const n = looseName(r.name);
    const orphan = r.notes.includes("يتيم");

    // المعلومة الناقصة تبقى فارغة: بلا فوج مقابَل أو بلا حلقة → بلا حلقة («غير مفروز»)
    let halqaId: string | null = null;
    if (!inactive) {
      const cohortId = mapping.cohorts[r.cohort];
      const halqa = cohortId ? halaqat.find((h) => h.cohortId === cohortId) : undefined;
      if (!cohortId) issues.push(`الفوج «${r.cohort || "فارغ"}» غير مقابَل — بلا حلقة`);
      else if (!halqa) issues.push("لا حلقة لهذا المدرس في هذا الفوج — بلا حلقة");
      else halqaId = halqa.id;
    }
    if (!phone) issues.push(r.phone ? `رقم الهاتف غير صالح («${r.phone}») — يبقى فارغًا` : "بلا رقم ولي أمر — يبقى فارغًا");
    if (!registered) issues.push(r.registered ? `تاريخ التسجيل «${r.registered}» غير مفهوم — يبقى فارغًا` : "بلا تاريخ تسجيل — يبقى فارغًا");

    const keys = [r.father && `${n}|f|${looseName(r.father)}`, phone && `${n}|p|${phone}`].filter(Boolean) as string[];
    if (!keys.length) keys.push(`${n}|bare`);
    const dupInFile = keys.some((k) => inFile.has(k));
    keys.forEach((k) => inFile.add(k));
    const match = keys.map((k) => byKey.get(k)).find(Boolean) ?? null;

    let status: RowStatus = "new";
    const changes: string[] = [];
    const patch: Patch = {};
    if (dupInFile) {
      status = "skip";
      issues.unshift("مكرّر في الجدول نفسه — لا يُمسّ");
    } else if (match) {
      const set = <K extends keyof Patch>(key: K, value: Patch[K], label: string, from: string, to: string) => {
        patch[key] = value;
        changes.push(`${label}: ${from || "فارغ"} ← ${to || "فارغ"}`);
      };
      if (r.father && r.father !== match.fatherName) set("fatherName", r.father, "الأب", match.fatherName ?? "", r.father);
      if (r.mother && r.mother !== match.motherName) set("motherName", r.mother, "الأم", match.motherName ?? "", r.mother);
      if (birthYear && birthYear !== match.birthDate) set("birthDate", birthYear, "المواليد", match.birthDate ?? "", birthYear);
      if (phone && phone !== match.guardianPhone) set("guardianPhone", phone, "رقم ولي الأمر", match.guardianPhone ?? "", phone);
      if (registered && (!match.registeredAt || dateOnly(match.registeredAt) !== registered)) {
        set("registeredAt", new Date(`${registered}T12:00:00`), "تاريخ التسجيل", match.registeredAt ? dateOnly(match.registeredAt) : "", registered);
      }
      if (orphan && !match.isOrphan) set("isOrphan", true, "يتيم", "لا", "نعم");
      if (inactive) {
        if (match.active) set("active", false, "الحالة", "نشط", "منقطع");
        if (match.halqaId) set("halqaId", null, "الحلقة", halqaNames.get(match.halqaId) ?? "", "");
      } else {
        if (!match.active) set("active", true, "الحالة", "منقطع", "نشط");
        // الحلقة تتغيّر فقط إن حُدِّدت من الجدول — «بلا حلقة» في الجدول لا تُخرج الطالب من حلقته في الموقع
        if (halqaId && halqaId !== match.halqaId) set("halqaId", halqaId, "الحلقة", match.halqaId ? halqaNames.get(match.halqaId) ?? "" : "", halqaNames.get(halqaId) ?? "");
      }
      status = changes.length ? "update" : "same";
      // للمسجّل: النواقص لا تُمسح شيئًا، فلا حاجة لإظهارها كتنبيه
      issues.length = 0;
    }

    return {
      line: r.line,
      name: r.name,
      father: r.father,
      mother: r.mother,
      birthYear,
      phone,
      registered,
      cohortLabel: r.cohort,
      halqaName: halqaId ? halqaNames.get(halqaId) ?? null : null,
      orphan,
      active: !inactive,
      status,
      changes,
      issues,
      existingId: match?.id ?? null,
      patch,
      halqaId,
    };
  });
  return { rows: out };
}

export async function previewImport(rows: SheetRow[], mapping: ImportMapping): Promise<{ rows: PreviewRow[] } | { error: string }> {
  if (!(await assertStaff())) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const res = await buildPreview(rows, mapping);
  if ("error" in res) return res;
  // المعطيات الداخلية (المعرّف والتعديلات) تبقى على الخادم
  return {
    rows: res.rows.map((r) => ({
      line: r.line, name: r.name, father: r.father, mother: r.mother, birthYear: r.birthYear, phone: r.phone,
      registered: r.registered, cohortLabel: r.cohortLabel, halqaName: r.halqaName, orphan: r.orphan, active: r.active,
      status: r.status, changes: r.changes, issues: r.issues,
    })),
  };
}

/** يسجّل الجدد ويحدّث المسجّلين الذين تغيّرت معلوماتهم — بعد إعادة الفحص كاملًا على الخادم. */
export async function commitImport(
  rows: SheetRow[],
  mapping: ImportMapping
): Promise<{ created: number; updated: number } | { error: string }> {
  const session = await assertStaff();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const preview = await buildPreview(rows, mapping);
  if ("error" in preview) return preview;

  // نوع الطالب (قرآن / قراءة عربية) يتبع حلقته
  const halqaTrack = new Map((await prisma.halqa.findMany({ select: { id: true, track: true } })).map((h) => [h.id, h.track]));

  let created = 0;
  let updated = 0;
  for (const p of preview.rows) {
    if (p.status === "update" && p.existingId) {
      const track = p.patch.halqaId ? halqaTrack.get(p.patch.halqaId) : undefined;
      await prisma.student.update({ where: { id: p.existingId }, data: { ...p.patch, ...(track ? { track } : {}) } });
      updated++;
    } else if (p.status === "new") {
      const last = await prisma.student.findFirst({ orderBy: { studentNo: "desc" }, select: { studentNo: true } });
      const studentNo = (last?.studentNo ?? 1000) + 1;
      const student = await prisma.student.create({
        data: {
          name: p.name,
          fatherName: p.father || null,
          motherName: p.mother || null,
          birthDate: p.birthYear,
          guardianPhone: p.phone,
          studentNo,
          halqaId: p.active ? p.halqaId : null,
          track: (p.active && p.halqaId && halqaTrack.get(p.halqaId)) || "QURAN",
          active: p.active,
          isOrphan: p.orphan,
          // تاريخ التسجيل الناقص يبقى فارغًا (لا يُعبّأ بتاريخ اليوم)
          registeredAt: p.registered ? new Date(`${p.registered}T12:00:00`) : null,
        },
      });
      const { user } = await createGuardianAccount(studentNo, p.name);
      await prisma.student.update({ where: { id: student.id }, data: { guardianUserId: user.id } });
      created++;
    }
  }

  await logAction(
    session.userId,
    `استيراد من Google Sheets (المدرس في الجدول: «${mapping.fileTeacher}») — سُجّل ${created} طالبًا جديدًا وحُدّث ${updated}`
  );
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/recitation");
  return { created, updated };
}
