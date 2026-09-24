import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/ui";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // الكنية (النسبة) تُقرأ من قاعدة البيانات لا من الجلسة، كي يظهر أي تعديل عليها فورًا دون إعادة الدخول.
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, familyName: true } });
  const displayName = [user?.name ?? session.name, user?.familyName?.trim()].filter(Boolean).join(" ");

  return (
    <div className="app-shell" style={{ display: "grid", gridTemplateColumns: "248px minmax(0,1fr)", minHeight: "100vh" }}>
      <Sidebar role={session.role} name={displayName} roleLabel={ROLE_LABELS[session.role]} />
      <MobileNav role={session.role} name={displayName} />
      <main style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="app-content-pad" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
