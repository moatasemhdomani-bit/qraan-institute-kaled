import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, isValidDate, formatDateAr, ATT_STATES, ATT_LABELS } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import MonitorClient from "./MonitorClient";

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const date = sp.date && isValidDate(sp.date) ? sp.date : today();

  const halaqat = await prisma.halqa.findMany({
    include: {
      teacher: { select: { name: true } },
      cohort: { select: { name: true } },
      students: { select: { id: true, name: true }, orderBy: { studentNo: "asc" } },
      attendance: { where: { date } },
    },
    orderBy: { name: "asc" },
  });

  const blocks = halaqat.map((h) => {
    const byStudent = Object.fromEntries(h.attendance.map((a) => [a.studentId, a.status as string]));
    const uploaded = h.attendance.length > 0;
    const tally = ATT_STATES.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      count: h.attendance.filter((a) => a.status === s.id).length,
    }));
    return {
      id: h.id,
      name: h.name,
      meta: `${h.teacher.name} · ${h.cohort.name} · ${h.students.length} طالبًا`,
      uploaded,
      tally,
      rows: h.students.map((st) => ({
        id: st.id,
        name: st.name,
        status: byStudent[st.id] ?? "",
        label: byStudent[st.id] ? ATT_LABELS[byStudent[st.id]] : "—",
      })),
    };
  });

  const pending = blocks.filter((b) => !b.uploaded);

  return (
    <>
      <PageHeader title="متابعة الحضور" subtitle={`حضور كل الحلقات ليوم ${formatDateAr(date)} — عرض فقط.`} />
      <MonitorClient date={date} blocks={blocks} pendingCount={pending.length} totalCount={blocks.length} />
    </>
  );
}
