"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { dayLockReason, isValidDate, GRADES, formatDateAr } from "@/lib/daily";
import { validateEntry, validateSurahEntry, type RecEntry } from "@/lib/recitation";
import { recitationMode, hasPastRecitation } from "@/lib/track";
import { passedArabicStage6 } from "@/lib/arabicProgress";
import { revalidatePath } from "next/cache";

const PAST_ORDER = ["JUZ", "HIZB1", "HIZB2"];

export type SaveResult = { error?: string; ok?: boolean };

export type StudentRecitationInput = {
  halqaId: string;
  date: string;
  studentId: string;
  none: boolean;
  noNew: boolean;
  noPast: boolean;
  nf: string;
  nt: string;
  gradeNew: string;
  /** صفحة واحدة (من = إلى): ضُغط «أنهى الصفحة» */
  pageDone?: boolean;
  /** الماضي: حزب 1 / حزب 2 / جزء من الأجزاء 1–30، لكل بند تقديره */
  past: { kind: string; juz: number | null; grade: string }[];
  /** تسميع بالسور: أسماء السور مفصولة بـ | */
  surahs: string;
  /** السور التي أنهاها («أنهى السورة») مفصولة بـ | — وحدها تُحسب مسمَّعة */
  surahsDone?: string;
};

const page = (v: string): number | null => {
  const raw = v.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
};

/** حفظ تسميع طالب واحد ليوم واحد — يُستدعى من زر «حفظ» في بطاقة الطالب. */
export async function saveStudentRecitation(input: StudentRecitationInput): Promise<SaveResult> {
  const session = await getSession();
  if (!session || (session.role !== "TEACHER" && session.role !== "DIRECTOR")) {
    return { error: "تسجيل التسميع من صلاحية المدرّس أو مدير المعهد." };
  }

  const { halqaId, date, studentId } = input;
  if (!isValidDate(date)) return { error: "التاريخ غير صحيح." };

  const locked = await dayLockReason(date);
  if (locked) return { error: `${locked} — لا يُسجَّل تسميع في يوم لا دوام فيه.` };

  const halqa = await prisma.halqa.findUnique({ where: { id: halqaId } });
  if (!halqa) return { error: "الحلقة غير موجودة." };
  if (session.role === "TEACHER" && (halqa.teacherId !== session.userId || !session.cohortIds.includes(halqa.cohortId))) {
    return { error: "هذه ليست حلقتك." };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { name: true, halqaId: true } });
  if (!student || student.halqaId !== halqaId) return { error: "الطالب ليس في هذه الحلقة." };

  // التسميع بالسور: عمَّ غيباً، وطالب القراءة العربية بعد نجاحه في المرحلة 6 («بينة للناس»)
  const stage6 = halqa.track === "ARABIC" ? await passedArabicStage6([studentId]) : new Set<string>();
  if (recitationMode(halqa.track, stage6.has(studentId)) === "surah") {
    const surahs = input.surahs ? input.surahs.split("|").filter(Boolean) : [];
    if (input.gradeNew && !GRADES.includes(input.gradeNew as never)) return { error: "تقدير غير معروف." };
    const bad = validateSurahEntry({ none: input.none, surahs, gradeNew: input.gradeNew || null }, halqa.track);
    if (bad) return { error: bad };
    const surahData = {
      none: input.none,
      noNew: false,
      noPast: !input.none,
      newFrom: null,
      newTo: null,
      pastItems: [],
      gradeNew: input.none ? null : input.gradeNew,
      surahs: input.none ? [] : surahs,
      surahsDone: input.none ? [] : (input.surahsDone ?? "").split("|").filter((x) => surahs.includes(x)),
      halqaId,
      recordedById: session.userId,
    };
    const existingSurah = await prisma.recitation.findUnique({ where: { studentId_date: { studentId, date } } });
    await prisma.recitation.upsert({
      where: { studentId_date: { studentId, date } },
      update: surahData,
      create: { ...surahData, studentId, date },
    });
    await logAction(session.userId, `${existingSurah ? "عدّل" : "سجّل"} تسميع ${student.name} (حلقة ${halqa.name}) ليوم ${formatDateAr(date)}`);
    revalidatePath("/recitation");
    revalidatePath("/recitation-monitor");
    return { ok: true };
  }

  const e: RecEntry = {
    studentId,
    none: input.none,
    noNew: input.noNew,
    noPast: input.noPast,
    newFrom: page(input.nf),
    newTo: page(input.nt),
    gradeNew: input.gradeNew || null,
    pastItems: Array.isArray(input.past)
      ? input.past.map((p) => ({ kind: String(p.kind), juz: typeof p.juz === "number" ? p.juz : null, grade: String(p.grade || "") }))
      : [],
  };

  if (e.gradeNew && !GRADES.includes(e.gradeNew as never)) return { error: "تقدير غير معروف." };
  // القراءة العربية: جديد فقط بلا ماضٍ
  if (!hasPastRecitation(halqa.track)) e.noPast = true;
  const bad = validateEntry(e, halqa.track);
  if (bad) return { error: bad };

  const data = {
    none: e.none,
    noNew: e.none ? false : e.noNew,
    noPast: e.none ? false : e.noPast,
    newFrom: e.none || e.noNew ? null : e.newFrom,
    newTo: e.none || e.noNew ? null : e.newTo,
    gradeNew: e.none || e.noNew ? null : e.gradeNew,
    // صفحة واحدة: تُحسب مسمَّعة ويتقدّم بها العدّاد فقط عند «أنهى الصفحة»
    pageDone: e.none || e.noNew || e.newFrom !== e.newTo ? null : !!input.pageDone,
    // بنود الماضي بالترتيب: حسب الجزء ثم النوع
    pastItems:
      e.none || e.noPast
        ? []
        : [...e.pastItems]
            .sort((a, b) => (a.juz ?? 0) - (b.juz ?? 0) || PAST_ORDER.indexOf(a.kind) - PAST_ORDER.indexOf(b.kind))
            .map((p) => ({ kind: p.kind, juz: p.juz as number, grade: p.grade })),
    surahs: [],
    surahsDone: [],
    halqaId,
    recordedById: session.userId,
  };

  const existing = await prisma.recitation.findUnique({ where: { studentId_date: { studentId, date } } });
  await prisma.recitation.upsert({
    where: { studentId_date: { studentId, date } },
    update: data,
    create: { ...data, studentId, date },
  });

  await logAction(
    session.userId,
    `${existing ? "عدّل" : "سجّل"} تسميع ${student.name} (حلقة ${halqa.name}) ليوم ${formatDateAr(date)}`
  );

  revalidatePath("/recitation");
  revalidatePath("/recitation-monitor");
  return { ok: true };
}

/**
 * «ملاحظة الطالب» الخاصة بالمدرّس: ما يعمل على تصحيحه له — اختيارية، تظهر له وحده في شاشة التسميع
 * (لا للإدارة ولا لولي الأمر). للمدرّس وحده، ولطلاب حلقاته في أفواج حسابه النشط فقط.
 */
export async function saveStudentNote(studentId: string, note: string): Promise<SaveResult> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return { error: "غير مصرَّح لك بهذا الإجراء." };
  const text = note.trim().slice(0, 1000);

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { halqa: { select: { teacherId: true, cohortId: true } } } });
  if (!student?.halqa || student.halqa.teacherId !== session.userId || !session.cohortIds.includes(student.halqa.cohortId)) {
    return { error: "هذا الطالب ليس من طلاب حلقاتك." };
  }

  await prisma.student.update({ where: { id: studentId }, data: { teacherNote: text || null } });
  return { ok: true };
}
