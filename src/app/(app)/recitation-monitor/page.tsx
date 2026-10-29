import { surahsLabel } from "@/lib/recitation";
import { parsePastItems, pastSummary, pastJuzTotal } from "@/lib/pastRecitation";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import { today, isValidDate, formatDateAr, pageSpan, countedNewPages, holidayDaysIn, dayLockReason } from "@/lib/daily";
import { hasPastRecitation } from "@/lib/track";
import PageHeader from "@/components/PageHeader";
import RecitationMonitorClient from "./RecitationMonitorClient";

export default async function RecitationMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN" && session.role !== "EXAM_SUPERVISOR") redirect("/dashboard");

  const sp = await searchParams;
  const date = sp.date && isValidDate(sp.date) ? sp.date : today();

  // مشرف مختبرين القرآن: حلقات القرآن في أفواج حسابه — اطلاع فقط
  const halaqat = await prisma.halqa.findMany({
    where: session.role === "EXAM_SUPERVISOR" ? { track: { in: ["AMMA", "QURAN", "QURAN_GHAIB"] }, ...cohortScope(session) } : undefined,
    include: {
      teacher: { select: { name: true } },
      cohort: { select: { name: true } },
      students: { where: { active: true }, select: { id: true, name: true, studentNo: true }, orderBy: { studentNo: "asc" } },
      recitations: { where: { date } },
    },
    orderBy: { name: "asc" },
  });

  const blocks = halaqat.map((h) => {
    const byStudent = Object.fromEntries(h.recitations.map((r) => [r.studentId, r]));
    const uploaded = h.recitations.length > 0;
    // مرفوع: سُجّل تسميع كل طلاب الحلقة — غير مكتمل: سُجّل ولكن ليس لكل الطلاب — لم يُرفع: لا شيء
    const status: "full" | "partial" | "none" = !uploaded
      ? "none"
      : h.students.every((st) => byStudent[st.id])
        ? "full"
        : "partial";

    // الجديد بالصفحات، والماضي بالأجزاء (الحزب = نصف جزء)
    const totalPages = h.recitations.reduce((sum, r) => sum + countedNewPages(r), 0);
    const totalPastJuz = h.recitations.reduce((sum, r) => sum + pastJuzTotal(parsePastItems(r.pastItems)), 0);

    return {
      id: h.id,
      name: h.name,
      meta: `${h.teacher.name} · ${h.cohort.name} · ${h.students.length} طالبًا`,
      teacherName: h.teacher.name,
      cohortName: h.cohort.name,
      uploaded,
      status,
      totalPages,
      totalPastJuz,
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
            // تسميع بالسور (عمَّ غيباً / بينة للناس)
            r.surahs.length > 0
              ? `سور: ${surahsLabel(r.surahs, r.surahsDone)} — ${r.gradeNew ?? ""}`
              : r.examPrep
            ? "تحضير للسبر"
            : r.noNew
                ? "لم يسمّع جديدًا"
                : r.newFrom == null
                  ? "الجديد لم يُسجَّل بعد"
                  : `جديد: ${r.newFrom}←${r.newTo} (${pageSpan(r.newFrom, r.newTo)} صفحة) — ${r.gradeNew ?? ""}${r.pageDone === false ? " — لم يُنهِ الصفحة" : ""}`,
            // الماضي لمستويَي القرآن حاضراً وغيباً وحدهما
            ...(!hasPastRecitation(h.track)
              ? []
              : [
                  r.noPast
                    ? "لم يقرأ ماضيًا"
                    : `ماضي: ${pastSummary(parsePastItems(r.pastItems)) || "لم يُسجَّل بعد"}`,
                ]),
          ],
        };
      }),
    };
  });

  const pending = blocks.filter((b) => !b.uploaded);
  const canRecord = session.role === "DIRECTOR";

  // يوم عطلة رسمية: «عطلة — الاسم» كما حفظته الإدارة
  const holidayName = (await holidayDaysIn(date, date)).get(date) ?? null;
  const offDay = date > today() ? null : await dayLockReason(date);

  return (
    <>
      <PageHeader
        title="متابعة التسميع"
        subtitle={
          `تسميع كل الحلقات ليوم ${formatDateAr(date)}` +
          (holidayName ? ` — عطلة — ${holidayName}` : "") +
          (canRecord ? " — يمكنك فتح أي حلقة وتسجيل تسميعها." : " — عرض فقط.")
        }
      />
      <RecitationMonitorClient
        offDay={offDay}
        date={date}
        blocks={blocks}
        pendingCount={pending.length}
        totalCount={blocks.length}
        canRecord={canRecord}
      />
    </>
  );
}
