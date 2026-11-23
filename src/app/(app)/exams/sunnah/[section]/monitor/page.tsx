import { notFound, redirect } from "next/navigation";
import { orphanMark } from "@/lib/orphan";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, isValidDate } from "@/lib/daily";
import { sunnahSectionFromSlug, sunnahSlug, SUNNAH_REPEAT_GRADE } from "@/lib/sunnah";
import PageHeader from "@/components/PageHeader";
import HadithMonitorClient from "./HadithMonitorClient";
import { sunnahPlacesFor } from "@/lib/sunnahServer";

/**
 * متابعة تسميع الحديث الشريف: كل الطلاب النشطين، ومن سمّع منهم ومن لم يسمّع في فترة (من تاريخ إلى تاريخ)،
 * مع فلترة الفوج والحلقة والمدرّس. لمختبر السنة والإداري ومدير المعهد.
 */
export default async function SunnahMonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.role;
  if (role !== "SUNNAH_EXAMINER" && role !== "DIRECTOR" && role !== "ADMIN") redirect("/dashboard");
  const sec = sunnahSectionFromSlug((await params).section);
  if (!sec || sec.id !== "HADITH") notFound();

  const sp = await searchParams;
  const t = today();
  let from = sp.from && isValidDate(sp.from) ? sp.from : t;
  let to = sp.to && isValidDate(sp.to) ? sp.to : t;
  if (from > to) [from, to] = [to, from];

  const [students, recs] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        studentNo: true,
        isOrphan: true,
        photoUrl: true,
        guardianPhone: true,
        guardianPhone2: true,
        halqa: { select: { id: true, name: true, cohort: { select: { name: true } }, teacher: { select: { name: true } } } },
      },
      orderBy: { studentNo: "asc" },
    }),
    prisma.sunnahRecitation.findMany({
      where: { section: "HADITH", date: { gte: from, lte: to } },
      select: { studentId: true, fromNo: true, toNo: true, grade: true, date: true },
    }),
  ]);

  // لكل طالب: عدد مرات التسميع، والأحاديث الناجحة، ومرات «إعادة»، وآخر تاريخ تسميع في الفترة
  const agg: Record<string, { times: number; hadiths: number; repeats: number; last: string }> = {};
  for (const r of recs) {
    const a = (agg[r.studentId] ??= { times: 0, hadiths: 0, repeats: 0, last: "" });
    a.times++;
    if (r.grade === SUNNAH_REPEAT_GRADE) a.repeats++;
    else a.hadiths += Math.max(0, r.toNo - r.fromNo + 1);
    if (r.date > a.last) a.last = r.date;
  }

  // مستوى كل طالب في الحديث وقسمه ومرحلته — للفلترة
  const places = await sunnahPlacesFor(students.map((s) => s.id), "HADITH");
  const rows = students.map((s) => ({
    id: s.id,
    name: orphanMark(s.name, s.isOrphan),
    no: s.studentNo,
    photoUrl: s.photoUrl,
    // رقم التواصل: رقم ولي الأمر (والثاني إن وُجد)
    phones: [s.guardianPhone, s.guardianPhone2].filter((p): p is string => !!p && !!p.trim()),
    halqaId: s.halqa?.id ?? "",
    halqaName: s.halqa?.name ?? "بلا حلقة",
    cohortName: s.halqa?.cohort.name ?? "—",
    teacherName: s.halqa?.teacher.name ?? "—",
    times: agg[s.id]?.times ?? 0,
    hadiths: agg[s.id]?.hadiths ?? 0,
    repeats: agg[s.id]?.repeats ?? 0,
    last: agg[s.id]?.last ?? "",
    place: places[s.id],
  }));

  return (
    <>
      <PageHeader
        title="متابعة التسميع — الحديث الشريف"
        subtitle="من سمّع ومن لم يسمّع من الطلاب النشطين في الفترة المختارة."
        action={
          <Link href={`/exams/sunnah/${sunnahSlug(sec.id)}`} style={{ fontSize: 13, color: "var(--ink-2)" }}>
            ← رجوع إلى الحديث الشريف
          </Link>
        }
      />
      <HadithMonitorClient rows={rows} from={from} to={to} basePath={`/exams/sunnah/${sunnahSlug(sec.id)}/monitor`} />
    </>
  );
}
