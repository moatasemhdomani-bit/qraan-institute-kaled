import type { RoleId } from "@/lib/ui";
import { examFamily, type TrackId } from "@/lib/track";

/** track: عنصر يخص عائلة واحدة — القرآن (بمستوياته الثلاثة) أو القراءة العربية — بلا track يظهر للجميع. */
export const NAV: { id: string; href: string; label: string; roles: RoleId[]; track?: "QURAN" | "ARABIC" }[] = [
  { id: "dashboard", href: "/dashboard", label: "لوحة المعلومات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "attendance", href: "/attendance", label: "الحضور اليومي", roles: ["TEACHER"] },
  { id: "recitation", href: "/recitation", label: "التسميع اليومي", roles: ["TEACHER"] },
  { id: "monitor", href: "/monitor", label: "متابعة الحضور", roles: ["DIRECTOR", "ADMIN"] },
  { id: "recitation-monitor", href: "/recitation-monitor", label: "متابعة التسميع", roles: ["DIRECTOR", "ADMIN"] },
  { id: "permits", href: "/permits", label: "إذن الطلاب", roles: ["TEACHER", "ADMIN", "DIRECTOR"] },
  { id: "awqaf-batches", href: "/exams/awqaf-batches", label: "سبر الأوقاف والشهادات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "exams-local", href: "/exams/local", label: "السبر المحلي", roles: ["EXAMINER"], track: "QURAN" },
  { id: "exams-awqaf", href: "/exams/awqaf", label: "ترشيح الأوقاف", roles: ["EXAMINER"], track: "QURAN" },
  { id: "exams-placement", href: "/exams/placement", label: "تحديد مستوى", roles: ["EXAMINER"], track: "QURAN" },
  { id: "exams-arabic", href: "/exams/arabic", label: "سبر القراءة العربية", roles: ["EXAMINER"], track: "ARABIC" },
  { id: "exam-monitor", href: "/exam-monitor", label: "متابعة السبر", roles: ["DIRECTOR", "ADMIN", "TEACHER"] },
  { id: "parent", href: "/parent", label: "متابعة الابن", roles: ["GUARDIAN"] },
  { id: "users", href: "/users", label: "إدارة المستخدمين", roles: ["DIRECTOR"] },
  { id: "audit", href: "/audit", label: "سجل التدقيق", roles: ["DIRECTOR"] },
  { id: "cohorts", href: "/cohorts", label: "إدارة الأفواج", roles: ["DIRECTOR", "ADMIN"] },
  { id: "halaqat", href: "/halaqat", label: "إدارة الحلقات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "schedule", href: "/schedule", label: "الدوام والعطل", roles: ["DIRECTOR", "ADMIN"] },
  { id: "students", href: "/students", label: "شؤون الطلاب", roles: ["DIRECTOR", "ADMIN"] },
  { id: "reports-hub", href: "/reports", label: "مركز التقارير", roles: ["DIRECTOR", "ADMIN"] },
  // ملاحظات المدرّس الشهرية تُغذّي تقرير تسميع حلقات القرآن — لا عمود ملاحظات في تقرير القراءة العربية
  { id: "monthly-report", href: "/monthly-report", label: "التقرير الشهري", roles: ["TEACHER"], track: "QURAN" },
];

/** ترتيب الشاشات عند المدير والإداري كما طلبته الإدارة — بقية الأدوار تبقى بترتيب NAV نفسه. */
const STAFF_ORDER = [
  "students",
  "monitor",
  "recitation-monitor",
  "exam-monitor",
  "users",
  "halaqat",
  "cohorts",
  "reports-hub",
  "awqaf-batches",
  "permits",
  "schedule",
  "audit",
  "dashboard",
];

/** عناصر القائمة الظاهرة لهذا الدور ونوعه (قرآن / قراءة عربية)، مرتّبة. */
export function navItemsFor(role: RoleId, track: TrackId | undefined) {
  const items = NAV.filter((n) => n.roles.includes(role) && (!n.track || n.track === examFamily(track)));
  if (role !== "DIRECTOR" && role !== "ADMIN") return items;
  const rank = (id: string) => (STAFF_ORDER.indexOf(id) + 1 || STAFF_ORDER.length + 1);
  return [...items].sort((a, b) => rank(a.id) - rank(b.id));
}

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
