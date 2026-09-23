import type { RoleId } from "@/lib/ui";

export const NAV: { id: string; href: string; label: string; roles: RoleId[] }[] = [
  { id: "dashboard", href: "/dashboard", label: "لوحة التحكم", roles: ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER", "GUARDIAN"] },
  { id: "attendance", href: "/attendance", label: "الحضور اليومي", roles: ["TEACHER"] },
  { id: "recitation", href: "/recitation", label: "التسميع اليومي", roles: ["TEACHER"] },
  { id: "monitor", href: "/monitor", label: "متابعة الحضور", roles: ["DIRECTOR", "ADMIN"] },
  { id: "recitation-monitor", href: "/recitation-monitor", label: "متابعة التسميع", roles: ["DIRECTOR", "ADMIN"] },
  { id: "permits", href: "/permits", label: "إذن", roles: ["TEACHER", "ADMIN", "DIRECTOR"] },
  { id: "exams-hub", href: "/exams", label: "السبر", roles: ["DIRECTOR"] },
  { id: "awqaf-batches", href: "/exams/awqaf-batches", label: "سبر الأوقاف والشهادات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "exams-local", href: "/exams/local", label: "السبر المحلي", roles: ["EXAMINER"] },
  { id: "exams-awqaf", href: "/exams/awqaf", label: "ترشيح الأوقاف", roles: ["EXAMINER"] },
  { id: "exams-placement", href: "/exams/placement", label: "تحديد مستوى", roles: ["EXAMINER"] },
  { id: "exam-monitor", href: "/exam-monitor", label: "متابعة السبر", roles: ["DIRECTOR", "ADMIN", "TEACHER"] },
  { id: "parent", href: "/parent", label: "متابعة الابن", roles: ["GUARDIAN"] },
  { id: "users", href: "/users", label: "إدارة المستخدمين", roles: ["DIRECTOR", "ADMIN"] },
  { id: "audit", href: "/audit", label: "سجل التدقيق", roles: ["DIRECTOR"] },
  { id: "cohorts", href: "/cohorts", label: "إدارة الأفواج", roles: ["DIRECTOR", "ADMIN"] },
  { id: "halaqat", href: "/halaqat", label: "إدارة الحلقات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "schedule", href: "/schedule", label: "الدوام والعطل", roles: ["DIRECTOR", "ADMIN"] },
  { id: "students", href: "/students", label: "الطلاب", roles: ["DIRECTOR", "ADMIN"] },
  { id: "reports-hub", href: "/reports", label: "مركز التقارير", roles: ["DIRECTOR", "ADMIN"] },
  { id: "monthly-report", href: "/monthly-report", label: "التقرير الشهري", roles: ["TEACHER"] },
];

/**
 * يُرجع معرّف عنصر التنقّل الأكثر تحديدًا (أطول href مطابق) بدل كل العناصر المطابقة —
 * وإلا يُظلَّل "السبر" (/exams) مع أي مسار فرعي له مثل /exams/awqaf-batches معًا.
 */
export function activeNavId(pathname: string): string | undefined {
  let best: { id: string; href: string } | undefined;
  for (const n of NAV) {
    const on = pathname === n.href || pathname.startsWith(n.href + "/");
    if (on && (!best || n.href.length > best.href.length)) best = n;
  }
  return best?.id;
}
