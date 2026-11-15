import { prisma } from "./db";
import type { Session } from "./session";
import { dayLockReason, padTime, rotationSlot } from "./daily";
import { damascusNow, type CohortClock } from "./cohortNow";
import { TYPE_LABELS, resultLabel, passFailLabel, examKindLabel, type ExamTypeId } from "./exam";

/**
 * الإشعارات تُبنى عند فتح المستخدم للموقع (لا مهام مجدولة): كل نوع له مفتاح (key) يمنع تكراره،
 * وما لم يعد صحيحًا (رُفع الحضور، عُدّل الغياب إلى حاضر) يُحذف.
 *
 * المدرّس: تذكير برفع الحضور/التسميع بعد ساعة التذكير في فوجه، نتيجة سبر طالب من طلابه، نجوم الإدارة في رصيد حلقته.
 * المدير والإداري: الحلقات التي لم ترفع الحضور بعد ساعة التذكير، وطالب غاب 5 أيام متتالية فأكثر، وطالب لم يدفع أو لم يستكمل الدفع بعد أسبوع من تسجيله.
 * ولي الأمر: غياب ابنه أو تأخّره (بعد انتهاء دوام آخر فوج)، ونتيجة سبر ابنه.
 * والإعلانات تُكتب للمستلمين عند إرسالها (announcements).
 */

/** لا إشعارات عمّا قبل إطلاق الميزة، ولا عمّا مضى عليه أكثر من 3 أيام */
const LAUNCH = new Date("2026-11-10T00:00:00+02:00");
const LOOKBACK_DAYS = 3;
export const ABSENCE_STREAK = 5;
/** إشعار «لم يدفع» بعد هذا العدد من الأيام من تسجيل الطالب */
const UNPAID_AFTER_DAYS = 7;

/** تاريخ اليوم بتوقيت دمشق (YYYY-MM-DD) */
const damascusDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Damascus" }).format(d);

/** لا يُعاد البناء لكل صفحة: مرة كل دقيقتين لكل مستخدم */
const SYNC_EVERY_MS = 2 * 60 * 1000;
const lastSync = new Map<string, number>();

type Want = { key: string; title: string; body?: string | null; href?: string | null };

/** يكتب الإشعارات المطلوبة (ويحدّث نصّها إن تغيّر)، ويحذف ما بادئته من prefixes ولم يعد مطلوبًا */
async function reconcile(userId: string, wants: Want[], prefixes: string[]) {
  const existing = prefixes.length
    ? await prisma.notification.findMany({ where: { userId, OR: prefixes.map((p) => ({ key: { startsWith: p } })) }, select: { id: true, key: true, title: true, body: true } })
    : [];
  const byKey = new Map(existing.map((n) => [n.key, n]));
  const wanted = new Set(wants.map((w) => w.key));
  const stale = existing.filter((n) => !wanted.has(n.key)).map((n) => n.id);
  if (stale.length) await prisma.notification.deleteMany({ where: { id: { in: stale } } });
  for (const w of wants) {
    const cur = byKey.get(w.key);
    if (!cur) {
      await prisma.notification.upsert({
        where: { userId_key: { userId, key: w.key } },
        update: {},
        create: { userId, key: w.key, title: w.title, body: w.body ?? null, href: w.href ?? null },
      });
    } else if (cur.title !== w.title || (cur.body ?? null) !== (w.body ?? null)) {
      await prisma.notification.update({ where: { id: cur.id }, data: { title: w.title, body: w.body ?? null } });
    }
  }
}

/** يكتب إشعارات أحداث مضت (نتائج السبر، النجوم) — لا تُحذف بعدها */
async function ensure(userId: string, wants: Want[]) {
  if (!wants.length) return;
  const have = new Set(
    (await prisma.notification.findMany({ where: { userId, key: { in: wants.map((w) => w.key) } }, select: { key: true } })).map((n) => n.key)
  );
  const fresh = wants.filter((w) => !have.has(w.key));
  if (fresh.length) {
    await prisma.notification.createMany({
      data: fresh.map((w) => ({ userId, key: w.key, title: w.title, body: w.body ?? null, href: w.href ?? null })),
      skipDuplicates: true,
    });
  }
}

/** دوام الفوج اليوم وساعة تذكيره — القلّاب بفترة أسبوعه */
function cohortToday(c: CohortClock & { reminderTime1: string | null; reminderTime2: string | null }, date: string) {
  const slot = c.isRotating ? rotationSlot(c, date) : null;
  const second = slot?.which === 2;
  const start = second ? c.time2Start : c.time1Start;
  const end = second ? c.time2End : c.time1End;
  const reminder = second ? c.reminderTime2 : c.reminderTime1;
  return {
    end: end ? padTime(end) : null,
    start: start ? padTime(start) : null,
    reminder: reminder ? padTime(reminder) : null,
  };
}

const COHORT_CLOCK = { id: true, isRotating: true, time1Start: true, time1End: true, time2Start: true, time2End: true, rotationStart: true, reminderTime1: true, reminderTime2: true } as const;

function sinceDate(): Date {
  const d = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return d > LAUNCH ? d : LAUNCH;
}

/** تواريخ آخر 3 أيام (الأقدم أولًا) حتى اليوم */
function recentDates(today: string): string[] {
  const out: string[] = [];
  const base = new Date(today + "T12:00:00Z").getTime();
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i--) out.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
  return out.filter((d) => new Date(d + "T23:59:59+02:00") >= LAUNCH);
}

function examLine(e: { type: string; localKind: string | null; juz: number | null; nominationPresent: boolean | null; nominationParts: number | null; stage: number | null; startPage: number | null; sunnahSection: string | null; sunnahStage: number | null; pastItems: unknown; resultMark: number | null; grade: string | null; repeat: boolean }) {
  const type = e.type as ExamTypeId;
  const shape = { ...e, type, localKind: e.localKind as never };
  const kind = examKindLabel(shape);
  const pf = passFailLabel(shape);
  return `${TYPE_LABELS[type] ?? "سبر"}${kind ? ` — ${kind}` : ""}: ${resultLabel(shape)}${pf ? ` (${pf})` : ""}`;
}

const EXAM_FIELDS = {
  id: true, studentId: true, type: true, localKind: true, juz: true, nominationPresent: true, nominationParts: true, stage: true, startPage: true,
  sunnahSection: true, sunnahStage: true, pastItems: true, resultMark: true, grade: true, repeat: true,
} as const;

async function syncTeacher(userId: string, date: string, time: string, open: boolean) {
  const halaqat = await prisma.halqa.findMany({
    where: { teacherId: userId },
    select: { id: true, name: true, cohort: { select: COHORT_CLOCK }, _count: { select: { attendance: { where: { date } }, recitations: { where: { date } } } } },
  });
  const reminders: Want[] = [];
  if (open) {
    for (const h of halaqat) {
      const { reminder } = cohortToday(h.cohort, date);
      if (!reminder || time < reminder) continue;
      const missing = [h._count.attendance === 0 && "الحضور", h._count.recitations === 0 && "التسميع"].filter(Boolean) as string[];
      if (!missing.length) continue;
      reminders.push({
        key: `remind:${h.id}:${date}`,
        title: `لم ترفع ${missing.join(" ولا ")} اليوم`,
        body: h.name,
        href: h._count.attendance === 0 ? "/attendance" : "/recitation",
      });
    }
  }
  await reconcile(userId, reminders, [`remind:`]);

  const since = sinceDate();
  const halqaIds = halaqat.map((h) => h.id);
  if (!halqaIds.length) return;
  const [exams, txns] = await Promise.all([
    prisma.exam.findMany({
      where: { createdAt: { gte: since }, student: { halqaId: { in: halqaIds } } },
      select: { ...EXAM_FIELDS, student: { select: { name: true } } },
    }),
    prisma.starTxn.findMany({
      where: { createdAt: { gte: since }, halqaId: { in: halqaIds }, studentId: null, byRole: { in: ["DIRECTOR", "ADMIN"] } },
      select: { id: true, kind: true, amount: true, halqa: { select: { name: true } } },
    }),
  ]);
  await ensure(userId, [
    ...exams.map((e) => ({ key: `exam:${e.id}`, title: `نتيجة سبر: ${e.student.name}`, body: examLine(e), href: "/exam-monitor" })),
    ...txns.map((t) => ({
      key: `stars:${t.id}`,
      title: t.kind === "CHARGE" ? `أودعت الإدارة ${t.amount} نجمة في رصيد حلقتك` : `سحبت الإدارة ${t.amount} نجمة من رصيد حلقتك`,
      body: t.halqa?.name ?? null,
      href: "/my-stars",
    })),
  ]);
}

async function syncStaff(userId: string, date: string, time: string, open: boolean) {
  // الحلقات التي لم ترفع الحضور بعد ساعة تذكير فوجها — إشعار واحد لليوم يُحدَّث
  const wants: Want[] = [];
  if (open) {
    const halaqat = await prisma.halqa.findMany({
      select: { name: true, cohort: { select: { ...COHORT_CLOCK, name: true } }, _count: { select: { attendance: { where: { date } } } } },
      orderBy: { name: "asc" },
    });
    const pending = halaqat.filter((h) => {
      const { reminder } = cohortToday(h.cohort, date);
      return reminder && time >= reminder && h._count.attendance === 0;
    });
    if (pending.length) {
      wants.push({
        key: `att-pending:${date}`,
        title: `${pending.length} حلقة لم ترفع الحضور اليوم`,
        body: pending.map((h) => `${h.name} (${h.cohort.name})`).join("، "),
        href: "/monitor",
      });
    }
  }
  await reconcile(userId, wants, [`att-pending:`]);

  // طالب «لم يدفع» أو «متبقٍّ» عليه بعد أسبوع من تسجيله — يبقى حتى تُعدَّل حالة رسومه (أو يُصبح منقطعًا) فيُحذف
  const unpaid = await prisma.student.findMany({
    // الأيتام مستثنون: المعهد لا يأخذ منهم رسومًا
    where: { active: true, isOrphan: false, feeStatus: { in: ["UNPAID", "REMAINING"] }, registeredAt: { not: null, lte: new Date(Date.now() - UNPAID_AFTER_DAYS * 86400000) } },
    select: { id: true, name: true, registeredAt: true, feeStatus: true, feeAmount: true },
    orderBy: { registeredAt: "asc" },
  });
  await reconcile(
    userId,
    unpaid.map((s) => {
      const day = damascusDate(s.registeredAt as Date).split("-").reverse().join("/");
      // «متبقٍّ»: لم يستكمل الدفع — ومعه المبلغ المتبقي إن كُتب
      return s.feeStatus === "REMAINING"
        ? { key: `unpaid:${s.id}:rest`, title: `سجّل الطالب ${s.name} منذ ${day} ولم يستكمل الدفع إلى الآن.`, body: s.feeAmount ? `المبلغ المتبقي: ${s.feeAmount.toLocaleString("en-US")}` : null, href: "/students" }
        : { key: `unpaid:${s.id}`, title: `سجّل الطالب ${s.name} منذ ${day} ولم يدفع إلى الآن.`, href: "/students" };
    }),
    [`unpaid:`]
  );

  // غياب 5 أيام متتالية فأكثر: آخر سجلات حضور الطالب كلها «غائب»
  const windowStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const rows = await prisma.attendance.findMany({
    where: { date: { gte: windowStart }, student: { active: true } },
    select: { studentId: true, date: true, status: true, student: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  const byStudent = new Map<string, typeof rows>();
  for (const r of rows) byStudent.set(r.studentId, [...(byStudent.get(r.studentId) ?? []), r]);
  const streaks: Want[] = [];
  const recent = recentDates(date);
  for (const [studentId, list] of byStudent) {
    if (!recent.includes(list[0].date)) continue;
    let n = 0;
    while (n < list.length && list[n].status === "ABSENT") n++;
    if (n < ABSENCE_STREAK) continue;
    const firstDay = list[n - 1].date;
    streaks.push({
      key: `streak:${studentId}:${firstDay}`,
      title: `${list[0].student.name} غاب ${n} أيام متتالية`,
      body: `منذ ${firstDay.split("-").reverse().join("/")}`,
      href: `/reports/student?student=${studentId}`,
    });
  }
  // تبقى بعد انقطاع السلسلة — تُكتب ويُحدَّث عدد أيامها ما دامت مستمرة
  for (const w of streaks) {
    await prisma.notification.upsert({
      where: { userId_key: { userId, key: w.key } },
      update: { title: w.title },
      create: { userId, key: w.key, title: w.title, body: w.body, href: w.href },
    });
  }
}

async function syncGuardian(userId: string, date: string, time: string) {
  const children = await prisma.student.findMany({ where: { guardianUserId: userId }, select: { id: true, name: true } });
  if (!children.length) return;
  const ids = children.map((c) => c.id);
  const nameOf = new Map(children.map((c) => [c.id, c.name]));

  // غياب اليوم أو تأخّره يظهر بعد انتهاء دوام آخر فوج في المعهد
  const cohorts = await prisma.cohort.findMany({ select: COHORT_CLOCK });
  const lastEnd = cohorts.map((c) => cohortToday(c, date).end).filter((e): e is string => !!e).sort().at(-1) ?? null;
  const dates = recentDates(date).filter((d) => d < date || (lastEnd != null && time >= lastEnd));
  const att = dates.length
    ? await prisma.attendance.findMany({ where: { studentId: { in: ids }, date: { in: dates }, status: { in: ["ABSENT", "LATE"] } }, select: { studentId: true, date: true, status: true } })
    : [];
  await reconcile(
    userId,
    att.map((a) => ({
      key: `att:${a.studentId}:${a.date}`,
      title: `${nameOf.get(a.studentId)} ${a.status === "ABSENT" ? "غائب" : "متأخر"} ${a.date === date ? "اليوم" : `يوم ${a.date.split("-").reverse().join("/")}`}`,
      href: "/parent/recitation",
    })),
    // ما عُدّل إلى حاضر أو إذن يُحذف — لأيام النافذة وحدها
    dates.flatMap((d) => ids.map((id) => `att:${id}:${d}`))
  );

  const exams = await prisma.exam.findMany({ where: { createdAt: { gte: sinceDate() }, studentId: { in: ids } }, select: EXAM_FIELDS });
  await ensure(
    userId,
    exams.map((e) => ({ key: `exam:${e.id}`, title: `نتيجة سبر ${nameOf.get(e.studentId)}`, body: examLine(e), href: "/parent" }))
  );
}

/** يبني إشعارات المستخدم بحسب دوره الحالي — يُستدعى من إطار الصفحات، ومرة كل دقيقتين على الأكثر */
export async function syncNotifications(session: Session): Promise<void> {
  const k = `${session.userId}:${session.role}`;
  const now = Date.now();
  if (now - (lastSync.get(k) ?? 0) < SYNC_EVERY_MS) return;
  lastSync.set(k, now);
  try {
    const { date, time } = damascusNow();
    const open = (await dayLockReason(date)) == null;
    if (session.role === "TEACHER") await syncTeacher(session.userId, date, time, open);
    else if (session.role === "DIRECTOR" || session.role === "ADMIN") await syncStaff(session.userId, date, time, open);
    else if (session.role === "GUARDIAN") await syncGuardian(session.userId, date, time);
  } catch (e) {
    // الإشعارات لا تُعطّل الصفحة
    lastSync.delete(k);
    console.error("syncNotifications", e);
  }
}

/** يُعيد بناء إشعارات الجميع عند طلبهم التالي — بعد رفع الحضور أو التسميع أو تسجيل سبر */
export function invalidateNotifications() {
  lastSync.clear();
}

export type NotificationItem = { id: string; title: string; body: string | null; href: string | null; at: string; read: boolean };

export async function loadNotifications(userId: string): Promise<{ items: NotificationItem[]; unread: number }> {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    unread,
    items: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, at: n.createdAt.toISOString(), read: n.readAt != null })),
  };
}
