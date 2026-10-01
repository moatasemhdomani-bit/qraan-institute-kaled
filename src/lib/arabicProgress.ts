import { prisma } from "./db";
import { passFailLabel } from "./exam";

/**
 * طلاب القراءة العربية الناجحون في المرحلة 6: يتحوّل تسميعهم إلى «بينة للناس» (اختيار السور)
 * ويبقون في حلقتهم نفسها حتى ينجحوا في المرحلة 7 فيترفّعوا إلى «عمَّ غيباً».
 */
export async function passedArabicStage6(studentIds: string[]): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const exams = await prisma.exam.findMany({
    where: { type: "ARABIC", stage: 6, studentId: { in: studentIds } },
    select: { studentId: true, stage: true, grade: true, resultMark: true },
  });
  return new Set(
    exams
      .filter((e) => passFailLabel({ type: "ARABIC", stage: e.stage, grade: e.grade, resultMark: e.resultMark }) === "ناجح")
      .map((e) => e.studentId)
  );
}
