import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/PageHeader";
import NominationClient from "./NominationClient";
import { loadSunnahExamRows, loadSunnahStudents } from "../data";

/**
 * سبر ترشيح الأوقاف في السنة النبوية — شاشة مستقلة لمختبر الحديث (والمدير): لمن نجح في السبر المحلي لمستوى،
 * والناجح فيه يُرفع إلى قائمة الجاهزين لسبر الأوقاف عند الإدارة.
 */
export default async function SunnahNominationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUNNAH_EXAMINER" && session.role !== "DIRECTOR") redirect("/dashboard");

  const [students, exams] = await Promise.all([loadSunnahStudents(), loadSunnahExamRows(undefined, ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_STAGE"])]);

  return (
    <>
      <PageHeader
        title="سبر ترشيح الأوقاف — السنة النبوية"
        subtitle="لمن نجح في السبر المحلي لمستوى — الناجح (من 80) يُرفع إلى قائمة الجاهزين لسبر الأوقاف."
        action={
          session.role === "DIRECTOR" ? (
            <Link href="/exams/sunnah" style={{ fontSize: 13, color: "var(--ink-2)" }}>
              ← رجوع إلى سبر السنة النبوية
            </Link>
          ) : undefined
        }
      />
      <NominationClient
        students={students}
        exams={exams}
        isDirector={session.role === "DIRECTOR"}
        currentUserId={session.userId}
      />
    </>
  );
}
