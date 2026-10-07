import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * الشاشة الأولى بعد الدخول (ومن أيقونة التطبيق): المدير والإداريون على «شؤون الطلاب»،
 * وبقية الأدوار تحوّلها «لوحة المعلومات» إلى شاشاتها (المدرّس للحضور، ولي الأمر لصفحته، ...).
 */
export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "DIRECTOR" || session.role === "ADMIN") redirect("/students");
  redirect("/dashboard");
}
