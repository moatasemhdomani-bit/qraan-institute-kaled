import type { RoleId } from "@/lib/ui";

export const NAV: { id: string; href: string; label: string; roles: RoleId[] }[] = [
  { id: "dashboard", href: "/dashboard", label: "لوحة التحكم", roles: ["DIRECTOR", "ADMIN", "TEACHER", "EXAMINER", "GUARDIAN"] },
  { id: "users", href: "/users", label: "إدارة المستخدمين", roles: ["DIRECTOR", "ADMIN"] },
  { id: "audit", href: "/audit", label: "سجل التدقيق", roles: ["DIRECTOR"] },
  { id: "cohorts", href: "/cohorts", label: "إدارة الأفواج", roles: ["DIRECTOR", "ADMIN"] },
  { id: "halaqat", href: "/halaqat", label: "إدارة الحلقات", roles: ["DIRECTOR", "ADMIN"] },
  { id: "schedule", href: "/schedule", label: "الدوام والعطل", roles: ["DIRECTOR", "ADMIN"] },
  { id: "students", href: "/students", label: "الطلاب", roles: ["DIRECTOR", "ADMIN"] },
];
