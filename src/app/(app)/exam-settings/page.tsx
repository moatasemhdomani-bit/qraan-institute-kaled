import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEvalSettings } from "@/lib/exam";
import PageHeader from "@/components/PageHeader";
import EvalSettingsClient from "./EvalSettingsClient";

export default async function ExamSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const settings = await getEvalSettings();

  return (
    <>
      <PageHeader title="طريقة التقييم" subtitle="إعداد لمرة واحدة: شكل نتيجة تحديد المستوى وترشيح الأوقاف." />
      <EvalSettingsClient placementMode={settings.placementMode} awqafMode={settings.awqafMode} />
    </>
  );
}
