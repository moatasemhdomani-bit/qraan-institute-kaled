"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma, nameWithNasab, studentFullName } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { ROLE_LABELS } from "@/lib/ui";
import { invalidateNotifications } from "@/lib/notifications";

export type AnnResult = { error?: string; ok?: boolean; recipients?: number };

const isStaff = (role: string) => role === "DIRECTOR" || role === "ADMIN";

/** المستخدمون غير المحذوفين — وولي الأمر ما دام له ابن نشط */
const ACTIVE_USER: Prisma.UserWhereInput = {
  deletedAt: null,
  OR: [{ role: { not: "GUARDIAN" } }, { guardianOf: { some: { active: true } } }],
};

/** اسم المستلم في الإعلان الموجّه: الموظف باسمه، وولي الأمر «ولي أمر الطالب …» */
async function personLabels(ids: string[]): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, name: true, familyName: true, role: true, guardianOf: { select: { name: true, fatherName: true, familyName: true }, take: 1 } },
  });
  return new Map(
    users.map((u) => [
      u.id,
      u.role === "GUARDIAN" && u.guardianOf[0]
        ? `ولي أمر الطالب ${studentFullName(u.guardianOf[0].name, u.guardianOf[0].fatherName, u.guardianOf[0].familyName)}`
        : nameWithNasab(u.name, u.familyName),
    ])
  );
}

/** مستلمو الإعلان بحسب جمهوره: «all» أو «role:X,Y» (دور أو أكثر) أو «cohort:<id>» أو «user:<id>,<id>» (موجّه لشخص أو أكثر بعينه) */
async function recipientsOf(audience: string): Promise<{ ids: string[]; label: string } | null> {
  if (audience.startsWith("user:")) {
    const wanted = [...new Set(audience.slice(5).split(",").filter(Boolean))].slice(0, 100);
    if (!wanted.length) return null;
    const labels = await personLabels(wanted);
    const ids = wanted.filter((id) => labels.has(id));
    if (!ids.length) return null;
    const names = ids.map((id) => labels.get(id)!);
    return { ids, label: `موجّه: ${names.slice(0, 3).join("، ")}${names.length > 3 ? ` و${names.length - 3} آخرين` : ""}` };
  }
  if (audience === "all") {
    const users = await prisma.user.findMany({ where: ACTIVE_USER, select: { id: true } });
    return { ids: users.map((u) => u.id), label: "كل المعهد" };
  }
  if (audience.startsWith("role:")) {
    const roles = [...new Set(audience.slice(5).split(",").filter(Boolean))];
    if (!roles.length || roles.some((r) => !ROLE_LABELS[r])) return null;
    const ids = new Set<string>();
    for (const role of roles) {
      const where: Prisma.UserWhereInput =
        role === "GUARDIAN"
          ? { ...ACTIVE_USER, role: "GUARDIAN" }
          : { deletedAt: null, OR: [{ role: role as never }, { assignments: { some: { role: role as never } } }] };
      for (const u of await prisma.user.findMany({ where, select: { id: true } })) ids.add(u.id);
    }
    return { ids: [...ids], label: roles.map((r) => (r === "GUARDIAN" ? "أولياء الأمور" : ROLE_LABELS[r])).join("، ") };
  }
  if (audience.startsWith("cohort:")) {
    const cohort = await prisma.cohort.findUnique({ where: { id: audience.slice(7) }, select: { id: true, name: true } });
    if (!cohort) return null;
    // موظفو الفوج، ومدرّسو حلقاته، وأولياء أمور طلابه النشطين
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { assignments: { some: { cohortId: cohort.id } } },
          { halaqatTaught: { some: { cohortId: cohort.id } } },
          { guardianOf: { some: { active: true, halqa: { cohortId: cohort.id } } } },
        ],
      },
      select: { id: true },
    });
    return { ids: users.map((u) => u.id), label: `فوج ${cohort.name}` };
  }
  return null;
}

/** إعلان من الإدارة: يصل إشعارًا لكل مستلم في جمهوره (عدا المُرسِل) */
export async function sendAnnouncement(input: { title: string; body: string; audience: string }): Promise<AnnResult> {
  const session = await getSession();
  if (!session || !isStaff(session.role)) return { error: "الإعلانات من صلاحية الإدارة." };
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { error: "اكتبوا عنوان الإعلان." };
  if (!body) return { error: "اكتبوا نص الإعلان." };

  const r = await recipientsOf(input.audience);
  if (!r) return { error: "اختاروا جمهور الإعلان." };
  const ids = r.ids.filter((id) => id !== session.userId);
  if (!ids.length) return { error: "لا مستلمين لهذا الجمهور." };

  const ann = await prisma.announcement.create({
    data: { title, body, audience: input.audience, audienceLabel: r.label, recipients: ids.length, byId: session.userId },
  });
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, key: `ann:${ann.id}`, title: `إعلان: ${title}`, body, href: null })),
    skipDuplicates: true,
  });
  await logAction(session.userId, `أرسل الإعلان «${title}» إلى ${r.label} (عدد المستلمين ${ids.length})`);
  invalidateNotifications();
  revalidatePath("/announcements");
  return { ok: true, recipients: ids.length };
}

/** حذف إعلان — ويُحذف إشعاره من عند كل المستلمين */
export async function deleteAnnouncement(id: string): Promise<AnnResult> {
  const session = await getSession();
  if (!session || !isStaff(session.role)) return { error: "الإعلانات من صلاحية الإدارة." };
  const ann = await prisma.announcement.findUnique({ where: { id } });
  if (!ann) return { error: "الإعلان غير موجود." };
  await prisma.$transaction([prisma.notification.deleteMany({ where: { key: `ann:${id}` } }), prisma.announcement.delete({ where: { id } })]);
  await logAction(session.userId, `حذف الإعلان «${ann.title}»`);
  revalidatePath("/announcements");
  return { ok: true };
}
