import { redirect } from "next/navigation";

/** «تقرير طالب» انتقل إلى «مركز التقارير» عند المدرّس */
export default function TeacherStudentReportPage() {
  redirect("/monthly-report?type=student");
}
