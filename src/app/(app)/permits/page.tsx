import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import PermitsClient from "./PermitsClient";

export default async function PermitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER" && session.role !== "ADMIN" && session.role !== "DIRECTOR") redirect("/dashboard");

  const staffWide = session.role === "ADMIN" || session.role === "DIRECTOR";

  const [halaqatRaw, permitsRaw, workRow] = await Promise.all([
    prisma.halqa.findMany({
      where: staffWide ? {} : { teacherId: session.userId, ...cohortScope(session) },
      include: {
        teacher: { select: { name: true } },
        cohort: { select: { name: true } },
        students: { orderBy: { studentNo: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permit.findMany({
      where: staffWide ? {} : { student: { halqa: { teacherId: session.userId, ...cohortScope(session) } } },
      include: { setBy: { select: { name: true } } },
    }),
    prisma.workingDays.findUnique({ where: { id: 1 } }),
  ]);
  // أيام الدوام الرسمية — يُختار منها «أيام الإذن»
  let workDays: string[] = [];
  try {
    workDays = workRow ? JSON.parse(workRow.days) : [];
  } catch {
    workDays = [];
  }

  const permitsByStudent: Record<string, ReturnType<typeof mapPermit>[]> = {};
  function mapPermit(p: (typeof permitsRaw)[number]) {
    return {
      id: p.id,
      studentId: p.studentId,
      kind: p.kind,
      time: p.time,
      note: p.note,
      since: p.since,
      days: p.days,
      setByName: p.setBy.name,
    };
  }
  for (const p of permitsRaw) {
    (permitsByStudent[p.studentId] ??= []).push(mapPermit(p));
  }

  const halaqat = halaqatRaw.map((h) => ({
    id: h.id,
    name: h.name,
    teacherName: h.teacher.name,
    cohortName: h.cohort.name,
    students: h.students.map((s) => ({ id: s.id, no: s.studentNo, name: s.name })),
    permits: h.students.flatMap((s) => permitsByStudent[s.id] ?? []),
  }));

  return (
    <>
      <PageHeader title="إذن الطلاب" subtitle="أذونات دخول وخروج دائمة تلازم الطالب حتى تُحذف." />
      {/* المدرّس يشاهد أذونات طلابه فقط — الإضافة والتعديل والحذف للإدارة */}
      <PermitsClient
        scopeNote={staffWide ? "ترى كل الحلقات — يمكنك إضافة إذن لأي طالب في المعهد." : "ترى أذونات طلاب حلقاتك للاطلاع فقط — تضيفها الإدارة."}
        halaqat={halaqat}
        workDays={workDays}
        readOnly={!staffWide}
      />
    </>
  );
}
