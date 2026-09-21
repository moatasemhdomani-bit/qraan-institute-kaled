import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, isValidDate, dayLockReason, rotationSlot, timeRangeLabel, formatDateAr } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import DailyShell from "@/components/DailyShell";
import RecitationClient from "./RecitationClient";

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
    where: isDirector ? {} : { teacherId: session.userId },
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
  // النزول عنها لاحقًا (لا يُعاد تسميع صفحة سُمِّعت جديدًا من قبل). أمّا «آخر ماضي» فمعلومة إرشادية
  // فقط — الماضي مراجعة، لا يُشترط أن يكمل من حيث انتهى.
  const studentIds = students.map((s) => s.id);
  const [maxNewToRows, lastPastRows] = await Promise.all([
    prisma.recitation.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, date: { lt: date }, none: false, noNew: false },
      _max: { newTo: true },
    }),
    prisma.recitation.findMany({
      where: { studentId: { in: studentIds }, date: { lt: date }, none: false, noPast: false },
      orderBy: { date: "desc" },
      distinct: ["studentId"],
      select: { studentId: true, pastTo: true },
    }),
  ]);
  const maxNewToMap = Object.fromEntries(maxNewToRows.map((r) => [r.studentId, r._max.newTo]));
  const lastPastMap = Object.fromEntries(lastPastRows.map((r) => [r.studentId, r.pastTo]));
  const lastPages: Record<string, { newTo: number | null; pastTo: number | null }> = {};
  for (const st of students) {
    lastPages[st.id] = { newTo: maxNewToMap[st.id] ?? null, pastTo: lastPastMap[st.id] ?? null };
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
          " — جديدًا وماضيًا."
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
          date={date}
          students={students.map((s) => ({
            id: s.id,
            no: s.studentNo,
            name: s.name,
            saved: savedMap[s.id]
              ? {
                  none: savedMap[s.id].none,
                  noNew: savedMap[s.id].noNew,
                  noPast: savedMap[s.id].noPast,
                  nf: savedMap[s.id].newFrom?.toString() ?? "",
                  nt: savedMap[s.id].newTo?.toString() ?? "",
                  rf: savedMap[s.id].pastFrom?.toString() ?? "",
                  rt: savedMap[s.id].pastTo?.toString() ?? "",
                  gradeNew: savedMap[s.id].gradeNew ?? "",
                  gradePast: savedMap[s.id].gradePast ?? "",
                }
              : null,
            lastNewTo: lastPages[s.id]?.newTo ?? null,
            lastPastTo: lastPages[s.id]?.pastTo ?? null,
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
