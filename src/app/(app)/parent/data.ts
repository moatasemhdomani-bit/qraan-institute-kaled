import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { today, isValidDate, monthStart } from "@/lib/daily";

export type ParentSearch = { child?: string; from?: string; to?: string };

/**
 * شاشات ولي الأمر الثلاث: الطالب صاحب الحساب وإخوته (عبر رقم ولي الأمر المشترك)، والابن المختار، والفترة
 * (من بداية الشهر الحالي إلى اليوم افتراضيًا). null = الحساب غير مرتبط بطالب.
 */
export async function loadParentContext(spPromise: Promise<ParentSearch>) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "GUARDIAN") redirect("/dashboard");

  const sp = await spPromise;
  const from = sp.from && isValidDate(sp.from) ? sp.from : monthStart();
  const to = sp.to && isValidDate(sp.to) ? sp.to : today();

  const own = await prisma.student.findFirst({
    where: { guardianUserId: session.userId },
    include: { halqa: { include: { cohort: true } } },
  });
  if (!own) return null;

  const family = own.guardianPhone
    ? await prisma.student.findMany({
        where: { guardianPhone: own.guardianPhone },
        orderBy: { studentNo: "asc" },
        select: { id: true, studentNo: true, name: true },
      })
    : [{ id: own.id, studentNo: own.studentNo, name: own.name }];

  const activeId = family.find((f) => f.id === sp.child)?.id ?? own.id;
  const child =
    activeId === own.id
      ? own
      : await prisma.student.findUnique({ where: { id: activeId }, include: { halqa: { include: { cohort: true } } } });
  if (!child) redirect("/parent");

  return { family: family.map((f) => ({ id: f.id, label: f.name })), activeId, child, from, to };
}
