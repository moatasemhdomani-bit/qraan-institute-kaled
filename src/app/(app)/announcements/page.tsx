import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma, nameWithNasab, studentFullName } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/ui";
import { formatDateTimeAr } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import AnnouncementsClient from "./AnnouncementsClient";

/** الإعلانات: يرسلها المدير والإداري إلى كل المعهد أو لدور أو لفوج — تصل إشعارًا في جرس كل مستلم. */
export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [cohorts, sent, reads, staff, guardians] = await Promise.all([
    prisma.cohort.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { by: { select: { name: true } } } }),
    prisma.notification.groupBy({ by: ["key"], where: { key: { startsWith: "ann:" }, readAt: { not: null } }, _count: { _all: true } }),
    // الإعلان الموجّه: الموظفون، وأولياء أمور الطلاب النشطين
    prisma.user.findMany({ where: { deletedAt: null, role: { not: "GUARDIAN" } }, select: { id: true, name: true, familyName: true, role: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({
      where: { active: true, guardianUserId: { not: null }, guardianUser: { deletedAt: null } },
      select: { guardianUserId: true, name: true, fatherName: true, familyName: true, studentNo: true },
      orderBy: { studentNo: "asc" },
    }),
  ]);
  const people = [
    ...staff.filter((u) => u.id !== session.userId).map((u) => ({ id: u.id, label: nameWithNasab(u.name, u.familyName), meta: ROLE_LABELS[u.role] ?? "", guardian: false })),
    ...guardians.map((g) => ({ id: g.guardianUserId!, label: `ولي أمر الطالب ${studentFullName(g.name, g.fatherName, g.familyName)}`, meta: `#${g.studentNo}`, guardian: true })),
  ];
  const readCount = Object.fromEntries(reads.map((r) => [r.key.slice(4), r._count._all]));

  return (
    <>
      <PageHeader title="الإعلانات" subtitle="إعلان يصل إشعارًا في جرس كل مستلم: لكل المعهد، أو لدور (المدرّسين، أولياء الأمور…)، أو لفوج — أو إعلان موجّه لموظف أو ولي أمر بعينه." />
      <AnnouncementsClient
        cohorts={cohorts}
        people={people}
        sent={sent.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          audienceLabel: a.audienceLabel,
          recipients: a.recipients,
          read: readCount[a.id] ?? 0,
          by: a.by.name,
          at: formatDateTimeAr(a.createdAt),
        }))}
      />
    </>
  );
}
