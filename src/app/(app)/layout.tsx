import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/ui";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="app-shell" style={{ display: "grid", gridTemplateColumns: "248px minmax(0,1fr)", minHeight: "100vh" }}>
      <Sidebar role={session.role} name={session.name} roleLabel={ROLE_LABELS[session.role]} />
      <MobileNav role={session.role} name={session.name} />
      <main style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="app-content-pad" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
