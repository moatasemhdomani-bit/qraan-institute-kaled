"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { examinerTrack, examinerLike } from "@/lib/examinerTrack";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { validateExam, passFailLabel, LOCAL_KIND_LABELS, isArabicMarkStage, arabicStageLabel, ARABIC_FINAL_STAGE, type ExamTypeId, type LocalKindId } from "@/lib/exam";
import { examFamily } from "@/lib/track";
import { promoteStudent } from "@/lib/promotion";

export type FormState = { error?: string; ok?: boolean; examId?: string };

function canEdit(session: { userId: string; role: string }, examinerId: string) {
  return session.role === "DIRECTOR" || session.userId === examinerId;
}

function revalidateExamPaths() {
  revalidatePath("/exams");
  revalidatePath("/exams/local");
  revalidatePath("/exams/awqaf");
  revalidatePath("/exams/placement");
  revalidatePath("/exams/arabic");
  revalidatePath("/exams/local-view");
  revalidatePath("/exam-monitor");
  revalidatePath("/students");
  revalidatePath("/parent");
}

/** يضيف طالبًا جديدًا لسبر تحديد المستوى فقط — الاسم وحده، بلا حلقة ولا حساب ولي أمر بعد. */
export async function addPlacementStudent(name: string): Promise<{ error?: string; studentId?: string }> {
  const session = await getSession();
  if (!session || (!examinerLike(session.role) && session.role !== "DIRECTOR")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }
  const trimmed = name.trim();
  if (!trimmed) return { error: "اكتبوا اسم الطالب." };

  const last = await prisma.student.findFirst({ orderBy: { studentNo: "desc" } });
  const nextNo = (last?.studentNo ?? 1000) + 1;
  // الطالب الجديد من نوع مختبِره (قرآن / قراءة عربية)
  const track = (await examinerTrack(session)) ?? "QURAN";
  const created = await prisma.student.create({ data: { name: trimmed, studentNo: nextNo, halqaId: null, track } });

  await logAction(session.userId, `أضاف الطالب «${trimmed}» عبر سبر تحديد مستوى`);
  revalidatePath("/exams/placement");
  revalidatePath("/exams/arabic");
  return { studentId: created.id };
}

function examLabel(type: ExamTypeId, localKind: LocalKindId | null): string {
  if (type === "LOCAL") return `سبر محلي (${LOCAL_KIND_LABELS[localKind ?? "GHAYBAN"]})`;
  if (type === "WAQF_NOMINATION") return "سبر ترشيح أوقاف";
  if (type === "ARABIC") return "سبر القراءة العربية";
  return "سبر تحديد مستوى";
}

export async function saveExam(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (!examinerLike(session.role) && session.role !== "DIRECTOR")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }

  const id = String(formData.get("id") || "") || null;
  const type = String(formData.get("type") || "") as ExamTypeId;
  const studentId = String(formData.get("studentId") || "") || null;
  const date = String(formData.get("date") || "");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (id) {
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) return { error: "السبر غير موجود." };
    if (!canEdit(session, existing.examinerId)) return { error: "غير مصرَّح لك بتعديل سبر مختبِر آخر." };
  }

  const localKindRaw = String(formData.get("localKind") || "");
  const localKind = (localKindRaw || null) as LocalKindId | null;

  const juzRaw = String(formData.get("juz") || "");
  const juz = juzRaw ? parseInt(juzRaw, 10) : null;
  // تحديد المستوى بالقراءة العربية: صفحة البداية بدل الجزء
  const startPageRaw = String(formData.get("startPage") || "");
  const startPage = type === "PLACEMENT" && startPageRaw ? parseInt(startPageRaw, 10) : null;
  const arabicPlacement = startPage != null;

  let pages: number[] = [];
  try {
    pages = JSON.parse(String(formData.get("pagesJson") || "[]"));
  } catch {
    pages = [];
  }

  // نتيجة السبر: «ناجح» (بعلامة ضمن علامات النجاح) أو «إعادة» (بلا علامة) — للسبر المحلي وترشيح الأوقاف
  // ومرحلتَي العلامة في القراءة العربية
  const outcome = String(formData.get("outcome") || "");
  const usesOutcome = type === "LOCAL" || type === "WAQF_NOMINATION" || type === "ARABIC";
  const repeat = !usesOutcome ? null : outcome === "repeat" ? true : outcome === "pass" ? false : null;
  const resultMarkRaw = String(formData.get("resultMark") || "");
  const resultMark = repeat ? null : resultMarkRaw ? parseInt(resultMarkRaw, 10) : null;

  const nominationPresentRaw = String(formData.get("nominationPresent") || "");
  const nominationPresent = nominationPresentRaw === "" ? null : nominationPresentRaw === "1";
  const nominationPartsRaw = String(formData.get("nominationParts") || "");
  const nominationParts = nominationPartsRaw ? parseInt(nominationPartsRaw, 10) : null;

  const stageRaw = String(formData.get("stage") || "");
  const stage = stageRaw ? parseInt(stageRaw, 10) : null;
  const grade = String(formData.get("grade") || "") || null;

  let studentName = "";
  if (type === "PLACEMENT" && !studentId) {
    studentName = String(formData.get("name") || "").trim();
  }

  const validationError = validateExam({
    type,
    localKind,
    juz,
    pages,
    resultMark,
    nominationPresent,
    nominationParts,
    studentName: type === "PLACEMENT" && !studentId ? studentName : undefined,
    stage,
    grade,
    startPage,
    repeat,
  });
  if (validationError) return { error: validationError };

  // سبر القراءة العربية لطلاب القراءة العربية فقط، ويجريه مختبِرها أو المدير
  // تحديد المستوى لطالب لم يُفرز بعد — يحدّد هو نفسه مستواه (قراءة عربية أو قرآن)، فلا قيد على نوعه
  if (type === "ARABIC" || (studentId && type !== "PLACEMENT")) {
    const track = await examinerTrack(session);
    const target = studentId ? await prisma.student.findUnique({ where: { id: studentId }, select: { track: true } }) : null;
    if (target?.track === "GRADUATED") return { error: "هذا الطالب متخرِّج — أنهى المستويات كلها." };
    if (type === "ARABIC" && target && examFamily(target.track) !== "ARABIC") return { error: "سبر القراءة العربية لطلاب القراءة العربية فقط." };
    if (type !== "ARABIC" && target && examFamily(target.track) === "ARABIC") return { error: "طالب القراءة العربية يُسبر بسبر القراءة العربية فقط." };
    if (track && (type === "ARABIC") !== (track === "ARABIC")) return { error: "هذا السبر ليس من نوع اختبارك." };
  }

  let finalStudentId = studentId;
  if (type === "PLACEMENT" && !finalStudentId) {
    const last = await prisma.student.findFirst({ orderBy: { studentNo: "desc" } });
    const nextNo = (last?.studentNo ?? 1000) + 1;
    // الطالب الجديد على مستوى نتيجة تحديد مستواه: قراءة عربية، أو قرآن حاضراً
    const track = arabicPlacement ? ("ARABIC" as const) : ("QURAN" as const);
    const created = await prisma.student.create({ data: { name: studentName, studentNo: nextNo, halqaId: null, track } });
    finalStudentId = created.id;
  }
  if (!finalStudentId) return { error: "لا يوجد طالب لهذا السبر." };

  const isHadiran = type === "LOCAL" && localKind === "HADIRAN";
  const usesJuz = type === "PLACEMENT" || isHadiran || (type === "LOCAL" && localKind === "GHAYBAN");

  const data = {
    type,
    date,
    studentId: finalStudentId,
    localKind: type === "LOCAL" ? localKind : null,
    juz: usesJuz && !arabicPlacement ? juz : null,
    startPage: arabicPlacement ? startPage : null,
    pages: [],
    resultMark:
      type === "WAQF_NOMINATION" || type === "LOCAL" || (type === "ARABIC" && isArabicMarkStage(stage)) ? resultMark : null,
    repeat: !!repeat && (type !== "ARABIC" || isArabicMarkStage(stage)),
    stage: type === "ARABIC" ? stage : null,
    grade: type === "ARABIC" && !isArabicMarkStage(stage) ? grade : null,
    // حاضرًا/غيبًا: لترشيح الأوقاف ولتحديد المستوى
    nominationPresent: type === "WAQF_NOMINATION" || (type === "PLACEMENT" && !arabicPlacement) ? nominationPresent : null,
    nominationParts: type === "WAQF_NOMINATION" ? nominationParts : null,
    notes,
  };

  let student = await prisma.student.findUnique({ where: { id: finalStudentId } });
  // تعديل تحديد مستوى طالب لم يُفرز بعد: يتبع مستواه نتيجة تحديد المستوى
  if (type === "PLACEMENT" && student && !student.halqaId) {
    const want = arabicPlacement ? "ARABIC" : "QURAN";
    if (examFamily(student.track) !== examFamily(want)) {
      student = await prisma.student.update({ where: { id: student.id }, data: { track: want } });
    }
  }

  // بنك أسئلة التجويد أُلغي: سبر «حاضراً» يُسجَّل بجزئه وصفحاته وعلامته فقط
  const exam = id
    ? await prisma.exam.update({ where: { id }, data })
    : await prisma.exam.create({ data: { ...data, examinerId: session.userId } });
  const examId = exam.id;

  const passFail = passFailLabel({ type, localKind, resultMark, nominationPresent, stage, grade, repeat: data.repeat });
  const resultNote = passFail ? ` — النتيجة: ${passFail}` : "";
  await logAction(session.userId, `${id ? "عدّل" : "سجّل"} ${examLabel(type, localKind)}${type === "ARABIC" && stage ? ` (${arabicStageLabel(stage)})` : ""} للطالب «${student?.name ?? ""}»${resultNote}`);

  // الترفّع التلقائي عند النجاح في سبر المستوى: يُخرَج الطالب من حلقته ويظهر عند الإدارة «ترفّع» لإعادة فرزه
  if (passFail === "ناجح" && finalStudentId) {
    if (type === "ARABIC" && stage === ARABIC_FINAL_STAGE) {
      await promoteStudent(finalStudentId, "ARABIC", session.userId, "نجح في «بينة للناس»");
    } else if (type === "LOCAL" && localKind === "AMMA_GHAYBAN") {
      await promoteStudent(finalStudentId, "AMMA", session.userId, "نجح في سبر جزء عمّ غيباً");
    }
    revalidatePath("/students");
    revalidatePath("/recitation");
  }

  revalidateExamPaths();
  return { ok: true, examId };
}

/**
 * حذف سبر: الإدارة (المدير والإداري) تحذف أي سبر من أي نوع، والمختبِر يحذف ما أجراه هو فقط.
 * الحذف لا يُلغي ترفّعًا سبق أن تمّ بنجاح هذا السبر — يُعدَّل مستوى الطالب من شؤون الطلاب إن لزم.
 */
export async function deleteExam(id: string): Promise<FormState> {
  const session = await getSession();
  if (!session) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const exam = await prisma.exam.findUnique({ where: { id }, include: { student: { select: { name: true } } } });
  if (!exam) return { error: "السبر غير موجود." };

  const isAdmin = session.role === "DIRECTOR" || session.role === "ADMIN";
  const isOwnExam = examinerLike(session.role) && exam.examinerId === session.userId;
  if (!isAdmin && !isOwnExam) return { error: "يحذف المختبِر السبر الذي أجراه هو فقط." };

  await prisma.exam.delete({ where: { id } });
  await logAction(
    session.userId,
    `حذف ${examLabel(exam.type as ExamTypeId, exam.localKind as LocalKindId | null)}${exam.type === "ARABIC" && exam.stage ? ` (${arabicStageLabel(exam.stage)})` : ""} للطالب «${exam.student.name}» بتاريخ ${exam.date}`
  );

  revalidateExamPaths();
  return { ok: true };
}
