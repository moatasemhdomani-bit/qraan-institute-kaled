import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { cardStyle } from "@/lib/ui";
import { formatDateAr } from "@/lib/daily";
import Link from "next/link";
import ReportsHubClient from "./ReportsHubClient";

const CARDS = [
  { href: "/reports/halaqat", title: "تقرير تسميع الحلقات", note: "بلوك لكل حلقة باسمها واسم أستاذها، ثم صف لكل طالب بأرقام الفترة كاملة." },
  { href: "/reports/teachers", title: "التقرير الشهري للمدرسين", note: "صف واحد لكل مدرّس بأرقام الفترة المختارة — النطاق حرّ لا شهر مقفل." },
  { href: "/reports/student", title: "تقرير طالب", note: "حضوره وتسميعه واختباراته الثلاثة وسلوكه — يُفتح أيضًا من ملف الطالب." },
  { href: "/reports/awqaf-marks", title: "علامات سبر الأوقاف", note: "لدفعة سُجّلت علاماتها: الطالب ورقمه ونوع سبره ومدرّسه وحلقته وفوجه." },
];

const KIND_LABELS: Record<string, string> = { HALAQAT: "تسميع الحلقات", TEACHERS: "الشهري للمدرسين", STUDENT: "تقرير طالب", AWQAF_MARKS: "علامات سبر الأوقاف" };

export default async function ReportsHubPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN") redirect("/dashboard");

  const issuedRaw = await prisma.issuedReport.findMany({
    include: { issuedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const issued = issuedRaw.map((r) => ({
    id: r.id,
    kind: r.kind,
    kindLabel: KIND_LABELS[r.kind] ?? r.kind,
    name: r.name,
    range: `${formatDateAr(r.fromDate)} — ${formatDateAr(r.toDate)}`,
    at: formatDateAr(r.createdAt.toISOString().slice(0, 10)),
    by: r.issuedBy.name,
  }));

  return (
    <>
      <PageHeader title="مركز التقارير" subtitle="تقارير يُصدرها الإداري من واجهة واحدة، جاهزة للطباعة والمشاركة." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, marginBottom: 22 }}>
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} style={{ ...cardStyle, padding: 18, textDecoration: "none", color: "var(--ink)", display: "block" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{c.note}</div>
          </Link>
        ))}
      </div>
      <ReportsHubClient issued={issued} isDirector={session.role === "DIRECTOR"} />
    </>
  );
}
