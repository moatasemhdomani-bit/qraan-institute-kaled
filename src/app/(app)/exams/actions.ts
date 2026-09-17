"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { localTotal, validateExam, LOCAL_KIND_LABELS, type ExamTypeId, type LocalKindId } from "@/lib/exam";

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

function examLabel(type: ExamTypeId, localKind: LocalKindId | null): string {
  if (type === "LOCAL") return `سبر محلي (${LOCAL_KIND_LABELS[localKind ?? "GHAYBAN"]})`;
  if (type === "WAQF_NOMINATION") return "سبر ترشيح أوقاف";
  return "سبر تحديد مستوى";
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

  const localKindRaw = String(formData.get("localKind") || "");
  const localKind = (localKindRaw || null) as LocalKindId | null;

  const juzRaw = String(formData.get("juz") || "");
  const juz = juzRaw ? parseInt(juzRaw, 10) : null;

  const pageFromRaw = String(formData.get("pageFrom") || "");
  const pageFrom = pageFromRaw ? parseInt(pageFromRaw, 10) : null;
  const pageToRaw = String(formData.get("pageTo") || "");
  const pageTo = pageToRaw ? parseInt(pageToRaw, 10) : null;

  const resultMarkRaw = String(formData.get("resultMark") || "");
  const resultMark = resultMarkRaw ? parseInt(resultMarkRaw, 10) : null;

  const nominationPresentRaw = String(formData.get("nominationPresent") || "");
  const nominationPresent = nominationPresentRaw === "" ? null : nominationPresentRaw === "1";
  const nominationPartsRaw = String(formData.get("nominationParts") || "");
  const nominationParts = nominationPartsRaw ? parseInt(nominationPartsRaw, 10) : null;

  let answers: { topicId: string; mark: number }[] = [];
  if (type === "LOCAL" && localKind === "HADIRAN") {
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
    localKind,
    juz,
    pageFrom,
    pageTo,
    resultMark,
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

  const isHadiran = type === "LOCAL" && localKind === "HADIRAN";

  const data = {
    type,
    date,
    studentId: finalStudentId,
    localKind: type === "LOCAL" ? localKind : null,
    juz: type === "PLACEMENT" || isHadiran ? juz : null,
    pageFrom: type === "LOCAL" ? pageFrom : null,
    pageTo: type === "LOCAL" ? pageTo : null,
    resultMark: type === "WAQF_NOMINATION" || (type === "LOCAL" && !isHadiran) ? resultMark : null,
    nominationPresent: type === "WAQF_NOMINATION" ? nominationPresent : null,
    nominationParts: type === "WAQF_NOMINATION" ? nominationParts : null,
    localTotal: isHadiran ? localTotal(answers.map((a) => a.mark)) : null,
    notes,
  };

  const student = await prisma.student.findUnique({ where: { id: finalStudentId } });

  const examId = await prisma.$transaction(async (tx) => {
    const exam = id
      ? await tx.exam.update({ where: { id }, data })
      : await tx.exam.create({ data: { ...data, examinerId: session.userId } });

    if (isHadiran) {
      await tx.examAnswer.deleteMany({ where: { examId: exam.id } });
      for (const a of answers) {
        await tx.examAnswer.create({ data: { examId: exam.id, topicId: a.topicId, mark: a.mark } });
      }
    }

    return exam.id;
  });

  await logAction(session.userId, `${id ? "عدّل" : "سجّل"} ${examLabel(type, localKind)} للطالب «${student?.name ?? ""}»`);

  revalidateExamPaths();
  return { ok: true, examId };
}
