import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import PermitsClient from "./PermitsClient";

export default async function PermitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER" && session.role !== "ADMIN" && session.role !== "DIRECTOR") redirect("/dashboard");

  const staffWide = session.role === "ADMIN" || session.role === "DIRECTOR";

  const [halaqatRaw, permitsRaw] = await Promise.all([
    prisma.halqa.findMany({
      where: staffWide ? {} : { teacherId: session.userId },
      include: {
        teacher: { select: { name: true } },
        cohort: { select: { name: true } },
        students: { orderBy: { studentNo: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.permit.findMany({
      where: staffWide ? {} : { student: { halqa: { teacherId: session.userId } } },
      include: { setBy: { select: { name: true } } },
    }),
  ]);

  const permitsByStudent: Record<string, ReturnType<typeof mapPermit>[]> = {};
  function mapPermit(p: (typeof permitsRaw)[number]) {
    return {
      id: p.id,
      studentId: p.studentId,
      kind: p.kind,
      time: p.time,
      note: p.note,
      since: p.since,
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
      <PageHeader title="إذن" subtitle="أذونات دخول وخروج دائمة تلازم الطالب حتى تُحذف." />
      <PermitsClient scopeNote={staffWide ? "ترى كل الحلقات — يمكنك إضافة إذن لأي طالب في المعهد." : "ترى حلقاتك وحدها — الإذن يُضاف لطلابك فقط."} halaqat={halaqat} />
    </>
  );
}
