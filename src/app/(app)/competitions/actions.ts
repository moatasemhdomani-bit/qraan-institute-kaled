"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { STAR_MAX } from "@/lib/stars";
import { entryState, MAX_ATTEMPTS } from "@/lib/competition";

export type CompResult = { error?: string; ok?: boolean };

/** خطأ داخل المعاملة يُعاد للمستخدم كما هو */
class CompError extends Error {}

const MAX_LEVELS = 20;

async function officer() {
  const session = await getSession();
  return session && session.role === "ACTIVITY_OFFICER" ? session : null;
}

function done() {
  revalidatePath("/competitions");
  revalidatePath("/activity-stars");
  revalidatePath("/stars");
}

/** مشاركات المسابقة بترتيب انضمامها — رقم المشارك = ترتيبه (1، 2، …) كما في ورقة الدوري */
async function loadEntries(competitionId: string) {
  return prisma.competitionEntry.findMany({
    where: { competitionId },
    orderBy: { createdAt: "asc" },
    include: { results: { orderBy: { createdAt: "asc" }, select: { won: true, opponentNo: true } } },
  });
}

export async function createCompetition(input: { name: string; cost: number; levels: number }): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  const name = input.name.trim();
  if (!name) return { error: "اكتبوا اسم المسابقة." };
  if (!Number.isInteger(input.cost) || input.cost < 0 || input.cost > STAR_MAX) return { error: "اكتبوا عدد النجوم للمشاركة (0 أو أكثر)." };
  if (!Number.isInteger(input.levels) || input.levels < 1 || input.levels > MAX_LEVELS) return { error: `عدد المستويات من 1 إلى ${MAX_LEVELS}.` };

  await prisma.competition.create({ data: { name, cost: input.cost, levels: input.levels, createdById: session.userId } });
  await logAction(session.userId, `أضاف المسابقة «${name}» (المشاركة ${input.cost} نجمة، ${input.levels} مستويات)`);
  done();
  return { ok: true };
}

/**
 * ضمّ طالب إلى مسابقة: أي طالب نشط من أي فوج، مرتين على الأكثر، وليس مشاركًا الآن ولم يفز بها.
 * تُخصم نجوم المشاركة من رصيده تلقائيًا (ولا يُضمّ إن لم تكفِ).
 */
export async function joinCompetition(competitionId: string, studentId: string): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };

  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { error: "المسابقة غير موجودة." };
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { active: true, halqaId: true } });
  if (!student) return { error: "الطالب غير موجود." };
  if (!student.active) return { error: "الطالب منقطع — لا يشارك في المسابقات." };

  const mine = (await loadEntries(competitionId)).filter((e) => e.studentId === studentId);
  const states = mine.map((e) => entryState(e.results, comp.levels).status);
  if (states.includes("ACTIVE")) return { error: "الطالب مشارك في هذه المسابقة الآن." };
  if (states.includes("WON")) return { error: "الطالب فاز بهذه المسابقة." };
  if (mine.length >= MAX_ATTEMPTS) return { error: "شارك الطالب في هذه المسابقة مرتين — لا يعود إليها." };

  try {
    await prisma.$transaction(async (tx) => {
      if (comp.cost > 0) {
        const r = await tx.student.updateMany({ where: { id: studentId, stars: { gte: comp.cost } }, data: { stars: { decrement: comp.cost } } });
        if (r.count === 0) throw new CompError(`نجوم الطالب أقل من ${comp.cost} — لا تكفي للمشاركة.`);
        await tx.starTxn.create({
          data: {
            kind: "WITHDRAW",
            amount: comp.cost,
            studentId,
            halqaId: student.halqaId,
            byId: session.userId,
            byRole: session.role,
            reason: `المشاركة في مسابقة «${comp.name}»${mine.length ? " — المرة الثانية" : ""}`,
          },
        });
      }
      await tx.competitionEntry.create({ data: { competitionId, studentId, attempt: mine.length + 1 } });
    });
  } catch (e) {
    if (e instanceof CompError) return { error: e.message };
    throw e;
  }
  await logAction(session.userId, `ضمّ الطالب ${await studentRef(studentId)} إلى مسابقة «${comp.name}» وسحب ${comp.cost} نجمة`);
  done();
  return { ok: true };
}

/** مباراة بين مشاركَين برقميهما: ربح للفائز وخسارة للخاسر — كلاهما مستمر في المسابقة */
export async function recordMatch(competitionId: string, winnerNo: number, loserNo: number): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  if (!Number.isInteger(winnerNo) || !Number.isInteger(loserNo)) return { error: "اكتبوا رقمي الفائز والخاسر." };
  if (winnerNo === loserNo) return { error: "الفائز والخاسر رقمان مختلفان." };

  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { error: "المسابقة غير موجودة." };
  const entries = await loadEntries(competitionId);
  const winner = entries[winnerNo - 1];
  const loser = entries[loserNo - 1];
  if (!winner) return { error: `لا مشارك برقم ${winnerNo}.` };
  if (!loser) return { error: `لا مشارك برقم ${loserNo}.` };
  if (entryState(winner.results, comp.levels).status !== "ACTIVE") return { error: `المشارك رقم ${winnerNo} لم يعد في المسابقة.` };
  if (entryState(loser.results, comp.levels).status !== "ACTIVE") return { error: `المشارك رقم ${loserNo} لم يعد في المسابقة.` };

  const matchId = randomUUID();
  await prisma.competitionResult.createMany({
    data: [
      { entryId: winner.id, won: true, opponentNo: loserNo, matchId, byId: session.userId },
      { entryId: loser.id, won: false, opponentNo: winnerNo, matchId, byId: session.userId },
    ],
  });
  await logAction(session.userId, `مسابقة «${comp.name}»: فاز رقم ${winnerNo} على رقم ${loserNo}`);
  done();
  return { ok: true };
}

/**
 * التراجع عن آخر مباراة سُجّلت في المسابقة (نتيجتا الفائز والخاسر معًا) — مباراة واحدة فقط:
 * بعد التراجع لا تراجع آخر حتى تُسجَّل مباراة جديدة.
 */
export async function undoLastMatch(competitionId: string): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  const last = await prisma.competitionResult.findFirst({
    where: { entry: { competitionId } },
    orderBy: { createdAt: "desc" },
    include: { entry: { select: { competition: { select: { name: true, lastUndoAt: true } } } } },
  });
  if (!last) return { error: "لا مباريات مسجّلة بعد." };
  const { lastUndoAt } = last.entry.competition;
  if (lastUndoAt && lastUndoAt > last.createdAt) return { error: "يُتراجع عن آخر مباراة فقط — مرة واحدة." };
  await prisma.$transaction([
    prisma.competitionResult.deleteMany({ where: { matchId: last.matchId } }),
    prisma.competition.update({ where: { id: competitionId }, data: { lastUndoAt: new Date() } }),
  ]);
  await logAction(session.userId, `مسابقة «${last.entry.competition.name}»: تراجع عن آخر مباراة`);
  done();
  return { ok: true };
}
