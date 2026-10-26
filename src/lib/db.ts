import { PrismaClient } from "@prisma/client";
import { halqaWithTrack } from "./track";

/** «الاسم النسبة» — النسبة (الكنية/العائلة) تُلحق بالاسم إن وُجدت ولم يكن الاسم منتهيًا بها أصلًا. */
export function nameWithNasab(name: string, familyName: string | null | undefined): string {
  const f = familyName?.trim();
  return f && !name.trim().endsWith(f) ? `${name} ${f}` : name;
}

/**
 * اسم الطالب الثلاثي: «الاسم الأب النسبة». لا يتكرّر الأب إن كان مكتوبًا في الاسم أصلًا،
 * ولا النسبة إن كان الاسم منتهيًا بها.
 */
export function studentFullName(name: string, fatherName: string | null | undefined, familyName: string | null | undefined): string {
  const family = familyName?.trim() || "";
  let base = name.trim();
  if (family && base.endsWith(family)) base = base.slice(0, -family.length).trim();
  const father = fatherName?.trim();
  if (father && !base.split(/\s+/).slice(1).join(" ").includes(father)) base = `${base} ${father}`;
  return [base, family].filter(Boolean).join(" ");
}

function extend(raw: PrismaClient) {
  // اسم العامل يظهر دومًا مع نسبته في كل الموقع وكل التقارير: كل قراءة لـ user.name (مباشرة أو عبر علاقة
  // كـ teacher/examiner/issuedBy) تُرجع «الاسم النسبة». حقل الاسم المخزَّن نفسه لا يتغيّر.
  return raw.$extends({
    result: {
      user: {
        name: {
          needs: { name: true, familyName: true },
          compute: (u) => nameWithNasab(u.name, u.familyName),
        },
      },
      // اسم الحلقة يظهر دومًا مع نوعها (قرآن / قراءة عربية) في كل الموقع
      halqa: {
        name: {
          needs: { name: true, track: true },
          compute: (h) => halqaWithTrack(h.name, h.track),
        },
      },
      // واسم الطالب يظهر دومًا ثلاثيًا (الاسم الأب النسبة) في كل الشاشات والتقارير
      student: {
        name: {
          needs: { name: true, fatherName: true, familyName: true },
          compute: (s) => studentFullName(s.name, s.fatherName, s.familyName),
        },
      },
    },
  });
}

function createClients() {
  const raw = new PrismaClient();
  // هذا الملف يُستورد أيضًا (بشكل غير مباشر) في مكوّنات المتصفح، وهناك لا يعمل $extends — يُطبَّق على الخادم فقط
  const extended = typeof window === "undefined" ? extend(raw) : (raw as unknown as ReturnType<typeof extend>);
  return { raw, extended };
}

type Clients = ReturnType<typeof createClients>;
const globalForPrisma = globalThis as unknown as { prismaClients?: Clients };
const clients = globalForPrisma.prismaClients ?? createClients();
if (process.env.NODE_ENV !== "production") globalForPrisma.prismaClients = clients;

export const prisma = clients.extended;

/** العميل الخام — للمواضع التي تحتاج الاسم المخزَّن كما هو بلا نسبة (نموذج تعديل العامل). */
export const rawPrisma = clients.raw;
