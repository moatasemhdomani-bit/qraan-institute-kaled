import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/ui";
import { staffRoleLabel } from "@/lib/track";
import { getTheme, isNavCollapsed } from "@/lib/themeServer";
import NavToggle from "@/components/NavToggle";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // الاسم (مع النسبة) يُقرأ من قاعدة البيانات لا من الجلسة، كي يظهر أي تعديل عليه فورًا دون إعادة الدخول.
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, track: true } });
  const displayName = user?.name ?? session.name;
  const theme = await getTheme();
  const navCollapsed = await isNavCollapsed();

  return (
    // أعمدة الشبكة في globals.css (.app-shell) كي يطويها زر ☰ — الشريط الجانبي ينسحب وتتسع الشاشة
    <div className={`app-shell role-${session.role.toLowerCase()}${navCollapsed ? " nav-collapsed" : ""}`}>
      <NavToggle initialCollapsed={navCollapsed} />
      <Sidebar role={session.role} name={displayName} roleLabel={staffRoleLabel(session.role, user?.track, ROLE_LABELS)} track={user?.track} theme={theme} />
      <MobileNav role={session.role} name={displayName} track={user?.track} theme={theme} />
      <main style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="app-content-pad" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
