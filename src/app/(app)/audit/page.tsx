import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import AuditClient from "./AuditClient";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR") redirect("/dashboard");

  const [rows, students, examiners] = await Promise.all([
    prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.student.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "EXAMINER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const audit = rows.map((r) => ({
    id: r.id,
    who: r.actor.name,
    actorRole: r.actor.role,
    what: r.action,
    when: r.createdAt.toLocaleString("ar-SY"),
  }));

  return (
    <>
      <PageHeader title="سجل التدقيق" subtitle="من عدّل ماذا ومتى. يراه مدير المعهد وحده." />
      <AuditClient rows={audit} students={students} examiners={examiners} />
    </>
  );
}
