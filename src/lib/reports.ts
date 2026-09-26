import { prisma } from "./db";
import { pageSpan } from "./daily";
import { passFailLabel } from "./exam";
import { awqafPassed } from "./awqaf";

type RecitationRow = {
  date: string;
  newFrom: number | null;
  newTo: number | null;
  pastFrom: number | null;
  pastTo: number | null;
};

/**
 * من/إلى صفحة: أول وآخر صفحة تسميع جديد بترتيب التاريخ ضمن الفترة.
 * الجديد والماضي مفصولان دائمًا — الماضي مراجعة حرّة لا تُحسب مع تقدّم الحفظ الجديد.
 */
export function pagesSummary(recitations: RecitationRow[]): { from: number | null; to: number | null; newTotal: number; pastTotal: number } {
  const sorted = [...recitations].sort((a, b) => a.date.localeCompare(b.date));
  const withNew = sorted.filter((r) => r.newFrom != null && r.newTo != null);
  const newTotal = recitations.reduce((sum, r) => sum + pageSpan(r.newFrom, r.newTo), 0);
  const pastTotal = recitations.reduce((sum, r) => sum + pageSpan(r.pastFrom, r.pastTo), 0);
  return {
    from: withNew[0]?.newFrom ?? null,
    to: withNew[withNew.length - 1]?.newTo ?? null,
    newTotal,
    pastTotal,
  };
}

type LocalExamRow = { localKind: "GHAYBAN" | "HADIRAN" | "AMMA_GHAYBAN" | null; resultMark: number | null };

/** عدد اختبارات السبر المحلي الناجحة/الراسبة — بحدود النجاح الفعلية حسب فرع السبر (90 حاضراً، 80 غيباً/عمّ غيباً). */
export function localSplit(exams: LocalExamRow[]): { pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const e of exams) {
    const label = passFailLabel({ type: "LOCAL", localKind: e.localKind, resultMark: e.resultMark });
    if (label === "ناجح") pass++;
    else if (label === "راسب") fail++;
  }
  return { pass, fail };
}

type NominationExamRow = { resultMark: number | null; nominationPresent: boolean | null };

/** عدد اختبارات ترشيح الأوقاف الداخلي الناجحة/الراسبة — 90 حاضرًا (تلاوة) أو 80 غيبًا (حفظ). */
export function nominationSplit(exams: NominationExamRow[]): { pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const e of exams) {
    const label = passFailLabel({ type: "WAQF_NOMINATION", resultMark: e.resultMark, nominationPresent: e.nominationPresent });
    if (label === "ناجح") pass++;
    else if (label === "راسب") fail++;
  }
  return { pass, fail };
}

type AwqafResultRow = { score: number | null; nominationPresent: boolean };

/** عدد نتائج سبر الأوقاف الفعلي الناجحة/الراسبة — نفس حدّ مسار ترشيح كل طالب. */
export function realAwqafSplit(results: AwqafResultRow[]): { pass: number; fail: number } {
  let pass = 0, fail = 0;
  for (const r of results) {
    const passed = awqafPassed(r.score, r.nominationPresent);
    if (passed === true) pass++;
    else if (passed === false) fail++;
  }
  return { pass, fail };
}

const MONTH_NAMES = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];

/** اسم الشهر بالعربية من "YYYY-MM". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${y}`;
}

/** أول وآخر يوم من شهر "YYYY-MM"، بصيغة YYYY-MM-DD. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/** الشهر الحالي وآخر شهرين قبله، بصيغة "YYYY-MM" — للاختيار في شاشة ملاحظات المدرّس الشهرية. */
export function recentMonths(count = 3): string[] {
  const out: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m < 1) { m = 12; y--; }
  }
  return out;
}

/** "YYYY-MM" لكل شهر تقويمي تتقاطع معه فترة [from, to] — لجلب ملاحظات المدرّسين الشهرية المطابقة. */
export function monthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ── تجميع بيانات التقارير الثلاثة — مشتركة بين شاشات الإصدار وبين مسار إعادة توليد PDF عند الطلب ──

export type HalaqatPreviewRow = {
  studentId: string;
  studentName: string;
  from: number | null;
  to: number | null;
  newTotal: number;
  pastTotal: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  note: string;
  noteFromTeacher: boolean;
};
export type HalaqatPreviewBlock = { halqaId: string; halqaName: string; teacherName: string; cohortName: string; rows: HalaqatPreviewRow[] };

export async function buildHalaqatBlocks(from: string, to: string, halqaScope: string): Promise<HalaqatPreviewBlock[]> {
  const halaqat = await prisma.halqa.findMany({
    where: halqaScope === "all" ? {} : { id: halqaScope },
    include: { teacher: { select: { name: true } }, cohort: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const halqaIds = halaqat.map((h) => h.id);
  if (halqaIds.length === 0) return [];

  const students = await prisma.student.findMany({
    where: { halqaId: { in: halqaIds } },
    orderBy: { name: "asc" },
  });
  const studentIds = students.map((s) => s.id);
  const months = monthsInRange(from, to);

  const [recitations, localExams, nomExams, awqafResults, notes] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId: { in: studentIds }, batch: { date: { gte: from, lte: to } } } }),
    prisma.teacherMonthlyNote.findMany({ where: { studentId: { in: studentIds }, month: { in: months } } }),
  ]);

  return halaqat
    .map((h) => ({
      halqaId: h.id,
      halqaName: h.name,
      teacherName: h.teacher.name,
      cohortName: h.cohort.name,
      rows: students
        .filter((s) => s.halqaId === h.id)
        .map((s) => {
          const pages = pagesSummary(recitations.filter((r) => r.studentId === s.id));
          const loc = localSplit(localExams.filter((e) => e.studentId === s.id));
          const nom = nominationSplit(nomExams.filter((e) => e.studentId === s.id));
          const real = realAwqafSplit(awqafResults.filter((r) => r.studentId === s.id));
          const teacherNote = notes
            .filter((n) => n.studentId === s.id)
            .map((n) => n.note)
            .filter(Boolean)
            .join(" / ");
          return {
            studentId: s.id,
            studentName: s.name,
            from: pages.from,
            to: pages.to,
            newTotal: pages.newTotal,
            pastTotal: pages.pastTotal,
            locPass: loc.pass, locFail: loc.fail,
            nomPass: nom.pass, nomFail: nom.fail,
            realPass: real.pass, realFail: real.fail,
            note: teacherNote,
            noteFromTeacher: !!teacherNote,
          };
        }),
    }))
    .filter((b) => b.rows.length > 0);
}

export type TeachersPreviewRow = {
  teacherId: string;
  teacherName: string;
  halqaNames: string;
  newPages: number;
  pastPages: number;
  locPass: number; locFail: number;
  awqPass: number; awqFail: number;
  count: number;
};

export async function buildTeachersRows(from: string, to: string): Promise<TeachersPreviewRow[]> {
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { name: "asc" },
    include: { halaqatTaught: { select: { id: true, name: true } } },
  });

  const allStudents = await prisma.student.findMany({
    where: { halqaId: { in: teachers.flatMap((t) => t.halaqatTaught.map((h) => h.id)) } },
    select: { id: true, halqaId: true },
  });
  const studentIds = allStudents.map((s) => s.id);

  const [recitations, localExams, nomExams, awqafResults] = await Promise.all([
    prisma.recitation.findMany({ where: { studentId: { in: studentIds }, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId: { in: studentIds }, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId: { in: studentIds }, batch: { date: { gte: from, lte: to } } } }),
  ]);

  return teachers
    .map((t) => {
      const halqaIds = new Set(t.halaqatTaught.map((h) => h.id));
      const studs = allStudents.filter((s) => s.halqaId && halqaIds.has(s.halqaId));
      let newPages = 0, pastPages = 0, locPass = 0, locFail = 0, awqPass = 0, awqFail = 0;
      for (const s of studs) {
        const pages = pagesSummary(recitations.filter((r) => r.studentId === s.id));
        newPages += pages.newTotal;
        pastPages += pages.pastTotal;
        const loc = localSplit(localExams.filter((e) => e.studentId === s.id));
        locPass += loc.pass; locFail += loc.fail;
        const nom = nominationSplit(nomExams.filter((e) => e.studentId === s.id));
        const real = realAwqafSplit(awqafResults.filter((r) => r.studentId === s.id));
        awqPass += nom.pass + real.pass;
        awqFail += nom.fail + real.fail;
      }
      return {
        teacherId: t.id,
        teacherName: t.name,
        halqaNames: t.halaqatTaught.map((h) => h.name).join("، ") || "—",
        newPages, pastPages, locPass, locFail, awqPass, awqFail,
        count: studs.length,
      };
    })
    .filter((r) => r.halqaNames !== "—");
}

export type StudentPreview = {
  studentId: string;
  studentName: string;
  studentNo: string;
  halqaName: string;
  cohortName: string;
  attendance: { present: number; late: number; excused: number; absent: number };
  newPages: number;
  pastPages: number;
  locPass: number; locFail: number;
  nomPass: number; nomFail: number;
  realPass: number; realFail: number;
  behavior: string;
};

export async function buildStudentPreview(studentId: string, from: string, to: string): Promise<StudentPreview | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { halqa: { include: { cohort: true } } },
  });
  if (!student) return null;

  const [attendance, recitations, localExams, nomExams, awqafResults] = await Promise.all([
    prisma.attendance.findMany({ where: { studentId, date: { gte: from, lte: to } } }),
    prisma.recitation.findMany({ where: { studentId, date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId, type: "LOCAL", date: { gte: from, lte: to } } }),
    prisma.exam.findMany({ where: { studentId, type: "WAQF_NOMINATION", date: { gte: from, lte: to } } }),
    prisma.awqafResult.findMany({ where: { studentId, batch: { date: { gte: from, lte: to } } } }),
  ]);

  const pages = pagesSummary(recitations);
  const loc = localSplit(localExams);
  const nom = nominationSplit(nomExams);
  const real = realAwqafSplit(awqafResults);

  return {
    studentId: student.id,
    studentName: student.name,
    studentNo: String(student.studentNo),
    halqaName: student.halqa?.name ?? "غير مفروز",
    cohortName: student.halqa?.cohort.name ?? "—",
    attendance: {
      present: attendance.filter((a) => a.status === "PRESENT").length,
      late: attendance.filter((a) => a.status === "LATE").length,
      excused: attendance.filter((a) => a.status === "EXCUSED").length,
      absent: attendance.filter((a) => a.status === "ABSENT").length,
    },
    newPages: pages.newTotal,
    pastPages: pages.pastTotal,
    locPass: loc.pass, locFail: loc.fail,
    nomPass: nom.pass, nomFail: nom.fail,
    realPass: real.pass, realFail: real.fail,
    behavior: student.behavior,
  };
}

export type ReviewInputs = {
  name: string;
  from: string;
  to: string;
  studentId: string | null;
  halqaScope: string;
  notes: Record<string, string>;
  batchId: string;
};

/** معطيات تقرير صادر سابقًا من السجل — لإعادة إعداده بنفس المدخلات («مراجعة التقرير»). */
export async function loadReviewInputs(
  id: string | undefined,
  kind: "HALAQAT" | "TEACHERS" | "STUDENT" | "AWQAF_MARKS"
): Promise<ReviewInputs | null> {
  if (!id) return null;
  const r = await prisma.issuedReport.findUnique({ where: { id } });
  if (!r || r.kind !== kind) return null;
  let p: Record<string, unknown> = {};
  try {
    p = JSON.parse(r.paramsJson);
  } catch {
    p = {};
  }
  return {
    name: r.name,
    from: r.fromDate,
    to: r.toDate,
    studentId: r.studentId,
    halqaScope: typeof p.halqaScope === "string" ? p.halqaScope : "all",
    notes: p.notes && typeof p.notes === "object" ? (p.notes as Record<string, string>) : {},
    batchId: typeof p.batchId === "string" ? p.batchId : "",
  };
}

// ==================== تقرير علامات سبر الأوقاف ====================

/** دفعات سبر الأوقاف التي سُجّلت فيها علامة واحدة على الأقل — مرشّحة لتقرير العلامات. */
export async function listMarkedAwqafBatches(): Promise<{ id: string; date: string; marked: number; total: number }[]> {
  const batches = await prisma.awqafBatch.findMany({
    include: { results: { select: { score: true } } },
    orderBy: { date: "desc" },
  });
  return batches
    .map((b) => ({ id: b.id, date: b.date, marked: b.results.filter((r) => r.score != null).length, total: b.results.length }))
    .filter((b) => b.marked > 0);
}

export type AwqafMarksRow = {
  studentId: string;
  fullName: string;
  studentNo: number;
  examLabel: string; // مثلاً «5 غيبًا» أو «20 حاضرًا»
  teacherName: string;
  halqaName: string;
  cohortName: string;
  score: number | null;
  passed: boolean | null;
};

export async function buildAwqafMarks(batchId: string): Promise<{ date: string; rows: AwqafMarksRow[] } | null> {
  const batch = await prisma.awqafBatch.findUnique({
    where: { id: batchId },
    include: {
      results: {
        include: {
          student: {
            include: { halqa: { include: { teacher: { select: { name: true } }, cohort: { select: { name: true } } } } },
          },
        },
      },
    },
  });
  if (!batch) return null;

  // عدد الأجزاء يُؤخذ من آخر ترشيح أوقاف للطالب حتى تاريخ الدفعة، بنفس مسار حاضرًا/غيبًا
  const nominations = await prisma.exam.findMany({
    where: { type: "WAQF_NOMINATION", studentId: { in: batch.results.map((r) => r.studentId) }, date: { lte: batch.date } },
    orderBy: { date: "desc" },
    select: { studentId: true, nominationPresent: true, nominationParts: true },
  });

  const rows = batch.results
    .map((r) => {
      const s = r.student;
      const nom = nominations.find((n) => n.studentId === s.id && n.nominationPresent === r.nominationPresent);
      const mode = r.nominationPresent ? "حاضرًا" : "غيبًا";
      return {
        studentId: s.id,
        fullName: [s.name, s.fatherName, s.familyName].map((x) => x?.trim()).filter(Boolean).join(" "),
        studentNo: s.studentNo,
        examLabel: nom?.nominationParts ? `${nom.nominationParts} ${mode}` : mode,
        teacherName: s.halqa?.teacher.name ?? "—",
        halqaName: s.halqa?.name ?? "—",
        cohortName: s.halqa?.cohort.name ?? "—",
        score: r.score,
        passed: awqafPassed(r.score, r.nominationPresent),
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));

  return { date: batch.date, rows };
}
