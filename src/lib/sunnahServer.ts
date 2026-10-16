import { prisma } from "./db";
import { SUNNAH_SECTIONS, positionFromExams, sunnahPositionLabel, sunnahReadyForAwqaf, type SunnahSectionId } from "./sunnah";

/** مستوى الطالب في كل منهج من مناهج السنة النبوية الثلاثة: «المستوى 1 (…) — المرحلة 2 من 4 …» أو «لم يبدأ بعد». */
export type SunnahLevelLine = { section: SunnahSectionId; label: string; status: string };

export async function sunnahLevelsFor(studentIds: string[]): Promise<Record<string, SunnahLevelLine[]>> {
  if (studentIds.length === 0) return {};
  const [exams, starts, recs] = await Promise.all([
    prisma.exam.findMany({
      where: { studentId: { in: studentIds }, type: { in: ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_AWQAF", "SUNNAH_STAGE", "SUNNAH_PART"] } },
      select: { studentId: true, type: true, sunnahSection: true, stage: true, resultMark: true, repeat: true, grade: true, sunnahStage: true, createdAt: true },
    }),
    prisma.sunnahStart.findMany({ where: { studentId: { in: studentIds } } }),
    prisma.sunnahRecitation.groupBy({ by: ["studentId", "section"], where: { studentId: { in: studentIds } }, _count: { _all: true } }),
  ]);
  const out: Record<string, SunnahLevelLine[]> = {};
  for (const id of studentIds) {
    out[id] = SUNNAH_SECTIONS.map((sec) => {
      const mine = exams.filter((e) => e.studentId === id && e.sunnahSection === sec.id);
      const start = starts.find((s) => s.studentId === id && s.section === sec.id);
      const recited = recs.some((r) => r.studentId === id && r.section === sec.id);
      if (!start && !recited && mine.length === 0) return { section: sec.id, label: sec.label, status: "لم يبدأ بعد" };
      const pos = positionFromExams(
        sec.id,
        mine.map((e) => ({ type: e.type, section: e.sunnahSection, branch: e.stage, mark: e.resultMark, repeat: e.repeat, grade: e.grade, stageNo: e.sunnahStage, createdAt: e.createdAt })),
        start ? { level: start.level, stage: start.stage, startNo: start.startNo, resetAt: start.resetAt?.toISOString() ?? null } : null
      );
      return { section: sec.id, label: sec.label, status: sunnahPositionLabel(pos) };
    });
  }
  return out;
}

/**
 * المرشَّحون لدفعة سبر أوقاف السنّة: الناجحون في سبر ترشيح الأوقاف لمستوى (آخر ترشيح ناجح)، ولم تُدخل لهم نتيجة
 * أوقاف لمستواه بعده، ولم يُضافوا بعده إلى دفعة سنّة لم تُدخل علامتها بعد.
 */
export async function sunnahAwqafCandidates(): Promise<
  { studentId: string; name: string; no: number; section: SunnahSectionId; level: number; nominationDate: string; mark: number | null }[]
> {
  const [exams, pending] = await Promise.all([
    prisma.exam.findMany({
      // الترشيح المُسقَط من قائمة المؤهلين (عند حذف دفعته) لا يُحتسب
      where: { type: { in: ["SUNNAH_NOMINATION", "SUNNAH_AWQAF"] }, nominationDismissed: false },
      select: { id: true, studentId: true, type: true, sunnahSection: true, stage: true, resultMark: true, repeat: true, date: true, student: { select: { name: true, studentNo: true, active: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.awqafResult.findMany({
      where: { sunnahSection: { not: null }, score: null },
      select: { studentId: true, sunnahSection: true, sunnahLevel: true, batch: { select: { date: true } } },
    }),
  ]);
  const ready = sunnahReadyForAwqaf(
    exams.map((e) => ({ id: e.id, studentId: e.studentId, type: e.type, section: e.sunnahSection, branch: e.stage, mark: e.resultMark, repeat: e.repeat, date: e.date }))
  );
  const byId = new Map(exams.map((e) => [e.id, e]));
  return ready
    .filter((n) => byId.get(n.id)?.student.active)
    .filter((n) => !pending.some((p) => p.studentId === n.studentId && p.sunnahSection === n.section && p.sunnahLevel === n.branch && p.batch.date >= n.date))
    .map((n) => {
      const e = byId.get(n.id)!;
      return { studentId: n.studentId, name: e.student.name, no: e.student.studentNo, section: n.section as SunnahSectionId, level: n.branch as number, nominationDate: n.date, mark: n.mark };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}
