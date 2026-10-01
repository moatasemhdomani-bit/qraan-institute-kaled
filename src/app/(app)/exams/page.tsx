import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** واجهة السبر عند المدير صارت ضمن «متابعة السبر» (كتسجيل التسميع من «متابعة التسميع»). */
export default async function ExamsHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role === "DIRECTOR" ? "/exam-monitor" : "/dashboard");
}
