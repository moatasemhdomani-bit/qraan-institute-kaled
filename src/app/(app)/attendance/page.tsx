import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
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
    where: isDirector ? {} : { teacherId: session.userId },
    include: { cohort: true },
    orderBy: { name: "asc" },
  });

  const halqa = halaqat.find((h) => h.id === sp.halqa) ?? halaqat[0] ?? null;
  const lock = await dayLockReason(date);

  const students = halqa
    ? await prisma.student.findMany({ where: { halqaId: halqa.id }, orderBy: { studentNo: "asc" } })
    : [];

  const saved = halqa
    ? await prisma.attendance.findMany({ where: { halqaId: halqa.id, date } })
    : [];
  const savedMap = Object.fromEntries(saved.map((a) => [a.studentId, a.status as string]));

  const slot = halqa ? rotationSlot(halqa.cohort, date) : null;
  const dutyNote = slot
    ? `فوج ${halqa!.cohort.name} — النظام حسب أن هذا الأسبوع دوام الوقت ${timeRangeLabel(slot.start, slot.end)}، وعرض طلابه.`
    : halqa?.cohort.isRotating
      ? `فوج ${halqa.cohort.name} قلّاب، لكن تاريخ بداية التناوب غير مضبوط — راجع الإدارة.`
      : "";

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
        activeHalqaId={halqa?.id ?? ""}
        date={date}
        lockReason={lock}
        dutyNote={dutyNote}
      />
      {!lock && halqa && (
        <AttendanceClient
          halqaId={halqa.id}
          date={date}
          students={students.map((s) => ({ id: s.id, no: s.studentNo, name: s.name }))}
          saved={savedMap}
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
