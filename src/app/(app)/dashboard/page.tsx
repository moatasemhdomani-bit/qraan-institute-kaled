import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { cardStyle } from "@/lib/ui";
import PageHeader from "@/components/PageHeader";

const QUICK_LINKS: Record<string, { href: string; label: string; note: string }> = {
  users: { href: "/users", label: "إدارة المستخدمين", note: "قائمة العاملين وتسجيل عامل جديد" },
  audit: { href: "/audit", label: "سجل التدقيق", note: "من عدّل ماذا ومتى" },
  monitor: { href: "/monitor", label: "متابعة الحضور", note: "حضور كل الحلقات اليوم" },
  cohorts: { href: "/cohorts", label: "إدارة الأفواج", note: "توقيت الأفواج الخمسة" },
  halaqat: { href: "/halaqat", label: "إدارة الحلقات", note: "إنشاء حلقة وإسناد مدرّسها" },
  schedule: { href: "/schedule", label: "الدوام والعطل", note: "أيام الدوام وقائمة العطل" },
  students: { href: "/students", label: "الطلاب", note: "قائمة الطلاب وفرزهم" },
  "exam-monitor": { href: "/exam-monitor", label: "متابعة السبر", note: "سبورات كل الحلقات، وما لم يُسبَر بعد" },
  "exams-local-view": { href: "/exams/local-view", label: "متابعة السبر المحلي", note: "نتائج السبر المحلي — عرض فقط" },
  "exam-settings": { href: "/exam-settings", label: "طريقة التقييم", note: "شكل نتيجة تحديد المستوى وترشيح الأوقاف" },
};

const SOON_TEXT: Record<string, string> = {
  TEACHER: "حسابك مسجّل ومُسنَد إلى فوج وحلقة. تبدأ لوحتك مع الحضور والتسميع اليومي في المرحلة 2.",
  EXAMINER: "حسابك مسجّل كعامل. تبدأ شاشاتك مع أنواع السبر الثلاثة في المرحلة 3.",
  GUARDIAN: "لا توجد بيانات لعرضها قبل المرحلة 2 — يظهر هنا حضور ابنك وتسميعه.",
};
const SOON_PHASE: Record<string, string> = {
  TEACHER: "يبدأ في المرحلة 2",
  EXAMINER: "يبدأ في المرحلة 3",
  GUARDIAN: "يبدأ في المرحلة 2",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const staffMode = session.role === "DIRECTOR" || session.role === "ADMIN";

  // المدرّس وولي الأمر ومختِبر لهم شاشات فعلية الآن — يُوجَّهون إليها مباشرة
  if (session.role === "TEACHER") redirect("/attendance");
  if (session.role === "GUARDIAN") redirect("/parent");
  if (session.role === "EXAMINER") redirect("/exams/local");

  if (!staffMode) {
    return (
      <>
        <PageHeader title="لوحة التحكم" subtitle="روابط سريعة لما يخص دورك في المرحلة الأولى." />
        <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              margin: "0 auto 16px",
              background: "var(--chip)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            ◔
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 6 }}>لوحتك قيد التجهيز</div>
          <div style={{ color: "var(--ink-2)", fontSize: 14, maxWidth: 440, margin: "0 auto" }}>
            {SOON_TEXT[session.role]}
          </div>
          <div
            style={{
              marginTop: 18,
              display: "inline-flex",
              padding: "7px 14px",
              borderRadius: 999,
              background: "var(--chip)",
              border: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--ink-2)",
            }}
          >
            {SOON_PHASE[session.role]}
          </div>
        </div>
      </>
    );
  }

  const [staffCount, halaqatCount, studentsCount] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER"] } } }),
    prisma.halqa.count(),
    prisma.student.count(),
  ]);

  const stats = [
    { label: "العاملون", value: staffCount, note: "مدير، إداري، مدرّسون، مختبِرون" },
    { label: "الحلقات", value: halaqatCount, note: "كلها مُسندة إلى مدرّس" },
    { label: "الطلاب", value: studentsCount, note: "مفروزون على حلقة وفوج" },
    { label: "الأفواج", value: 5, note: "ثلاثة ثابتة واثنان قلّابان" },
  ];

  const links = session.role === "DIRECTOR" ? Object.values(QUICK_LINKS) : Object.values(QUICK_LINKS);

  const steps = [
    { num: "1", title: "تسجيل العاملين", note: "المدرّسون تحديدًا — يُدخلون كأشخاص في النظام" },
    { num: "2", title: "إنشاء الأفواج", note: "يحتاج مدرّسًا واحدًا مسجّلًا على الأقل" },
    { num: "3", title: "إنشاء الحلقة", note: "تُسند إلى مدرس وفوج مما سبق" },
    { num: "4", title: "تسجيل الطالب", note: "يُفرز لحلقة وفوج جاهزين" },
  ];

  return (
    <>
      <PageHeader title="لوحة التحكم" subtitle="روابط سريعة لما يخص دورك في المرحلة الأولى." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{s.note}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 10 }}>روابط سريعة</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                textAlign: "start",
                padding: 16,
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "var(--card-2-grad)",
                color: "var(--ink)",
                display: "block",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{l.label}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{l.note}</div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "16px 18px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>ترتيب الإعداد الأول</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
          {steps.map((p) => (
            <div
              key={p.num}
              style={{ padding: 12, borderRadius: 11, border: "1px solid var(--line-2)", background: "var(--card-2-grad)" }}
            >
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>{p.num}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{p.note}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
