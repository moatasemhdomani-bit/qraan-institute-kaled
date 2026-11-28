"use server";

import { randomUUID } from "crypto";
import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAction, studentRef } from "@/lib/audit";
import { STAR_MAX } from "@/lib/stars";
import { entryState, soloRules, MAX_ATTEMPTS } from "@/lib/competition";

export type CompResult = { error?: string; ok?: boolean };

/** خطأ داخل المعاملة يُعاد للمستخدم كما هو */
class CompError extends Error {}

const MAX_LEVELS = 20;
const MAX_MATCH = 20;

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
    include: { results: { orderBy: { createdAt: "asc" }, select: { won: true, opponentNo: true, opponents: true, points: true } } },
  });
}

export async function createCompetition(input: {
  name: string;
  cost: number;
  levels: number;
  matchSize: number;
  /** مسابقة الطالب الواحد (matchSize = 1) */
  soloMatches?: number;
  soloQualify?: number;
  soloMaxPoints?: number;
}): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  const name = input.name.trim();
  if (!name) return { error: "اكتبوا اسم المسابقة." };
  if (!Number.isInteger(input.cost) || input.cost < 0 || input.cost > STAR_MAX) return { error: "اكتبوا عدد النجوم للمشاركة (0 أو أكثر)." };
  if (!Number.isInteger(input.levels) || input.levels < 1 || input.levels > MAX_LEVELS) return { error: `عدد المستويات من 1 إلى ${MAX_LEVELS}.` };
  const solo = input.matchSize === 1;
  if (!Number.isInteger(input.matchSize) || input.matchSize < 1 || input.matchSize > MAX_MATCH || (!solo && input.matchSize % 2 !== 0)) {
    return { error: `عدد الطلاب في المباراة 1، أو عدد زوجي من 2 إلى ${MAX_MATCH}.` };
  }
  let soloData = {};
  if (solo) {
    const { soloMatches: m, soloQualify: q, soloMaxPoints: p } = input;
    if (!Number.isInteger(m) || m! < 1 || m! > 50) return { error: "عدد المباريات في المستوى من 1 إلى 50." };
    if (!Number.isInteger(p) || p! < 1 || p! > 1000) return { error: "أقصى نقاط المباراة من 1 إلى 1000." };
    if (!Number.isInteger(q) || q! < 1 || q! > m! * p!) return { error: `نقاط التأهل من 1 إلى ${m! * p!} (المباريات × أقصى النقاط).` };
    soloData = { soloMatches: m, soloQualify: q, soloMaxPoints: p };
  }

  await prisma.competition.create({ data: { name, cost: input.cost, levels: input.levels, matchSize: input.matchSize, ...soloData, createdById: session.userId } });
  await logAction(
    session.userId,
    solo
      ? `أضاف المسابقة «${name}» (المشاركة ${input.cost} نجمة، ${input.levels} مستويات، طالب واحد في المباراة: ${input.soloMatches} مباريات في المستوى، التأهل بـ ${input.soloQualify} نقطة، وأقصى نقاط المباراة ${input.soloMaxPoints})`
      : `أضاف المسابقة «${name}» (المشاركة ${input.cost} نجمة، ${input.levels} مستويات، ${input.matchSize} طلاب في المباراة)`
  );
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

  const all = (await loadEntries(competitionId)).filter((e) => e.studentId === studentId);
  // المشاركة المحذوفة لا تُحسب: لا تمنع عودته ولا تُعدّ من مرّتيه
  const mine = all.filter((e) => !e.removedAt);
  const states = mine.map((e) => entryState(e.results, comp.levels, soloRules(comp)).status);
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
      await tx.competitionEntry.create({ data: { competitionId, studentId, attempt: Math.max(0, ...all.map((e) => e.attempt)) + 1 } });
    });
  } catch (e) {
    if (e instanceof CompError) return { error: e.message };
    throw e;
  }
  await logAction(session.userId, `ضمّ الطالب ${await studentRef(studentId)} إلى مسابقة «${comp.name}» وسحب ${comp.cost} نجمة`);
  done();
  return { ok: true };
}

/**
 * مباراة برقمي المشاركين كما في ورقة الدوري: نصف طلاب المباراة فائزون ونصفهم خاسرون (4 طلاب = فائزان وخاسران).
 * لكل فائز «ف» بأرقام الخاسرين، ولكل خاسر «خ» بأرقام الفائزين — وكلهم مستمرون في المسابقة.
 */
export async function recordMatch(competitionId: string, winnerNos: number[], loserNos: number[]): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };

  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { error: "المسابقة غير موجودة." };
  if (comp.matchSize === 1) return { error: "هذه مسابقة الطالب الواحد — تُسجَّل نقاط الطالب." };
  const half = comp.matchSize / 2;
  const all = [...winnerNos, ...loserNos];
  if (winnerNos.length !== half || loserNos.length !== half || all.some((n) => !Number.isInteger(n))) {
    return { error: `اكتبوا أرقام ${half === 1 ? "الفائز والخاسر" : `${half} فائزين و${half} خاسرين`}.` };
  }
  if (new Set(all).size !== all.length) return { error: "رقم مكرَّر في المباراة — لكل طالب رقم واحد." };

  const entries = await loadEntries(competitionId);
  for (const n of all) {
    const entry = entries[n - 1];
    if (!entry) return { error: `لا مشارك برقم ${n}.` };
    if (entry.removedAt) return { error: `المشارك رقم ${n} محذوف من المسابقة.` };
    if (entryState(entry.results, comp.levels).status !== "ACTIVE") return { error: `المشارك رقم ${n} لم يعد في المسابقة.` };
  }

  const matchId = randomUUID();
  const list = (nos: number[]) => (nos.length === 1 ? { opponentNo: nos[0], opponents: null } : { opponentNo: null, opponents: nos.join("، ") });
  await prisma.competitionResult.createMany({
    data: [
      ...winnerNos.map((n) => ({ entryId: entries[n - 1].id, won: true, ...list(loserNos), matchId, byId: session.userId })),
      ...loserNos.map((n) => ({ entryId: entries[n - 1].id, won: false, ...list(winnerNos), matchId, byId: session.userId })),
    ],
  });
  await logAction(session.userId, `مسابقة «${comp.name}»: فاز ${winnerNos.join("، ")} على ${loserNos.join("، ")}`);
  done();
  return { ok: true };
}

/** مسابقة الطالب الواحد: نقاط مشارك في مباراة (من 0 إلى أقصى نقاط المباراة) */
export async function recordSoloMatch(competitionId: string, no: number, points: number): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { error: "المسابقة غير موجودة." };
  const rules = soloRules(comp);
  if (!rules) return { error: "هذه المسابقة ليست مسابقة الطالب الواحد." };
  const max = comp.soloMaxPoints ?? 0;
  if (!Number.isInteger(points) || points < 0 || points > max) return { error: `النقاط من 0 إلى ${max}.` };
  const entries = await loadEntries(competitionId);
  const entry = entries[no - 1];
  if (!entry) return { error: `لا مشارك برقم ${no}.` };
  if (entry.removedAt) return { error: `المشارك رقم ${no} محذوف من المسابقة.` };
  if (entryState(entry.results, comp.levels, rules).status !== "ACTIVE") return { error: `المشارك رقم ${no} لم يعد في المسابقة.` };
  await prisma.competitionResult.create({ data: { entryId: entry.id, won: true, points, matchId: randomUUID(), byId: session.userId } });
  await logAction(session.userId, `مسابقة «${comp.name}»: المشارك ${no} — ${points} نقطة`);
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

/** إعادة نجوم المشاركة لأصحاب المشاركات المحذوفة (شحن في سجل النجوم بسببه) */
async function refundEntries(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  entries: { id: string; studentId: string; refunded: boolean; student: { halqaId: string | null } }[],
  comp: { name: string; cost: number },
  byId: string,
  byRole: Role
) {
  if (comp.cost <= 0) return;
  for (const e of entries) {
    if (e.refunded) continue;
    await tx.student.update({ where: { id: e.studentId }, data: { stars: { increment: comp.cost } } });
    await tx.starTxn.create({
      data: { kind: "CHARGE", amount: comp.cost, studentId: e.studentId, halqaId: e.student.halqaId, byId, byRole, reason: `إعادة نجوم المشاركة في مسابقة «${comp.name}» بعد حذفها` },
    });
  }
}

/** حذف مسابقات بمشاركاتها ونتائجها — مع إعادة نجوم المشاركة للطلاب إن اختار ذلك */
export async function deleteCompetitions(ids: string[], refund: boolean): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  if (!ids.length) return { error: "لا مسابقات للحذف." };
  const comps = await prisma.competition.findMany({
    where: { id: { in: ids } },
    include: { entries: { select: { id: true, studentId: true, refunded: true, student: { select: { halqaId: true } } } } },
  });
  if (!comps.length) return { error: "المسابقة غير موجودة." };
  await prisma.$transaction(async (tx) => {
    for (const c of comps) {
      if (refund) await refundEntries(tx, c.entries, c, session.userId, session.role);
      await tx.competition.delete({ where: { id: c.id } });
    }
  });
  for (const c of comps) {
    await logAction(session.userId, `حذف المسابقة «${c.name}» (${c.entries.length} مشاركة)${refund && c.cost > 0 && c.entries.length ? ` وأعاد ${c.cost} نجمة لكل مشارك` : ""}`);
  }
  done();
  return { ok: true };
}

/** حذف مشاركين من مسابقة: تُحذف نتائجهم وحدهم وتبقى نتائج خصومهم — مع إعادة نجوم المشاركة إن اختار ذلك */
export async function deleteEntries(competitionId: string, studentIds: string[], refund: boolean): Promise<CompResult> {
  const session = await officer();
  if (!session) return { error: "المسابقات من صلاحية مسؤول النشاط." };
  if (!studentIds.length) return { error: "لا طلاب للحذف." };
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) return { error: "المسابقة غير موجودة." };
  const entries = await prisma.competitionEntry.findMany({
    where: { competitionId, studentId: { in: studentIds }, removedAt: null },
    select: { id: true, studentId: true, refunded: true, student: { select: { name: true, halqaId: true } } },
  });
  if (!entries.length) return { error: "الطالب غير مشارك في المسابقة." };
  // لم تجرِ أي مباراة: يُحذف سطره وتُزاح الأرقام بعده — وإلا يبقى سطره ورقمه ونتائجه ويُكتب عليه «هذا الطالب محذوف»
  const played = (await prisma.competitionResult.count({ where: { entry: { competitionId } } })) > 0;
  await prisma.$transaction(async (tx) => {
    if (refund) await refundEntries(tx, entries, comp, session.userId, session.role);
    const ids = entries.map((e) => e.id);
    if (played) await tx.competitionEntry.updateMany({ where: { id: { in: ids } }, data: { removedAt: new Date(), ...(refund ? { refunded: true } : {}) } });
    else await tx.competitionEntry.deleteMany({ where: { id: { in: ids } } });
  });
  const names = [...new Set(entries.map((e) => e.student.name))].join("، ");
  await logAction(session.userId, `مسابقة «${comp.name}»: حذف ${names} (${entries.length} مشاركة)${refund && comp.cost > 0 ? ` وأعاد ${comp.cost} نجمة لكل مشاركة` : ""}`);
  done();
  return { ok: true };
}
