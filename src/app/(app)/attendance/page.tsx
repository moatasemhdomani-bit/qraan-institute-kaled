import { redirect } from "next/navigation";
import type { Halqa, Cohort } from "@prisma/client";
import { defaultHalqa } from "@/lib/cohortNow";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import { today, isValidDate, dayLockReason, rotationSlot, timeRangeLabel, formatDateAr } from "@/lib/daily";
import PageHeader from "@/components/PageHeader";
import DailyShell from "@/components/DailyShell";
import AttendanceClient from "./AttendanceClient";

export default async function AttendancePage({
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
  const halqaName: Record<string, string> = Object.fromEntries(halaqat.map((h) => [h.id, h.name + " · فوج " + h.cohort.name]));
  const order = new Map(halaqat.map((h, i) => [h.id, i]));
  const allStudents = all
    ? (await prisma.student.findMany({ where: { halqaId: { in: halaqat.map((h) => h.id) } }, orderBy: { studentNo: "asc" } })).sort(
        (x, y) => (order.get(x.halqaId ?? "") ?? 0) - (order.get(y.halqaId ?? "") ?? 0)
      )
    : [];
  const allSaved = all ? await prisma.attendance.findMany({ where: { halqaId: { in: halaqat.map((h) => h.id) }, date } }) : [];

  return (
    <>
      <PageHeader
        title="الحضور اليومي"
        subtitle={
          (isDirector ? `${halqa?.name ?? "الحلقات"} ليوم ` : "حلقتك ليوم ") +
          formatDateAr(date) +
          " — سجّل الجميع ثم ارفع دفعة واحدة."
        }
      />
      <DailyShell
        basePath="/attendance"
        halaqat={halaqat.map((h) => ({ id: h.id, name: h.name }))}
        activeHalqaId={all ? "all" : (halqa?.id ?? "")}
        allOption={!isDirector && halaqat.length > 1}
        date={date}
        lockReason={lock}
        dutyNote={all || !halqa ? "" : dutyNoteFor(halqa, date)}
      />
      {!lock && all && (
        <>
          {halaqat.map((h) => dutyNoteFor(h, date)).filter(Boolean).map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--ink-2)" }}>⦿ {n}</div>
          ))}
          {/* كل الحلقات في قائمة واحدة ورفع واحد — لا يُرفع حتى يُسجَّل حضور كل الطلاب */}
          <AttendanceClient
            key={"all" + date}
            halqaId={halaqat.map((h) => h.id)}
            date={date}
            students={allStudents.map((st) => ({ id: st.id, no: st.studentNo, name: st.name, group: halqaName[st.halqaId ?? ""] ?? "" }))}
            saved={Object.fromEntries(allSaved.map((x) => [x.studentId, x.status as string]))}
            alreadyUploaded={allSaved.length > 0}
          />
        </>
      )}
      {!lock && !all && halqa && <HalqaAttendance halqa={halqa} date={date} isDirector={isDirector} userId={session.userId} />}
      {!lock && !halqa && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>
          {isDirector ? "لا توجد حلقات بعد — أنشئ حلقة أولًا." : "لا توجد حلقة مُسندة إليك بعد — راجع الإدارة."}
        </div>
      )}
    </>
  );
}


/** حلقة واحدة: بياناتها اليوم وشاشة الحضور لها */
async function HalqaAttendance({
  halqa,
  date,
  isDirector,
  userId,
  showDuty = false,
}: {
  halqa: Halqa & { cohort: Cohort };
  date: string;
  isDirector: boolean;
  userId: string;
  showDuty?: boolean;
}) {
  const session = { userId };
  const students = halqa
    ? await prisma.student.findMany({ where: { halqaId: halqa.id }, orderBy: { studentNo: "asc" } })
    : [];

  const saved = halqa
    ? await prisma.attendance.findMany({ where: { halqaId: halqa.id, date } })
    : [];
  const savedMap = Object.fromEntries(saved.map((a) => [a.studentId, a.status as string]));
  const duty = showDuty ? dutyNoteFor(halqa, date) : "";
  return (
    <>
      {duty && <div style={{ fontSize: 12, color: "var(--ink-2)" }}>⦿ {duty}</div>}
          <AttendanceClient
            key={halqa.id + date}
            halqaId={halqa.id}
            date={date}
            students={students.map((s) => ({ id: s.id, no: s.studentNo, name: s.name }))}
            saved={savedMap}
            alreadyUploaded={saved.length > 0}
          />
    </>
  );
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
