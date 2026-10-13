import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { cardStyle } from "@/lib/ui";
import { SUNNAH_SECTIONS, sunnahSlug } from "@/lib/sunnah";
import PageHeader from "@/components/PageHeader";

/** سبر السنة النبوية عند الإدارة: يختار أحد المناهج الثلاثة. مختبر الحديث يرى كل منهج في واجهة مستقلة من القائمة. */
export default async function SunnahHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const examiner = session.role === "SUNNAH_EXAMINER";
  if (!examiner && session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <PageHeader
        title={examiner ? "سبر محلي" : "سبر السنة النبوية"}
        subtitle={
          examiner
            ? "اختاروا المنهج: تسميع الأحاديث، وسبر المراحل، وسبر المستوى المحلي."
            : "اختاروا المنهج — سبر الأوقاف وقائمة الجاهزين له في «سبر الأوقاف والشهادات»."
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {SUNNAH_SECTIONS.map((s) => (
          <Link key={s.id} href={`/exams/sunnah/${sunnahSlug(s.id)}`} style={{ ...cardStyle, textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{s.label}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{s.branches.length} مستويات</div>
          </Link>
        ))}
        {/* سبر ترشيح الأوقاف: لمختبر الحديث من القائمة، وللمدير من هنا */}
        {session.role === "DIRECTOR" && (
          <Link href="/exams/sunnah/nomination" style={{ ...cardStyle, textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>سبر ترشيح الأوقاف</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>لمن نجح في السبر المحلي لمستوى</div>
          </Link>
        )}
      </div>
    </>
  );
}
