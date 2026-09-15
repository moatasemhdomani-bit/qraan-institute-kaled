"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getEvalSettings, localTotal, validateExam, type EvalModeId, type ExamTypeId } from "@/lib/exam";

export type FormState = { error?: string; ok?: boolean; examId?: string };

function canEdit(session: { userId: string; role: string }, examinerId: string) {
  return session.role === "DIRECTOR" || session.userId === examinerId;
}

function revalidateExamPaths() {
  revalidatePath("/exams");
  revalidatePath("/exams/local");
  revalidatePath("/exams/awqaf");
  revalidatePath("/exams/placement");
  revalidatePath("/exams/local-view");
  revalidatePath("/exam-monitor");
  revalidatePath("/students");
  revalidatePath("/parent");
}

/** يضيف طالبًا جديدًا لسبر تحديد المستوى فقط — الاسم وحده، بلا حلقة ولا حساب ولي أمر بعد. */
export async function addPlacementStudent(name: string): Promise<{ error?: string; studentId?: string }> {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "DIRECTOR")) {
    return { error: "غير مصرَّح لك بهذا الإجراء." };
  }
  const trimmed = name.trim();
  if (!trimmed) return { error: "اكتبوا اسم الطالب." };

  const last = await prisma.student.findFirst({ orderBy: { studentNo: "desc" } });
  const nextNo = (last?.studentNo ?? 1000) + 1;
  const created = await prisma.student.create({ data: { name: trimmed, studentNo: nextNo, halqaId: null } });

  await logAction(session.userId, `أضاف الطالب «${trimmed}» عبر سبر تحديد مستوى`);
  revalidatePath("/exams/placement");
  return { studentId: created.id };
}

export async function saveExam(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "DIRECTOR")) {
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

  const settings = await getEvalSettings();
  const mode: EvalModeId = type === "WAQF_NOMINATION" ? settings.awqafMode : settings.placementMode;

  const juzRaw = String(formData.get("juz") || "");
  const juz = juzRaw ? parseInt(juzRaw, 10) : null;

  const resultMarkRaw = String(formData.get("resultMark") || "");
  const resultMark = resultMarkRaw ? parseInt(resultMarkRaw, 10) : null;
  const resultGrade = String(formData.get("resultGrade") || "") || null;
  const resultLevel = String(formData.get("resultLevel") || "") || null;

  const nominationPresentRaw = String(formData.get("nominationPresent") || "");
  const nominationPresent = nominationPresentRaw === "" ? null : nominationPresentRaw === "1";
  const nominationPartsRaw = String(formData.get("nominationParts") || "");
  const nominationParts = nominationPartsRaw ? parseInt(nominationPartsRaw, 10) : null;

  let answers: { questionId?: string; text: string; mark: number }[] = [];
  if (type === "LOCAL") {
    try {
      answers = JSON.parse(String(formData.get("answersJson") || "[]"));
    } catch {
      answers = [];
    }
  }

  let studentName = "";
  if (type === "PLACEMENT" && !studentId) {
    studentName = String(formData.get("name") || "").trim();
  }

  const validationError = validateExam({
    type,
    juz,
    mode,
    resultMark,
    resultGrade,
    resultLevel,
    nominationPresent,
    nominationParts,
    answers: answers.map((a) => ({ mark: a.mark })),
    studentName: type === "PLACEMENT" && !studentId ? studentName : undefined,
  });
  if (validationError) return { error: validationError };

  let finalStudentId = studentId;
  if (type === "PLACEMENT" && !finalStudentId) {
    const last = await prisma.student.findFirst({ orderBy: { studentNo: "desc" } });
    const nextNo = (last?.studentNo ?? 1000) + 1;
    const created = await prisma.student.create({ data: { name: studentName, studentNo: nextNo, halqaId: null } });
    finalStudentId = created.id;
  }
  if (!finalStudentId) return { error: "لا يوجد طالب لهذا السبر." };

  const data = {
    type,
    date,
    studentId: finalStudentId,
    juz: type === "LOCAL" || type === "PLACEMENT" ? juz : null,
    resultMark: (type === "PLACEMENT" || type === "WAQF_NOMINATION") && mode === "MARK100" ? resultMark : null,
    resultGrade: (type === "PLACEMENT" || type === "WAQF_NOMINATION") && mode === "GRADE" ? resultGrade : null,
    resultLevel: (type === "PLACEMENT" || type === "WAQF_NOMINATION") && mode === "LEVEL" ? resultLevel : null,
    nominationPresent: type === "WAQF_NOMINATION" ? nominationPresent : null,
    nominationParts: type === "WAQF_NOMINATION" ? nominationParts : null,
    localTotal: type === "LOCAL" ? localTotal(answers.map((a) => a.mark)) : null,
    notes,
  };

  const student = await prisma.student.findUnique({ where: { id: finalStudentId } });

  const examId = await prisma.$transaction(async (tx) => {
    const exam = id
      ? await tx.exam.update({ where: { id }, data })
      : await tx.exam.create({ data: { ...data, examinerId: session.userId } });

    if (type === "LOCAL") {
      await tx.examAnswer.deleteMany({ where: { examId: exam.id } });
      for (const a of answers) {
        let questionId = a.questionId;
        if (!questionId) {
          const text = a.text.trim();
          const existingQ = await tx.question.findFirst({ where: { examinerId: exam.examinerId, text } });
          questionId = existingQ ? existingQ.id : (await tx.question.create({ data: { text, examinerId: exam.examinerId } })).id;
        }
        await tx.examAnswer.create({ data: { examId: exam.id, questionId, mark: a.mark } });
      }
    }

    return exam.id;
  });

  await logAction(
    session.userId,
    `${id ? "عدّل" : "سجّل"} ${type === "LOCAL" ? "سبرًا محليًا" : type === "WAQF_NOMINATION" ? "سبر ترشيح أوقاف" : "سبر تحديد مستوى"} للطالب «${student?.name ?? ""}»`
  );

  revalidateExamPaths();
  return { ok: true, examId };
}
