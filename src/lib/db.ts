import { PrismaClient } from "@prisma/client";

/** «الاسم النسبة» — النسبة (الكنية/العائلة) تُلحق بالاسم إن وُجدت ولم يكن الاسم منتهيًا بها أصلًا. */
export function nameWithNasab(name: string, familyName: string | null | undefined): string {
  const f = familyName?.trim();
  return f && !name.trim().endsWith(f) ? `${name} ${f}` : name;
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
      // واسم الطالب كذلك يظهر دومًا مع نسبته في كل الشاشات والتقارير
      student: {
        name: {
          needs: { name: true, familyName: true },
          compute: (s) => nameWithNasab(s.name, s.familyName),
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
