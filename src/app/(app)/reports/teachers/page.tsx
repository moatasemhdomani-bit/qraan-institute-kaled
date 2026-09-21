import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import TeachersReportClient from "./TeachersReportClient";

export default async function TeachersReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <PageHeader title="التقرير الشهري للمدرسين" subtitle="صف واحد لكل مدرّس بأرقام الفترة المختارة — النطاق حرّ لا شهر مقفل." />
      <TeachersReportClient />
    </>
  );
}
