import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { cohortScope } from "@/lib/examinerTrack";
import PageHeader from "@/components/PageHeader";
import TeacherStudentReportClient from "./TeacherStudentReportClient";

/** «تقرير طالب» عند المدرّس: يختار أحد طلابه والفترة ويشاهد التقرير — مشاهدة فقط، بلا إصدار ولا PDF. */
export default async function TeacherStudentReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/dashboard");

  const halaqat = await prisma.halqa.findMany({
    where: { teacherId: session.userId, ...cohortScope(session) },
    include: { students: { orderBy: { studentNo: "asc" }, select: { id: true, name: true, studentNo: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="تقرير طالب" subtitle="اختاروا أحد طلابكم وفترة التقرير — للمشاهدة فقط." />
      <TeacherStudentReportClient
        halaqat={halaqat.map((h) => ({
          id: h.id,
          name: h.name,
          students: h.students.map((s) => ({ id: s.id, name: s.name, no: s.studentNo })),
        }))}
      />
    </>
  );
}
