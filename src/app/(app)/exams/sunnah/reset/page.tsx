import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { cardStyle } from "@/lib/ui";
import { SUNNAH_SECTIONS, sunnahSection } from "@/lib/sunnah";
import { sunnahLevelsFor } from "@/lib/sunnahServer";
import PageHeader from "@/components/PageHeader";
import { loadSunnahStudents } from "../data";
import ResetClient from "./ResetClient";

/**
 * «إعادة ضبط مستوى طالب» (الإدارة): يختار المنهج ثم الطالب، فتُفتح له خيارات الإعداد الأول —
 * الكتاب والمستوى والمرحلة ورقم البداية. سبور الطالب وتسميعه السابقة تبقى في السجل ولا تُحتسب في موقعه.
 */
export default async function SunnahResetPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const sec = sunnahSection((await searchParams).section);
  const back = (
    <Link href={sec ? "/exams/sunnah/reset" : "/exams/sunnah"} style={{ fontSize: 13, color: "var(--ink-2)" }}>
      {sec ? "← اختيار منهج آخر" : "← رجوع إلى سبر السنة النبوية"}
    </Link>
  );

  if (!sec) {
    return (
      <>
        <PageHeader title="إعادة ضبط مستوى طالب" subtitle="اختاروا المنهج الذي تريدون إعادة ضبط مستوى الطالب فيه." action={back} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
          {SUNNAH_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/exams/sunnah/reset?section=${s.id}`}
              style={{ ...cardStyle, padding: "16px 18px", textDecoration: "none", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ fontSize: 17, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{s.branches.length} مستويات</div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const students = await loadSunnahStudents();
  const levels = await sunnahLevelsFor(students.map((s) => s.id));

  return (
    <>
      <PageHeader title={`إعادة ضبط مستوى طالب — ${sec.label}`} subtitle="ابحثوا عن الطالب، ثم اختاروا من أين يبدأ الآن في هذا المنهج." action={back} />
      <ResetClient
        section={sec.id}
        students={students.map((s) => ({
          ...s,
          current: levels[s.id]?.find((l) => l.section === sec.id)?.status ?? "لم يبدأ بعد",
        }))}
      />
    </>
  );
}
