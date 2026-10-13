"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { isValidDate, GRADES } from "@/lib/daily";
import { passFailLabel, ARABIC_GRADES, ARABIC_FAIL_GRADE, TYPE_LABELS } from "@/lib/exam";
import { SUNNAH_PASS_MARK, validSunnahStars, sunnahSection, sunnahBranchLabel, sunnahBook, sunnahRecLabel, levelStages, positionFromExams, sunnahMaxNo, levelExamBlock, sunnahMode, SUNNAH_REC_GRADES, stageRange, SUNNAH_NOT_AVAILABLE, type SunnahSectionId } from "@/lib/sunnah";
import { revalidatePath } from "next/cache";
import { applyStars } from "@/lib/starsServer";

/** نجوم مختبر الحديث (−2 … 10) — تُطبَّق عند تسجيل التسميع أو السبر أول مرة، لا عند التعديل. */
async function sunnahStars(studentId: string, n: number | undefined, reason: string, session: { userId: string; role: Parameters<typeof applyStars>[4] }) {
  if (!n) return;
  await applyStars(studentId, n, reason, session.userId, session.role);
  revalidatePath("/stars");
}

export type SunnahSaveResult = { error?: string; ok?: boolean };

export type SunnahExamInput = {
  id?: string | null;
  studentId: string;
  /** SUNNAH = سبر المستوى المحلي، SUNNAH_NOMINATION = سبر ترشيح الأوقاف (داخل المعهد)، SUNNAH_AWQAF = سبر الأوقاف */
  type: "SUNNAH" | "SUNNAH_NOMINATION" | "SUNNAH_AWQAF";
  section: SunnahSectionId;
  branch: number;
  date: string;
  outcome: "pass" | "repeat" | "";
  mark: number | null;
  notes: string;
  /** نجوم مختبر الحديث (−2 … 10) — للسبر المحلي وسبر الترشيح؛ لا نجوم لسبر الأوقاف */
  stars?: number;
};

const isAdmin = (role: string) => role === "DIRECTOR" || role === "ADMIN";

/**
 * من يسجّل: السبر المحلي يجريه مختبر الحديث (والمدير)، والسبر الخارجي من الأوقاف تُدخله الإدارة
 * (المدير والإداري) بتاريخه — لا دورات ثابتة التاريخ.
 */
function canRecord(role: string, type: SunnahExamInput["type"]): boolean {
  if (type === "SUNNAH" || type === "SUNNAH_NOMINATION") return role === "SUNNAH_EXAMINER" || role === "DIRECTOR";
  return isAdmin(role);
}

export async function saveSunnahExam(input: SunnahExamInput): Promise<SunnahSaveResult> {
  const session = await getSession();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };
  if (input.type !== "SUNNAH" && input.type !== "SUNNAH_NOMINATION" && input.type !== "SUNNAH_AWQAF") return { error: "اختاروا نوع السبر." };
  if (!canRecord(session.role, input.type)) {
    return { error: input.type === "SUNNAH_AWQAF" ? "نتيجة سبر الأوقاف في السنة النبوية تُدخلها الإدارة." : "هذا السبر يجريه مختبر الحديث." };
  }

  const section = sunnahSection(input.section);
  if (!section) return { error: "اختاروا القسم." };
  if (!Number.isInteger(input.branch) || input.branch < 1 || input.branch > section.branches.length) return { error: "اختاروا الفرع." };
  if (!isValidDate(input.date)) return { error: "تاريخ السبر غير صحيح." };
  if (input.outcome !== "pass" && input.outcome !== "repeat") return { error: "اختاروا نتيجة السبر: ناجح أو إعادة." };
  const repeat = input.outcome === "repeat";
  const mark = repeat ? null : input.mark;
  if (!repeat && (mark == null || !Number.isInteger(mark) || mark < SUNNAH_PASS_MARK || mark > 100)) {
    return { error: `علامة النجاح من ${SUNNAH_PASS_MARK} إلى 100.` };
  }
  const stars = input.type === "SUNNAH_AWQAF" || input.id ? 0 : (input.stars ?? 0);
  if (!validSunnahStars(stars)) return { error: "النجوم من −2 إلى 10." };

  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { name: true } });
  if (!student) return { error: "الطالب غير موجود." };

  if (input.id) {
    const existing = await prisma.exam.findUnique({ where: { id: input.id } });
    if (!existing || (existing.type !== "SUNNAH" && existing.type !== "SUNNAH_NOMINATION" && existing.type !== "SUNNAH_AWQAF")) return { error: "السبر غير موجود." };
    // التعديل: المدير، أو من سجّله
    if (session.role !== "DIRECTOR" && existing.examinerId !== session.userId) return { error: "غير مصرَّح لك بتعديل سبر سجّله غيرك." };
  }

  // التسلسل: المراحل ← السبر المحلي للمستوى (ترشيح الأوقاف) ← سبر الأوقاف
  const prior = await prisma.exam.findMany({
    where: {
      studentId: input.studentId,
      sunnahSection: input.section,
      stage: input.branch,
      type: { in: ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_STAGE"] },
      ...(input.id ? { NOT: { id: input.id } } : {}),
    },
    select: { type: true, sunnahSection: true, stage: true, resultMark: true, repeat: true, grade: true, sunnahStage: true },
  });
  const blocked = levelExamBlock(
    input.type,
    input.section,
    input.branch,
    prior.map((e) => ({ type: e.type, section: e.sunnahSection, branch: e.stage, mark: e.resultMark, repeat: e.repeat, grade: e.grade, stageNo: e.sunnahStage })),
    await loadStart(input.studentId, input.section)
  );
  if (blocked) return { error: blocked };

  const data = {
    type: input.type,
    date: input.date,
    studentId: input.studentId,
    sunnahSection: input.section,
    stage: input.branch,
    resultMark: mark,
    repeat,
    notes: input.notes.trim() || null,
  };
  if (input.id) await prisma.exam.update({ where: { id: input.id }, data });
  else await prisma.exam.create({ data: { ...data, examinerId: session.userId } });

  await sunnahStars(
    input.studentId,
    stars,
    `${TYPE_LABELS[input.type]} — ${sunnahBranchLabel(input.section, input.branch, false)}${repeat ? " (إعادة)" : ""}`,
    session
  );

  const result = passFailLabel({ type: input.type, resultMark: mark, repeat });
  await logAction(
    session.userId,
    `${input.id ? "عدّل" : "سجّل"} ${TYPE_LABELS[input.type]} — ${sunnahBranchLabel(input.section, input.branch, false)} للطالب ${await studentRef(input.studentId)}${result ? ` — ${result}` : ""}`
  );
  revalidatePath("/exams/sunnah", "layout");
  revalidatePath("/exams/awqaf-batches");
  revalidatePath("/exam-monitor");
  revalidatePath("/parent");
  revalidatePath("/students");
  return { ok: true };
}

/**
 * جلسة تسميع السنة النبوية بالأرقام — أكثر من رقم في الجلسة، ولكل رقم تقديره
 * («إعادة» يبقى ضمن التالي). يسجّلها مختبر الحديث (والمدير).
 */
export async function saveSunnahRecitation(input: {
  studentId: string;
  section: SunnahSectionId;
  book: string;
  items: { no: number; grade: string }[];
  date: string;
  /** نجوم مختبر الحديث للجلسة (−2 … 10) */
  stars?: number;
}): Promise<SunnahSaveResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUNNAH_EXAMINER" && session.role !== "DIRECTOR")) return { error: "تسميع السنة النبوية من صلاحية مختبر الحديث." };
  if (!sunnahSection(input.section)) return { error: "اختاروا المنهج." };
  const book = sunnahBook(input.section, input.book);
  if (!book) return { error: "اختاروا الكتاب." };
  if (input.items.length === 0) return { error: `أضيفوا ${book.unit} واحدًا على الأقل.` };
  if (input.items.length > 200) return { error: "عدد كبير جدًا في جلسة واحدة." };
  const seen = new Set<number>();
  for (const it of input.items) {
    if (!Number.isInteger(it.no) || it.no < 1) return { error: `رقم ${book.unit} غير صحيح.` };
    if (seen.has(it.no)) return { error: `الرقم ${it.no} مكرَّر في الجلسة.` };
    seen.add(it.no);
    if (!(SUNNAH_REC_GRADES as readonly string[]).includes(it.grade)) return { error: `اختاروا للرقم ${it.no}: ناجح أو إعادة.` };
  }
  if (!isValidDate(input.date)) return { error: "التاريخ غير صحيح." };
  const stars = input.stars ?? 0;
  if (!validSunnahStars(stars)) return { error: "النجوم من −2 إلى 10." };

  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { name: true } });
  if (!student) return { error: "الطالب غير موجود." };

  // التدرّج: لا يُسمَّع بعد آخر رقم في المرحلة الحالية حتى ينجح في سبرها (ولا المستوى التالي قبل سبر المستوى)
  const pos = await loadPosition(input.studentId, input.section);
  if (!pos.finished && !pos.stages) return { error: SUNNAH_NOT_AVAILABLE };
  const max = sunnahMaxNo(pos);
  if (pos.stages && max != null) {
    if (input.book !== pos.book) return { error: `الطالب الآن في «${sunnahBook(input.section, pos.book)?.label ?? ""}» — المستوى ${pos.level}.` };
    if (input.items.some((it) => it.no > max)) {
      return {
        error: pos.awaitingLevelExam
          ? `أنهى الطالب مراحل المستوى ${pos.level} — لا يُسمَّع بعد ${book.unit} ${max} حتى ينجح في سبر المستوى.`
          : `لا يُسمَّع بعد ${book.unit} ${max} حتى ينجح الطالب في سبر المرحلة ${pos.stage}.`,
      };
    }
  }

  const items = [...input.items].sort((a, b) => a.no - b.no);
  await prisma.sunnahRecitation.createMany({
    data: items.map((it) => ({
      studentId: input.studentId,
      section: input.section,
      book: input.book,
      fromNo: it.no,
      toNo: it.no,
      grade: it.grade,
      date: input.date,
      examinerId: session.userId,
    })),
  });
  await logAction(
    session.userId,
    `سجّل تسميع السنة النبوية للطالب ${await studentRef(input.studentId)}: ${book.label} — ${items.map((it) => `${it.no} (${it.grade})`).join("، ")}`
  );
  await sunnahStars(input.studentId, stars, `تسميع السنة النبوية — ${book.label}: ${items.map((it) => it.no).join("، ")}`, session);
  revalidatePath("/exams/sunnah", "layout");
  revalidatePath("/exams/awqaf-batches");
  return { ok: true };
}

/** حذف تسميع: المدير والإداري، أو من سجّله. */
export async function deleteSunnahRecitation(id: string): Promise<SunnahSaveResult> {
  const session = await getSession();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const rec = await prisma.sunnahRecitation.findUnique({ where: { id }, include: { student: { select: { name: true } } } });
  if (!rec) return { error: "التسميع غير موجود." };
  if (!isAdmin(session.role) && rec.examinerId !== session.userId) return { error: "يحذف المختبِر ما سجّله هو فقط." };
  await prisma.sunnahRecitation.delete({ where: { id } });
  await logAction(session.userId, `حذف تسميع السنة النبوية للطالب ${await studentRef(rec.studentId)}: ${sunnahRecLabel(rec.section, rec.book, rec.fromNo, rec.toNo)}`);
  revalidatePath("/exams/sunnah", "layout");
  revalidatePath("/exams/awqaf-batches");
  return { ok: true };
}

/** موقع الطالب الآن في المنهج — من سبوره المحفوظة */
async function loadStart(studentId: string, section: SunnahSectionId) {
  const st = await prisma.sunnahStart.findUnique({ where: { studentId_section: { studentId, section } } });
  return st ? { level: st.level, stage: st.stage, startNo: st.startNo } : null;
}

async function loadPosition(studentId: string, section: SunnahSectionId) {
  const start = await loadStart(studentId, section);
  const exams = await prisma.exam.findMany({
    where: { studentId, sunnahSection: section, type: { in: ["SUNNAH", "SUNNAH_NOMINATION", "SUNNAH_AWQAF", "SUNNAH_STAGE"] } },
    select: { type: true, sunnahSection: true, stage: true, resultMark: true, repeat: true, grade: true, sunnahStage: true },
  });
  return positionFromExams(
    section,
    exams.map((e) => ({ type: e.type, section: e.sunnahSection, branch: e.stage, mark: e.resultMark, repeat: e.repeat, grade: e.grade, stageNo: e.sunnahStage })),
    start
  );
}

/**
 * سبر المرحلة داخل المعهد — بتقدير (ممتاز / جيد جدًا / جيد / إعادة). يجريه مختبر الحديث (والمدير).
 * النجاح فيه يفتح أرقام المرحلة التالية للتسميع.
 */
export async function saveSunnahStageExam(input: {
  id?: string | null;
  studentId: string;
  section: SunnahSectionId;
  level: number;
  stage: number;
  grade: string;
  date: string;
  notes: string;
  /** نجوم مختبر الحديث (−2 … 10) */
  stars?: number;
}): Promise<SunnahSaveResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUNNAH_EXAMINER" && session.role !== "DIRECTOR")) return { error: "سبر المراحل من صلاحية مختبر الحديث." };
  const stars = input.stars ?? 0;
  if (!validSunnahStars(stars)) return { error: "النجوم من −2 إلى 10." };
  const stages = levelStages(input.section, input.level);
  if (!stages) return { error: "لا مراحل مُدخلة لهذا المستوى." };
  if (!Number.isInteger(input.stage) || input.stage < 1 || input.stage > stages.length) return { error: "اختاروا المرحلة." };
  if (!(SUNNAH_REC_GRADES as readonly string[]).includes(input.grade)) return { error: "اختاروا النتيجة: ناجح أو إعادة." };
  // لا يُفتح سبر المرحلة حتى يصل الطالب إليه: سمّع كل أرقامها بغير «إعادة»
  if (!input.id) {
    const [pos, start, history] = await Promise.all([
      loadPosition(input.studentId, input.section),
      loadStart(input.studentId, input.section),
      prisma.sunnahRecitation.findMany({ where: { studentId: input.studentId, section: input.section } }),
    ]);
    const mode = sunnahMode(
      pos,
      history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
      start,
      true
    );
    if (pos.level !== input.level || pos.stage !== input.stage || mode !== "stageExam") {
      return { error: "لم يصل الطالب بعد إلى سبر هذه المرحلة — يُسمّع أرقامها كلها أولًا." };
    }
  }
  if (!isValidDate(input.date)) return { error: "التاريخ غير صحيح." };
  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { name: true } });
  if (!student) return { error: "الطالب غير موجود." };
  if (input.id) {
    const existing = await prisma.exam.findUnique({ where: { id: input.id } });
    if (!existing || existing.type !== "SUNNAH_STAGE") return { error: "السبر غير موجود." };
    if (session.role !== "DIRECTOR" && existing.examinerId !== session.userId) return { error: "غير مصرَّح لك بتعديل سبر سجّله غيرك." };
  }
  const data = {
    type: "SUNNAH_STAGE" as const,
    date: input.date,
    studentId: input.studentId,
    sunnahSection: input.section,
    stage: input.level,
    sunnahStage: input.stage,
    grade: input.grade,
    repeat: input.grade === ARABIC_FAIL_GRADE,
    resultMark: null,
    notes: input.notes.trim() || null,
  };
  if (input.id) await prisma.exam.update({ where: { id: input.id }, data });
  else await prisma.exam.create({ data: { ...data, examinerId: session.userId } });

  await sunnahStars(
    input.studentId,
    input.id ? 0 : stars,
    `سبر المرحلة ${input.stage} — ${sunnahBranchLabel(input.section, input.level, false)} (${input.grade})`,
    session
  );
  await logAction(
    session.userId,
    `${input.id ? "عدّل" : "سجّل"} سبر المرحلة ${input.stage} — ${sunnahBranchLabel(input.section, input.level, false)} للطالب ${await studentRef(input.studentId)} — ${input.grade}`
  );
  revalidatePath("/exams/sunnah", "layout");
  revalidatePath("/exams/awqaf-batches");
  revalidatePath("/exam-monitor");
  revalidatePath("/parent");
  return { ok: true };
}

/**
 * الإعداد الأول لطالب في منهج (لم يسمّع فيه بعد): يختار المختبِر الكتاب والمستوى والمرحلة ورقم الحديث الذي يبدأ منه.
 * ما قبل ذلك يُعدّ منجزًا. يُعدَّل ما دام الطالب لم يسمّع ولم يُسبر في هذا المنهج.
 */
export async function saveSunnahStart(input: { studentId: string; section: SunnahSectionId; level: number; stage: number | null; startNo: number }): Promise<SunnahSaveResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUNNAH_EXAMINER" && session.role !== "DIRECTOR")) return { error: "الإعداد الأول من صلاحية مختبر الحديث." };
  const sec = sunnahSection(input.section);
  if (!sec) return { error: "المنهج غير معروف." };
  if (!Number.isInteger(input.level) || input.level < 1 || input.level > sec.branches.length) return { error: "اختاروا المستوى." };
  const stages = levelStages(input.section, input.level);
  if (!stages) return { error: SUNNAH_NOT_AVAILABLE };
  if (!input.stage || input.stage < 1 || input.stage > stages.length) return { error: "اختاروا المرحلة." };
  const stage = stages ? input.stage : null;
  if (!Number.isInteger(input.startNo) || input.startNo < 1) return { error: "اكتبوا رقم الحديث." };
  if (stages && stage) {
    const { from, to } = stageRange(input.section, input.level, stage);
    if (input.startNo < from || input.startNo > to) return { error: `رقم الحديث في هذه المرحلة من ${from} إلى ${to}.` };
  }
  const student = await prisma.student.findUnique({ where: { id: input.studentId }, select: { name: true } });
  if (!student) return { error: "الطالب غير موجود." };
  const [recs, exams] = await Promise.all([
    prisma.sunnahRecitation.count({ where: { studentId: input.studentId, section: input.section } }),
    prisma.exam.count({ where: { studentId: input.studentId, sunnahSection: input.section } }),
  ]);
  if (recs || exams) return { error: "سمّع الطالب أو سُبر في هذا المنهج — لا يُعدَّل إعداده الأول." };

  const data = { level: input.level, stage, startNo: input.startNo, setById: session.userId };
  await prisma.sunnahStart.upsert({
    where: { studentId_section: { studentId: input.studentId, section: input.section } },
    update: data,
    create: { ...data, studentId: input.studentId, section: input.section },
  });
  await logAction(
    session.userId,
    `الإعداد الأول للطالب ${await studentRef(input.studentId)} في ${sec.label}: المستوى ${input.level}${stage ? ` — المرحلة ${stage}` : ""} — من الرقم ${input.startNo}`
  );
  revalidatePath("/exams/sunnah", "layout");
  return { ok: true };
}
