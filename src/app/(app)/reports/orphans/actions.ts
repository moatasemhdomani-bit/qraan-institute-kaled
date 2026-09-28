"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { today } from "@/lib/daily";
import { buildOrphans, type OrphanStatus } from "@/lib/reports";

export type FormState = { error?: string; ok?: boolean; reportId?: string; duplicate?: boolean };

export async function issueOrphansReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };

  // القائمة تُحفظ كما هي يوم الإصدار — فتح التقرير من السجل لاحقًا يعرضها نفسها لا القائمة الحالية
  const raw = String(formData.get("status") || "active");
  const status: OrphanStatus = raw === "all" || raw === "inactive" ? raw : "active";
  const names = await buildOrphans(status);
  const paramsJson = JSON.stringify({ status, names });

  const date = today();
  const existing = await prisma.issuedReport.findFirst({ where: { kind: "ORPHANS", name, fromDate: date, paramsJson } });
  if (existing) return { ok: true, reportId: existing.id, duplicate: true };

  const created = await prisma.issuedReport.create({
    data: { kind: "ORPHANS", name, fromDate: date, toDate: date, paramsJson, issuedById: session.userId },
  });
  return { ok: true, reportId: created.id };
}
