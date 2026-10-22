import { parsePastItems } from "@/lib/pastRecitation";
import { logAction } from "@/lib/audit";
import { defaultHalqa } from "@/lib/cohortNow";
import { redirect } from "next/navigation";
import type { Halqa, Cohort } from "@prisma/client";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import { today, isValidDate, dayLockReason, rotationSlot, timeRangeLabel, formatDateAr, REPEAT_GRADE } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import DailyShell from "@/components/DailyShell";
import RecitationClient from "./RecitationClient";
import { recitationMode, TRACK_LABELS } from "@/lib/track";
import { passedArabicStage6 } from "@/lib/arabicProgress";

export default async function RecitationPage({
  searchParams,
}: {
  searchParams: Promise<{ halqa?: string; date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isDirector = session.role === "DIRECTOR";
  if (session.role !== "TEACHER" && !isDirector) redirect("/dashboard");

  const sp = await searchParams;
  const date = sp.date && isValidDate(sp.date) ? sp.date : today();

  const halaqat = await prisma.halqa.findMany({
    where: isDirector ? {} : { teacherId: session.userId, ...cohortScope(session) },
    include: { cohort: true },
    orderBy: { name: "asc" },
  });
  // بلا اختيار: حلقة الفوج الجاري الآن (أو الذي بدأ دوامه آخرًا)
  const halqa = halaqat.find((h) => h.id === sp.halqa) ?? defaultHalqa(halaqat);
  const lock = await dayLockReason(date);
  // «كل الحلقات» (للمدرّس صاحب أكثر من حلقة): حلقاته كلها متتالية في الشاشة نفسها
  const all = !isDirector && sp.halqa === "all" && halaqat.length > 1;

  return (
    <>
      <PageHeader
        title="التسميع اليومي"
        subtitle={
          (isDirector ? `ما سمّعه طلاب ${halqa?.name ?? "الحلقة"} يوم ` : "ما سمّعه طلابك يوم ") +
          formatDateAr(date) +
          (halqa && halqa.track !== "QURAN" && halqa.track !== "QURAN_GHAIB" ? ` — ${TRACK_LABELS[halqa.track]}.` : " — جديدًا وماضيًا.")
        }
      />
      <DailyShell
        basePath="/recitation"
        halaqat={halaqat.map((h) => ({ id: h.id, name: h.name }))}
        activeHalqaId={all ? "all" : (halqa?.id ?? "")}
        allOption={!isDirector && halaqat.length > 1}
        date={date}
        lockReason={lock}
        dutyNote={all || !halqa ? "" : dutyNoteFor(halqa, date)}
      />
      {!lock && all && <AllRecitation halaqat={halaqat} date={date} userId={session.userId} />}
      {!lock && !all && halqa && <HalqaRecitation halqa={halqa} date={date} isDirector={isDirector} userId={session.userId} />}
      {!lock && !halqa && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          {isDirector ? "لا توجد حلقات بعد — أنشئ حلقة أولًا." : "لا توجد حلقة مُسندة إليك بعد — راجع الإدارة."}
        </div>
      )}
    </>
  );
}


/** حلقة واحدة: شاشة التسميع لها */
async function HalqaRecitation({ halqa, date, isDirector, userId }: { halqa: Halqa & { cohort: Cohort }; date: string; isDirector: boolean; userId: string }) {
  const { rows, savedCount } = await recitationRows(halqa, date, isDirector, userId);
  return <RecitationClient key={halqa.id + date} halqaId={halqa.id} track={halqa.track} date={date} students={rows} alreadyUploaded={savedCount > 0} />;
}

/** «كل الحلقات»: طلاب حلقات المدرّس كلها في قائمة واحدة وعدّاد واحد — لكل طالب حلقته ومستواها */
async function AllRecitation({ halaqat, date, userId }: { halaqat: (Halqa & { cohort: Cohort })[]; date: string; userId: string }) {
  const parts = await Promise.all(halaqat.map((h) => recitationRows(h, date, false, userId)));
  const rows = parts.flatMap((p, i) =>
    p.rows.map((r) => ({ ...r, halqaId: halaqat[i].id, track: halaqat[i].track, group: `${halaqat[i].name} · فوج ${halaqat[i].cohort.name}` }))
  );
  const notes = halaqat.map((h) => dutyNoteFor(h, date)).filter(Boolean);
  return (
    <>
      {notes.map((n, i) => (
        <div key={i} style={{ fontSize: 12, color: "var(--ink-2)" }}>⦿ {n}</div>
      ))}
      <RecitationClient key={"all" + date} halqaId={halaqat[0].id} track={halaqat[0].track} date={date} students={rows} alreadyUploaded={parts.some((p) => p.savedCount > 0)} />
    </>
  );
}

/** بيانات تسميع طلاب حلقة في يوم */
async function recitationRows(halqa: Halqa & { cohort: Cohort }, date: string, isDirector: boolean, userId: string) {
  const session = { userId };
  const students = halqa
    ? await prisma.student.findMany({ where: { halqaId: halqa.id }, orderBy: { studentNo: "asc" } })
    : [];

  // الغائب أو المأذون في الحضور اليومي: يُحفظ له تلقائيًا «لم يسمّع اليوم» (ما لم يُسجَّل له تسميع) — يعدّله المدرّس إن شاء
  if (halqa) {
    const away = await prisma.attendance.findMany({
      where: { halqaId: halqa.id, date, status: { in: ["ABSENT", "EXCUSED"] }, studentId: { in: students.map((st) => st.id) } },
      select: { studentId: true },
    });
    if (away.length) {
      const made = await prisma.recitation.createMany({
        data: away.map((a) => ({ date, none: true, studentId: a.studentId, halqaId: halqa.id, recordedById: session.userId })),
        skipDuplicates: true,
      });
      if (made.count) await logAction(session.userId, `حفظ تلقائي «لم يسمّع اليوم» لـ${made.count} طالبًا غائبًا أو مأذونًا — ${halqa.name} ${date}`);
    }
  }
  const saved = halqa ? await prisma.recitation.findMany({ where: { halqaId: halqa.id, date } }) : [];
  const savedMap = Object.fromEntries(saved.map((r) => [r.studentId, r]));

  // حقل «من صفحة» يُملأ تلقائيًا بعد أعلى صفحة سُمِّعت من قبل لكل طالب — والتسميع المقدَّر «إعادة» لا يُحرّك
  // هذا العدّاد، ولا الصفحة الواحدة التي لم تتم («أنهى الصفحة»). يجوز تعديل الحقل وتسميع صفحة سابقة. الماضي بالأجزاء والأحزاب.
  const studentIds = students.map((s) => s.id);
  const maxNewToRows = await prisma.recitation.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds }, date: { lt: date }, none: false, noNew: false, NOT: { gradeNew: REPEAT_GRADE }, OR: [{ pageDone: null }, { pageDone: true }] },
    _max: { newTo: true },
  });
  // طلاب القراءة العربية الناجحون في المرحلة 6 يسمّعون «بينة للناس» بالسور
  const stage6 = halqa?.track === "ARABIC" ? await passedArabicStage6(studentIds) : new Set<string>();
  const maxNewToMap = Object.fromEntries(maxNewToRows.map((r) => [r.studentId, r._max.newTo]));
  // التسميع بالسور: السور التي أنهاها الطالب قبل هذا اليوم — تظهر بلون باهت ويجوز إعادة تسميعها
  const surahRows = halqa && (halqa.track === "AMMA" || stage6.size > 0)
    ? await prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { lt: date }, none: false }, select: { studentId: true, surahsDone: true } })
    : [];
  const surahsBefore: Record<string, string[]> = {};
  for (const r of surahRows) surahsBefore[r.studentId] = [...new Set([...(surahsBefore[r.studentId] ?? []), ...r.surahsDone])];
  const lastPages: Record<string, { newTo: number | null }> = {};
  for (const st of students) {
    lastPages[st.id] = { newTo: maxNewToMap[st.id] ?? null };
  }
  const rows = students.map((s) => ({
              id: s.id,
              no: s.studentNo,
              name: s.name,
              mode: recitationMode(halqa.track, stage6.has(s.id)),
              saved: savedMap[s.id]
                ? {
                    none: savedMap[s.id].none,
                    noNew: savedMap[s.id].noNew,
                    examPrep: savedMap[s.id].examPrep,
                    noPast: savedMap[s.id].noPast,
                    nf: savedMap[s.id].newFrom?.toString() ?? "",
                    nt: savedMap[s.id].newTo?.toString() ?? "",
                    gradeNew: savedMap[s.id].gradeNew ?? "",
                    pageDone: savedMap[s.id].pageDone === true,
                    past: parsePastItems(savedMap[s.id].pastItems).map((p) => ({ kind: p.kind, juz: String(p.juz), grade: p.grade })),
                    surahs: savedMap[s.id].surahs.join("|"),
                    surahsDone: savedMap[s.id].surahsDone.join("|"),
                  }
                : null,
              lastNewTo: lastPages[s.id]?.newTo ?? null,
              surahsBefore: surahsBefore[s.id] ?? [],
              // «ملاحظة الطالب» للمدرّس وحده — لا تُرسَل للمدير
              note: isDirector ? null : (s.teacherNote ?? ""),
            }));
  return { rows, savedCount: saved.length };
}

/** ملاحظة دوام الفوج القلّاب لهذا الأسبوع */
function dutyNoteFor(halqa: Halqa & { cohort: Cohort }, date: string): string {
  const slot = rotationSlot(halqa.cohort, date);
  return slot
    ? `فوج ${halqa.cohort.name} — النظام حسب أن هذا الأسبوع دوام الوقت ${timeRangeLabel(slot.start, slot.end)}، وعرض طلابه.`
    : halqa.cohort.isRotating
      ? `فوج ${halqa.cohort.name} قلّاب، لكن تاريخ بداية التناوب غير مضبوط — راجع الإدارة.`
      : "";
}
