import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatDateTimeAr } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import AnnouncementsClient from "./AnnouncementsClient";

/** الإعلانات: يرسلها المدير والإداري إلى كل المعهد أو لدور أو لفوج — تصل إشعارًا في جرس كل مستلم. */
export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const [cohorts, sent, reads] = await Promise.all([
    prisma.cohort.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { by: { select: { name: true } } } }),
    prisma.notification.groupBy({ by: ["key"], where: { key: { startsWith: "ann:" }, readAt: { not: null } }, _count: { _all: true } }),
  ]);
  const readCount = Object.fromEntries(reads.map((r) => [r.key.slice(4), r._count._all]));

  return (
    <>
      <PageHeader title="الإعلانات" subtitle="إعلان يصل إشعارًا في جرس كل مستلم: لكل المعهد، أو لدور (المدرّسين، أولياء الأمور…)، أو لفوج." />
      <AnnouncementsClient
        cohorts={cohorts}
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
