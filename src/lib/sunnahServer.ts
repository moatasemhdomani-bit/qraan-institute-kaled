import { prisma } from "./db";
import { SUNNAH_SECTIONS, positionFromExams, sunnahPositionLabel, type SunnahSectionId } from "./sunnah";

/** مستوى الطالب في كل منهج من مناهج السنة النبوية الثلاثة: «المستوى 1 (…) — المرحلة 2 من 4 …» أو «لم يبدأ بعد». */
export type SunnahLevelLine = { section: SunnahSectionId; label: string; status: string };

export async function sunnahLevelsFor(studentIds: string[]): Promise<Record<string, SunnahLevelLine[]>> {
  if (studentIds.length === 0) return {};
  const [exams, starts, recs] = await Promise.all([
    prisma.exam.findMany({
      where: { studentId: { in: studentIds }, type: { in: ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_AWQAF", "SUNNAH_STAGE"] } },
      select: { studentId: true, type: true, sunnahSection: true, stage: true, resultMark: true, repeat: true, grade: true, sunnahStage: true },
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
        mine.map((e) => ({ type: e.type, section: e.sunnahSection, branch: e.stage, mark: e.resultMark, repeat: e.repeat, grade: e.grade, stageNo: e.sunnahStage })),
        start ? { level: start.level, stage: start.stage, startNo: start.startNo } : null
      );
      return { section: sec.id, label: sec.label, status: sunnahPositionLabel(pos) };
    });
  }
  return out;
}
