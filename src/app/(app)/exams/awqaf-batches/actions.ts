"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseHalfMark, isHalfStep } from "@/lib/numbers";
import { logAction, studentRef } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { isValidDate } from "@/lib/daily";
import { awqafPassed, certStepLocked, type CertStep } from "@/lib/awqaf";
import crypto from "crypto";
import { uploadFile, mimeFromExt } from "@/lib/storage";
import { promoteStudent } from "@/lib/promotion";
import { sunnahAwqafCandidates } from "@/lib/sunnahServer";
import { SUNNAH_PASS_MARK, type SunnahSectionId } from "@/lib/sunnah";

export type FormState = { error?: string; ok?: boolean; batchId?: string };

function canManage(session: { role: string } | null): session is { userId: string; role: string } {
  return !!session && (session.role === "ADMIN" || session.role === "DIRECTOR");
}

function revalidateAwqafPaths() {
  revalidatePath("/exams/awqaf-batches");
  revalidatePath("/exams/awqaf");
  revalidatePath("/parent");
}

export async function createAwqafBatch(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const date = String(formData.get("date") || "");
  if (!isValidDate(date)) return { error: "اختاروا تاريخ الدفعة." };

  // دفعة السنّة النبوية: الناجحون في سبر ترشيح الأوقاف للسنّة — طالب ومنهج ومستوى
  if (String(formData.get("kind") || "") === "SUNNAH") {
    let picked: { studentId: string; section: string; level: number }[] = [];
    try {
      picked = JSON.parse(String(formData.get("sunnahJson") || "[]"));
    } catch {
      picked = [];
    }
    if (picked.length === 0) return { error: "اختاروا طالبًا واحدًا على الأقل." };
    const ready = await sunnahAwqafCandidates();
    const ok = picked.filter((x) => ready.some((r) => r.studentId === x.studentId && r.section === x.section && r.level === x.level));
    if (ok.length !== picked.length) return { error: "بعض الطلاب المختارين ليسوا من الناجحين في سبر ترشيح الأوقاف للسنّة — أعيدوا فتح الشاشة." };
    const batch = await prisma.awqafBatch.create({
      data: {
        date,
        kind: "SUNNAH",
        createdById: session.userId,
        results: {
          create: ok.map((x) => ({ studentId: x.studentId, nominationPresent: false, sunnahSection: x.section as SunnahSectionId, sunnahLevel: x.level })),
        },
      },
    });
    await logAction(session.userId, `فتح دفعة سبر أوقاف السنّة النبوية بتاريخ ${date} — ${ok.length} طالبًا`);
    revalidateAwqafPaths();
    return { ok: true, batchId: batch.id };
  }

  let studentIds: string[] = [];
  try {
    studentIds = JSON.parse(String(formData.get("studentIdsJson") || "[]"));
  } catch {
    studentIds = [];
  }
  studentIds = Array.from(new Set(studentIds.filter(Boolean)));
  if (studentIds.length === 0) return { error: "اختاروا طالبًا واحدًا على الأقل." };

  const students = await prisma.student.findMany({ where: { id: { in: studentIds } } });

  // مسار كل طالب (حاضرًا/غيبًا) يُؤخذ من آخر ترشيح أوقاف ناجح له، ويُلقَط هنا لتثبيت حدّ نجاحه في هذه الدفعة
  const nominations = await prisma.exam.findMany({
    where: { type: "WAQF_NOMINATION", studentId: { in: studentIds } },
    orderBy: { date: "desc" },
    select: { studentId: true, nominationPresent: true },
  });
  const presentByStudent = new Map<string, boolean>();
  for (const n of nominations) if (!presentByStudent.has(n.studentId)) presentByStudent.set(n.studentId, n.nominationPresent ?? false);

  const batch = await prisma.awqafBatch.create({
    data: {
      date,
      kind: "QURAN",
      createdById: session.userId,
      results: {
        create: studentIds.map((studentId) => ({ studentId, nominationPresent: presentByStudent.get(studentId) ?? false })),
      },
    },
  });

  await logAction(session.userId, `فتح دفعة سبر أوقاف بتاريخ ${date} — ${students.length} طالبًا`);
  revalidateAwqafPaths();
  return { ok: true, batchId: batch.id };
}

export async function saveAwqafScore(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const id = String(formData.get("id") || "");
  const scoreRaw = String(formData.get("score") || "");
  const score = parseHalfMark(scoreRaw);
  if (score != null && (!isHalfStep(score) || score < 0 || score > 100)) {
    return { error: "العلامة من 0 إلى 100 — عدد صحيح أو بكسر 0.25 أو 0.5 أو 0.75 (مثل 92.75)." };
  }

  const result = await prisma.awqafResult.findUnique({ where: { id }, include: { student: true, batch: true } });
  if (!result) return { error: "السجل غير موجود." };

  await prisma.awqafResult.update({ where: { id }, data: { score } });

  // دفعة السنّة: العلامة تُسجَّل سبرَ أوقاف للطالب في منهجه ومستواه (SUNNAH_AWQAF) — منها تقدّمه وتقاريره
  if (result.sunnahSection && result.sunnahLevel) {
    if (score == null) {
      if (result.sunnahExamId) await prisma.exam.delete({ where: { id: result.sunnahExamId } }).catch(() => {});
      await prisma.awqafResult.update({ where: { id }, data: { sunnahExamId: null } });
    } else {
      const data = {
        type: "SUNNAH_AWQAF" as const,
        date: result.batch.date,
        studentId: result.studentId,
        sunnahSection: result.sunnahSection,
        stage: result.sunnahLevel,
        resultMark: score >= SUNNAH_PASS_MARK ? score : null,
        repeat: score < SUNNAH_PASS_MARK,
        notes: score < SUNNAH_PASS_MARK ? `علامة الأوقاف ${score} / 100` : null,
      };
      const existing = result.sunnahExamId ? await prisma.exam.findUnique({ where: { id: result.sunnahExamId } }) : null;
      if (existing) await prisma.exam.update({ where: { id: existing.id }, data });
      else {
        const ex = await prisma.exam.create({ data: { ...data, examinerId: session.userId } });
        await prisma.awqafResult.update({ where: { id }, data: { sunnahExamId: ex.id } });
      }
    }
    revalidatePath("/exams/sunnah", "layout");
    revalidatePath("/exam-monitor");
  }

  const passed = awqafPassed(score, result.nominationPresent);
  const passNote = passed == null ? "" : passed ? " — ناجح" : " — إعادة";
  await logAction(session.userId, `أدخل علامة سبر الأوقاف للطالب ${await studentRef(result.studentId)}: ${score ?? "—"}${passNote}`);

  // الترفّع بعد النجاح في سبر الأوقاف الفعلي لـ 30 جزءًا (عدد الأجزاء من آخر ترشيح له بالمسار نفسه حتى تاريخ الدفعة):
  // 30 حاضراً ← «قرآن غيباً» ويُخرَج من حلقته لإعادة فرزه، و30 غيباً ← «متخرِّج» تلقائيًا
  if (passed && !result.sunnahSection) {
    const nomination = await prisma.exam.findFirst({
      where: { type: "WAQF_NOMINATION", studentId: result.studentId, nominationPresent: result.nominationPresent, date: { lte: result.batch.date } },
      orderBy: { date: "desc" },
      select: { nominationParts: true },
    });
    if (nomination?.nominationParts === 30) {
      await promoteStudent(
        result.studentId,
        result.nominationPresent ? "QURAN" : "QURAN_GHAIB",
        session.userId,
        `نجح في سبر الأوقاف الفعلي (30 جزءًا ${result.nominationPresent ? "حاضراً" : "غيباً"})`
      );
      revalidatePath("/students");
    }
  }

  revalidateAwqafPaths();
  return { ok: true };
}

async function saveCertFile(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `cert-${crypto.randomUUID()}.${ext}`;
  return uploadFile(filename, bytes, mimeFromExt(ext));
}

const STEP_LABELS: Record<CertStep, string> = { arrived: "وصول الشهادة", archived: "أرشفة الشهادة", delivered: "تسليم الشهادة" };

export async function setCertStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const id = String(formData.get("id") || "");
  const step = String(formData.get("step") || "") as CertStep;
  const value = String(formData.get("value") || "") === "1";

  const result = await prisma.awqafResult.findUnique({ where: { id }, include: { student: true } });
  if (!result) return { error: "السجل غير موجود." };

  if (value && certStepLocked(step, result)) {
    return { error: `${STEP_LABELS[step]} مقفلة حتى تتحقق الخطوة السابقة.` };
  }
  if (step === "archived" && value) {
    return { error: "الأرشفة تتم بملف واحد لكل الدفعة — زر «أرشفة الشهادات» أعلى صفحة الدفعة." };
  }

  const data: { certArrived?: boolean; certArchived?: boolean; certDelivered?: boolean; certFileUrl?: string } = {};
  if (step === "arrived") {
    data.certArrived = value;
    if (!value) { data.certArchived = false; data.certDelivered = false; }
  } else if (step === "archived") {
    data.certArchived = value;
    if (!value) data.certDelivered = false;
  } else if (step === "delivered") {
    data.certDelivered = value;
  }

  await prisma.awqafResult.update({ where: { id }, data });
  await logAction(session.userId, `${value ? "أثبت" : "ألغى"} ${STEP_LABELS[step]} لشهادة الطالب ${await studentRef(result.studentId)}`);

  revalidateAwqafPaths();
  return { ok: true };
}

export async function bulkSetCertStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const batchId = String(formData.get("batchId") || "");
  const step = String(formData.get("step") || "") as CertStep;

  const [results, batch] = await Promise.all([
    prisma.awqafResult.findMany({ where: { batchId } }),
    prisma.awqafBatch.findUnique({ where: { id: batchId }, select: { certFileUrl: true } }),
  ]);
  const eligible = results.filter((r) => {
    if (awqafPassed(r.score, r.nominationPresent) !== true) return false;
    if (step === "arrived") return !r.certArrived;
    if (step === "archived") return r.certArrived && !r.certArchived;
    return r.certArchived && !r.certDelivered;
  });

  if (eligible.length === 0) return { error: "لا يوجد أحد مؤهَّل لهذه الخطوة الآن." };
  if (step === "archived" && !batch?.certFileUrl && eligible.some((r) => !r.certFileUrl)) {
    return { error: "بعض الطلاب بلا ملف شهادة مرفوع — ارفعوا الملف لكل طالب أولًا." };
  }

  const ids = eligible.map((r) => r.id);
  if (step === "arrived") await prisma.awqafResult.updateMany({ where: { id: { in: ids } }, data: { certArrived: true } });
  else if (step === "archived") await prisma.awqafResult.updateMany({ where: { id: { in: ids } }, data: { certArchived: true } });
  else await prisma.awqafResult.updateMany({ where: { id: { in: ids } }, data: { certDelivered: true } });

  await logAction(session.userId, `طبّق ${STEP_LABELS[step]} جماعيًا على ${eligible.length} طالبًا`);
  revalidateAwqafPaths();
  return { ok: true };
}

/** أرشفة شهادات الدفعة كلها بملف واحد — يُعدّ كل ناجح فيها «وصلت شهادته وأُرشفت». */
export async function archiveBatchCerts(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const batchId = String(formData.get("batchId") || "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "اختاروا ملف الشهادات الممسوحة (PDF أو صورة)." };

  const batch = await prisma.awqafBatch.findUnique({ where: { id: batchId }, include: { results: true } });
  if (!batch) return { error: "الدفعة غير موجودة." };

  const passedIds = batch.results.filter((r) => awqafPassed(r.score, r.nominationPresent) === true).map((r) => r.id);
  if (passedIds.length === 0) return { error: "لا ناجحين في هذه الدفعة بعد — أدخلوا العلامات أولًا." };

  const certFileUrl = await saveCertFile(file);
  await prisma.$transaction([
    prisma.awqafBatch.update({ where: { id: batchId }, data: { certFileUrl } }),
    prisma.awqafResult.updateMany({ where: { id: { in: passedIds } }, data: { certArrived: true, certArchived: true } }),
  ]);

  await logAction(session.userId, `أرشف شهادات دفعة سبر الأوقاف بتاريخ ${batch.date} بملف واحد — ${passedIds.length} ناجحًا`);
  revalidateAwqafPaths();
  revalidatePath(`/exams/awqaf-batches/${batchId}`);
  revalidatePath("/exam-monitor");
  return { ok: true };
}

/** حذف نتيجة سبر الأوقاف الفعلي (الطالب من الدفعة) — للإدارة وحدها. */
export async function deleteAwqafResult(id: string): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const result = await prisma.awqafResult.findUnique({ where: { id }, include: { student: true, batch: true } });
  if (!result) return { error: "السجل غير موجود." };

  await prisma.awqafResult.delete({ where: { id } });
  if (result.sunnahExamId) await prisma.exam.delete({ where: { id: result.sunnahExamId } }).catch(() => {});
  await logAction(session.userId, `حذف سبر الأوقاف الفعلي للطالب ${await studentRef(result.studentId)} من دفعة ${result.batch.date}`);

  revalidateAwqafPaths();
  revalidatePath(`/exams/awqaf-batches/${result.batchId}`);
  revalidatePath("/exam-monitor");
  return { ok: true };
}

/**
 * حذف دفعة سبر أوقاف كاملة: نتائج طلابها وشهاداتهم، وسجلات سبر الأوقاف للسنّة المقابلة لعلاماتها.
 * ترفيع طالب القرآن الذي نجح فيها (إن حدث) لا يُلغى — يُعدَّل مستواه من «شؤون الطلاب» إن لزم.
 */
export async function deleteAwqafBatch(id: string, removeFromEligible: boolean): Promise<FormState> {
  const session = await getSession();
  if (!canManage(session)) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const batch = await prisma.awqafBatch.findUnique({
    where: { id },
    include: { results: { select: { studentId: true, sunnahExamId: true, sunnahSection: true, sunnahLevel: true } } },
  });
  if (!batch) return { error: "الدفعة غير موجودة." };
  const sunnahExamIds = batch.results.map((r) => r.sunnahExamId).filter((x): x is string => !!x);

  // «حذف الطلاب من قائمة المؤهلين»: يُسقَط ترشيح كل طالب الذي دخل به الدفعة (آخر ترشيح له حتى تاريخها)
  const dismiss: string[] = [];
  if (removeFromEligible) {
    for (const r of batch.results) {
      const nom = await prisma.exam.findFirst({
        where: r.sunnahSection
          ? { studentId: r.studentId, type: "SUNNAH_NOMINATION", sunnahSection: r.sunnahSection, stage: r.sunnahLevel, sunnahStage: null, repeat: false, date: { lte: batch.date } }
          : { studentId: r.studentId, type: "WAQF_NOMINATION", repeat: false, date: { lte: batch.date } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { id: true },
      });
      if (nom) dismiss.push(nom.id);
    }
  }

  await prisma.$transaction([
    prisma.exam.deleteMany({ where: { id: { in: sunnahExamIds } } }),
    prisma.exam.updateMany({ where: { id: { in: dismiss } }, data: { nominationDismissed: true } }),
    prisma.awqafBatch.delete({ where: { id } }),
  ]);
  await logAction(
    session.userId,
    `حذف دفعة سبر أوقاف ${batch.kind === "SUNNAH" ? "السنّة النبوية" : "القرآن الكريم"} بتاريخ ${batch.date} — ${batch.results.length} طالبًا${removeFromEligible ? " — وحُذف طلابها من قائمة المؤهلين لسبر الأوقاف" : " — وعاد طلابها إلى قائمة المؤهلين"}`
  );
  revalidateAwqafPaths();
  revalidatePath("/exams/sunnah", "layout");
  revalidatePath("/exam-monitor");
  return { ok: true };
}
