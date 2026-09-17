import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import { cardStyle } from "@/lib/ui";
import Link from "next/link";

const CARDS = [
  { href: "/exams/local", title: "السبر المحلي", note: "غيباً أو حاضراً أو عمّ غيباً — بأرقام الصفحات وعلامة لكل نوع." },
  { href: "/exams/awqaf", title: "ترشيح الأوقاف", note: "حاضرًا أو غيبًا وعدد الأجزاء — يتيح سبر الأوقاف في المرحلة 4." },
  { href: "/exams/placement", title: "تحديد مستوى", note: "لطالب غير مسجَّل بعد — الاسم والجزء الذي يبدأ منه، والنتيجة تذهب إلى الإدارة." },
];

export default async function ExamsHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR") redirect("/dashboard");

  return (
    <>
      <PageHeader title="السبر" subtitle="اختاروا نوع السبر الذي تريدون إجراءه — بصلاحية المختبِر كاملة." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} style={{ ...cardStyle, padding: 18, textDecoration: "none", color: "var(--ink)", display: "block" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{c.note}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
