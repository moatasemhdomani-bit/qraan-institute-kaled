import type { RoleId } from "@/lib/ui";
import { examFamily, type TrackId } from "@/lib/track";

/** track: عنصر يخص عائلة واحدة — القرآن (بمستوياته الثلاثة) أو القراءة العربية — بلا track يظهر للجميع. */
export const NAV: { id: string; href: string; label: string; roles: RoleId[]; track?: "QURAN" | "ARABIC" }[] = [
  { id: "dashboard", href: "/dashboard", label: "لوحة المعلومات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "attendance", href: "/attendance", label: "الحضور اليومي", roles: ["TEACHER"] },
  { id: "recitation", href: "/recitation", label: "التسميع اليومي", roles: ["TEACHER"] },
  { id: "monitor", href: "/monitor", label: "متابعة الحضور", roles: ["DIRECTOR", "ADMIN", "EXAM_SUPERVISOR"] },
  { id: "recitation-monitor", href: "/recitation-monitor", label: "متابعة التسميع", roles: ["DIRECTOR", "ADMIN", "EXAM_SUPERVISOR"] },
  { id: "permits", href: "/permits", label: "إذن الطلاب", roles: ["TEACHER", "ADMIN", "DIRECTOR"] },
  { id: "stars", href: "/stars", label: "إدارة النجوم", roles: ["DIRECTOR", "ADMIN"] },
  { id: "my-stars", href: "/my-stars", label: "متابعة النجوم", roles: ["TEACHER"] },
  { id: "activity-stars", href: "/activity-stars", label: "نجوم النشاط", roles: ["ACTIVITY_OFFICER"] },
  { id: "awqaf-batches", href: "/exams/awqaf-batches", label: "سبر الأوقاف والشهادات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "exams-local", href: "/exams/local", label: "السبر المحلي", roles: ["EXAMINER", "EXAM_SUPERVISOR"], track: "QURAN" },
  { id: "exams-awqaf", href: "/exams/awqaf", label: "سبر ترشيح الأوقاف للقرآن", roles: ["EXAMINER", "EXAM_SUPERVISOR"], track: "QURAN" },
  { id: "exams-placement", href: "/exams/placement", label: "تحديد مستوى", roles: ["EXAMINER", "EXAM_SUPERVISOR"], track: "QURAN" },
  { id: "exams-past", href: "/exams/past", label: "سبر ماضٍ غيباً", roles: ["EXAMINER", "EXAM_SUPERVISOR"], track: "QURAN" },
  // «متابعة السبر» لكل مختبري القرآن — اطلاع
  { id: "exam-monitor-examiner", href: "/exam-monitor", label: "متابعة السبر", roles: ["EXAMINER"], track: "QURAN" },
  { id: "exams-arabic", href: "/exams/arabic", label: "سبر القراءة العربية", roles: ["EXAMINER"], track: "ARABIC" },
  { id: "exams-sunnah", href: "/exams/sunnah", label: "سبر السنة النبوية", roles: ["ADMIN"] },
  // مختبر الحديث: «سبر محلي» (المناهج الثلاثة: تسميع، مراحل، سبر المستوى) و«سبر ترشيح الأوقاف»
  { id: "sunnah-staged", href: "/exams/sunnah", label: "سبر محلي", roles: ["SUNNAH_EXAMINER"] },
  { id: "sunnah-nomination", href: "/exams/sunnah/nomination", label: "سبر ترشيح الأوقاف", roles: ["SUNNAH_EXAMINER"] },
  { id: "exam-monitor", href: "/exam-monitor", label: "متابعة السبر", roles: ["DIRECTOR", "ADMIN", "TEACHER", "EXAM_SUPERVISOR"] },
  { id: "parent", href: "/parent", label: "متابعة الابن", roles: ["GUARDIAN"] },
  { id: "users", href: "/users", label: "إدارة المستخدمين", roles: ["DIRECTOR"] },
  { id: "audit", href: "/audit", label: "سجل التدقيق", roles: ["DIRECTOR"] },
  { id: "cohorts", href: "/cohorts", label: "إدارة الأفواج", roles: ["DIRECTOR", "ADMIN"] },
  { id: "halaqat", href: "/halaqat", label: "إدارة الحلقات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "schedule", href: "/schedule", label: "الدوام والعطل", roles: ["DIRECTOR", "ADMIN"] },
  { id: "students", href: "/students", label: "شؤون الطلاب", roles: ["DIRECTOR", "ADMIN"] },
  { id: "reports-hub", href: "/reports", label: "مركز التقارير", roles: ["DIRECTOR", "ADMIN"] },
  // ملاحظات المدرّس الشهرية تُغذّي تقرير تسميع حلقات القرآن — لا عمود ملاحظات في تقرير القراءة العربية
  // «مركز التقارير» للمدرّس (قرآن وقراءة عربية): التقرير الشهري، تقرير طالب، سجل التسميع
  { id: "monthly-report", href: "/monthly-report", label: "مركز التقارير", roles: ["TEACHER"] },
];

/** ترتيب الشاشات عند المدير والإداري كما طلبته الإدارة — بقية الأدوار تبقى بترتيب NAV نفسه. */
const STAFF_ORDER = [
  "students",
  "monitor",
  "recitation-monitor",
  "exam-monitor",
  "exams-sunnah",
  "users",
  "halaqat",
  "cohorts",
  "reports-hub",
  "awqaf-batches",
  "permits",
  "stars",
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
export function activeNavId(pathname: string, items: { id: string; href: string }[] = NAV): string | undefined {
  let best: { id: string; href: string } | undefined;
  for (const n of items) {
    const on = pathname === n.href || pathname.startsWith(n.href + "/");
    if (on && (!best || n.href.length > best.href.length)) best = n;
  }
  return best?.id;
}
