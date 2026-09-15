import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, isValidDate, formatDateAr, pageSpan } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import RecitationMonitorClient from "./RecitationMonitorClient";

export default async function RecitationMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
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
      students: { select: { id: true, name: true, studentNo: true }, orderBy: { studentNo: "asc" } },
      recitations: { where: { date } },
    },
    orderBy: { name: "asc" },
  });

  const blocks = halaqat.map((h) => {
    const byStudent = Object.fromEntries(h.recitations.map((r) => [r.studentId, r]));
    const uploaded = h.recitations.length > 0;

    const totalPages = h.recitations.reduce(
      (sum, r) => sum + pageSpan(r.newFrom, r.newTo) + pageSpan(r.pastFrom, r.pastTo),
      0
    );

    return {
      id: h.id,
      name: h.name,
      meta: `${h.teacher.name} · ${h.cohort.name} · ${h.students.length} طالبًا`,
      uploaded,
      totalPages,
      rows: h.students.map((st) => {
        const r = byStudent[st.id];
        if (!r) return { id: st.id, name: st.name, no: st.studentNo, state: "none" as const, lines: [] };
        if (r.none) return { id: st.id, name: st.name, no: st.studentNo, state: "blank" as const, lines: [] };
        return {
          id: st.id,
          name: st.name,
          no: st.studentNo,
          state: "done" as const,
          lines: [
            r.noNew
              ? "لم يسمّع جديدًا"
              : `جديد: ${r.newFrom}→${r.newTo} (${pageSpan(r.newFrom, r.newTo)} صفحة) — ${r.gradeNew ?? ""}`,
            r.noPast
              ? "لم يقرأ ماضيًا"
              : `ماضي: ${r.pastFrom}→${r.pastTo} (${pageSpan(r.pastFrom, r.pastTo)} صفحة) — ${r.gradePast ?? ""}`,
          ],
        };
      }),
    };
  });

  const pending = blocks.filter((b) => !b.uploaded);
  const canRecord = session.role === "DIRECTOR";

  return (
    <>
      <PageHeader
        title="متابعة التسميع"
        subtitle={
          `تسميع كل الحلقات ليوم ${formatDateAr(date)}` +
          (canRecord ? " — يمكنك فتح أي حلقة وتسجيل تسميعها." : " — عرض فقط.")
        }
      />
      <RecitationMonitorClient
        date={date}
        blocks={blocks}
        pendingCount={pending.length}
        totalCount={blocks.length}
        canRecord={canRecord}
      />
    </>
  );
}
