import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadReviewInputs } from "@/lib/reports";
import { listCommitmentTeachers } from "@/lib/teacherCommitment";
import PageHeader from "@/components/PageHeader";
import TeacherCommitmentClient from "./TeacherCommitmentClient";

/** «التزام المدرّسين بالموقع»: لمدرّس أو أكثر أو الكل — حالة رفع الحضور والتسميع في كل يوم دوام من الفترة. */
export default async function TeacherCommitmentPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const { review } = await searchParams;
  const [teachers, initial] = await Promise.all([listCommitmentTeachers(), loadReviewInputs(review, "TEACHER_COMMITMENT")]);

  return (
    <>
      <PageHeader
        title="التزام المدرّسين بالموقع"
        subtitle="لمدرّس أو أكثر أو الكل: صف لكل حلقة وعمود لكل يوم دوام، وفي الخانة رفع الحضور وحالة التسميع — ثم إجمالي كل حالة."
      />
      <TeacherCommitmentClient key={review ?? "new"} teachers={teachers} initial={initial} />
    </>
  );
}
