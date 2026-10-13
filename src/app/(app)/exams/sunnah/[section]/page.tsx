import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today } from "@/lib/daily";
import { sunnahSectionFromSlug } from "@/lib/sunnah";
import PageHeader from "@/components/PageHeader";
import SunnahClient from "../SunnahClient";
import { loadSunnahExamRows, loadSunnahStudents, workDatesThisWeek } from "../data";

/** واجهة منهج واحد من السنة النبوية: الحديث الشريف، أو الشمائل المحمدية، أو السيرة النبوية. */
export default async function SunnahSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.role;
  if (role !== "SUNNAH_EXAMINER" && role !== "DIRECTOR" && role !== "ADMIN") redirect("/dashboard");
  const sec = sunnahSectionFromSlug((await params).section);
  if (!sec) notFound();

  const [students, exams, recs, weekDates] = await Promise.all([
    loadSunnahStudents(),
    // سبر الأوقاف يُدار من شاشة سبر الأوقاف عند الإدارة — هنا للاطلاع ضمن سجلّ الطالب
    loadSunnahExamRows(sec.id),
    prisma.sunnahRecitation.findMany({
      where: { section: sec.id },
      include: { examiner: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    workDatesThisWeek(),
  ]);
  // تنبيها «5 أحاديث اليوم» و«سمّع يوميًا هذا الأسبوع» يعدّان التسميع في المناهج الثلاثة
  const dates = [...new Set([...weekDates, today()])];
  const dayRows = await prisma.sunnahRecitation.groupBy({ by: ["studentId", "date"], where: { date: { in: dates } }, _count: { _all: true } });
  const dayCounts: Record<string, Record<string, number>> = {};
  for (const r of dayRows) (dayCounts[r.studentId] ??= {})[r.date] = r._count._all;

  const canLocal = role === "SUNNAH_EXAMINER" || role === "DIRECTOR";

  return (
    <>
      <PageHeader
        title={sec.label}
        subtitle="تسميع بالأرقام ← سبر المرحلة ← سبر المستوى المحلي (النجاح من 80) — وسبر ترشيح الأوقاف في شاشته."
        action={
          <Link href="/exams/sunnah" style={{ fontSize: 13, color: "var(--ink-2)" }}>
            {role === "SUNNAH_EXAMINER" ? "← رجوع إلى السبر المحلي" : "← رجوع إلى سبر السنة النبوية"}
          </Link>
        }
      />
      <SunnahClient
        section={sec.id}
        students={students}
        weekDates={weekDates}
        today={today()}
        dayCounts={dayCounts}
        exams={exams}
        recitations={recs.map((r) => ({
          id: r.id,
          studentId: r.studentId,
          section: r.section,
          book: r.book,
          fromNo: r.fromNo,
          toNo: r.toNo,
          grade: r.grade,
          date: r.date,
          createdAt: r.createdAt.toISOString(),
          notes: r.notes,
          examinerId: r.examinerId,
          examinerName: r.examiner.name,
        }))}
        canRecite={canLocal}
        canLocal={canLocal}
        isDirector={role === "DIRECTOR"}
        canDeleteAny={role === "DIRECTOR" || role === "ADMIN"}
        currentUserId={session.userId}
      />
    </>
  );
}
