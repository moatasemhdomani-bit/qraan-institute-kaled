import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { cardStyle } from "@/lib/ui";
import { SUNNAH_SECTIONS, sunnahSlug, sunnahSectionFromSlug } from "@/lib/sunnah";
import PageHeader from "@/components/PageHeader";
import NominationClient from "./NominationClient";
import { loadSunnahExamRows, loadSunnahStudents } from "../data";

/**
 * سبر ترشيح الأوقاف في السنة النبوية — لمختبر الحديث (والمدير): يختار المنهج أولًا (الحديث الشريف / الشمائل / السيرة)،
 * ثم يرى المؤهَّلين فيه (من نجح في السبر المحلي لمستوى). الناجح يُرفع إلى قائمة الجاهزين لسبر الأوقاف عند الإدارة.
 */
export default async function SunnahNominationPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUNNAH_EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const sec = sunnahSectionFromSlug((await searchParams).section ?? "");

  // بلا منهج: بطاقات المناهج الثلاثة
  if (!sec) {
    return (
      <>
        <PageHeader
          title="سبر ترشيح الأوقاف"
          subtitle="اختاروا المنهج — لمن نجح في السبر المحلي لمستوى، والناجح (من 80) يُرفع إلى قائمة الجاهزين لسبر الأوقاف."
          action={
            session.role === "DIRECTOR" ? (
              <Link href="/exams/sunnah" style={{ fontSize: 13, color: "var(--ink-2)" }}>
                ← رجوع إلى سبر السنة النبوية
              </Link>
            ) : undefined
          }
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
          {SUNNAH_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/exams/sunnah/nomination?section=${sunnahSlug(s.id)}`}
              style={{ ...cardStyle, padding: "16px 18px", textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ fontSize: 17, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>سبر ترشيح الأوقاف</div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const [students, exams] = await Promise.all([loadSunnahStudents(), loadSunnahExamRows(sec.id, ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_STAGE", "SUNNAH_PART"])]);

  return (
    <>
      <PageHeader
        title={`سبر ترشيح الأوقاف — ${sec.label}`}
        subtitle="لمن نجح في السبر المحلي لمستوى — الناجح (من 80) يُرفع إلى قائمة الجاهزين لسبر الأوقاف."
        action={
          <Link href="/exams/sunnah/nomination" style={{ fontSize: 13, color: "var(--ink-2)" }}>
            ← رجوع إلى المناهج
          </Link>
        }
      />
      <NominationClient students={students} exams={exams} isDirector={session.role === "DIRECTOR"} currentUserId={session.userId} />
    </>
  );
}
