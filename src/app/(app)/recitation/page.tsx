import { parsePastItems } from "@/lib/pastRecitation";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import { today, isValidDate, dayLockReason, rotationSlot, timeRangeLabel, formatDateAr } from "@/lib/daily";
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
  const halqa = halaqat.find((h) => h.id === sp.halqa) ?? halaqat[0] ?? null;
  const lock = await dayLockReason(date);

  const students = halqa
    ? await prisma.student.findMany({ where: { halqaId: halqa.id }, orderBy: { studentNo: "asc" } })
    : [];

  const saved = halqa ? await prisma.recitation.findMany({ where: { halqaId: halqa.id, date } }) : [];
  const savedMap = Object.fromEntries(saved.map((r) => [r.studentId, r]));

  // حقل «تسميع جديد — من» يُملأ تلقائيًا من أعلى صفحة جديدة سُمِّعت من قبل لكل طالب — ولا يجوز
  // النزول عنها لاحقًا (لا يُعاد تسميع صفحة سُمِّعت جديدًا من قبل). الماضي بالأجزاء والأحزاب، مراجعة حرّة.
  const studentIds = students.map((s) => s.id);
  const maxNewToRows = await prisma.recitation.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds }, date: { lt: date }, none: false, noNew: false },
    _max: { newTo: true },
  });
  // طلاب القراءة العربية الناجحون في المرحلة 6 يسمّعون «بينة للناس» بالسور
  const stage6 = halqa?.track === "ARABIC" ? await passedArabicStage6(studentIds) : new Set<string>();
  const maxNewToMap = Object.fromEntries(maxNewToRows.map((r) => [r.studentId, r._max.newTo]));
  const lastPages: Record<string, { newTo: number | null }> = {};
  for (const st of students) {
    lastPages[st.id] = { newTo: maxNewToMap[st.id] ?? null };
  }

  const slot = halqa ? rotationSlot(halqa.cohort, date) : null;
  const dutyNote = slot
    ? `فوج ${halqa!.cohort.name} — النظام حسب أن هذا الأسبوع دوام الوقت ${timeRangeLabel(slot.start, slot.end)}، وعرض طلابه.`
    : "";

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
        activeHalqaId={halqa?.id ?? ""}
        date={date}
        lockReason={lock}
        dutyNote={dutyNote}
      />
      {!lock && halqa && (
        <RecitationClient
          key={halqa.id + date}
          halqaId={halqa.id}
          track={halqa.track}
          date={date}
          students={students.map((s) => ({
            id: s.id,
            no: s.studentNo,
            name: s.name,
            mode: recitationMode(halqa.track, stage6.has(s.id)),
            saved: savedMap[s.id]
              ? {
                  none: savedMap[s.id].none,
                  noNew: savedMap[s.id].noNew,
                  noPast: savedMap[s.id].noPast,
                  nf: savedMap[s.id].newFrom?.toString() ?? "",
                  nt: savedMap[s.id].newTo?.toString() ?? "",
                  gradeNew: savedMap[s.id].gradeNew ?? "",
                  past: parsePastItems(savedMap[s.id].pastItems).map((p) => ({ kind: p.kind, juz: String(p.juz), grade: p.grade })),
                  surahs: savedMap[s.id].surahs.join("|"),
                }
              : null,
            lastNewTo: lastPages[s.id]?.newTo ?? null,
            // «ملاحظة الطالب» للمدرّس وحده — لا تُرسَل للمدير
            note: isDirector ? null : (s.teacherNote ?? ""),
          }))}
          alreadyUploaded={saved.length > 0}
        />
      )}
      {!lock && !halqa && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          {isDirector ? "لا توجد حلقات بعد — أنشئ حلقة أولًا." : "لا توجد حلقة مُسندة إليك بعد — راجع الإدارة."}
        </div>
      )}
    </>
  );
}
