import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { currentCohortId } from "@/lib/cohortNow";

/**
 * عند فتح الموقع: الموظف الذي له حسابات في أكثر من فوج (مدرّس/مختبِر…) يدخل تلقائيًا على حساب الفوج الجاري الآن
 * (أو الذي بدأ دوامه آخرًا)، ثم إلى شاشاته. التنقّل اليدوي بين الحسابات أعلى الشاشة لا يمرّ من هنا.
 */
export async function GET(req: Request) {
  const session = await getSession();
  const to = (p: string) => NextResponse.redirect(new URL(p, req.url));
  if (!session) return to("/login");

  if (session.accounts.length > 1) {
    const ids = [...new Set(session.accounts.flatMap((a) => a.cohortIds))];
    const cohorts = await prisma.cohort.findMany({
      where: { id: { in: ids } },
      select: { id: true, isRotating: true, time1Start: true, time1End: true, time2Start: true, time2End: true, rotationStart: true },
    });
    const now = currentCohortId(cohorts);
    const acc = now ? session.accounts.find((a) => a.cohortIds.includes(now)) : null;
    if (acc && !(acc.role === session.role && acc.track === session.track)) {
      await prisma.user.update({ where: { id: session.userId }, data: { role: acc.role, track: acc.track } });
      await createSession({ userId: session.userId, role: acc.role, name: session.name, track: acc.track });
    }
  }
  return to("/dashboard");
}
