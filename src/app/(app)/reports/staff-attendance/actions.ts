"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseFingerprintXls, buildStaffAttendance, type StaffAttendanceResult } from "@/lib/staffAttendance";

const MAX_BYTES = 10 * 1024 * 1024;

async function fromUpload(formData: FormData): Promise<StaffAttendanceResult | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "اختاروا ملف البصّامة (.XLS)." };
  if (file.size > MAX_BYTES) return { error: "الملف كبير جدًا." };
  try {
    const parsed = parseFingerprintXls(Buffer.from(await file.arrayBuffer()));
    return await buildStaffAttendance(parsed);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "تعذّرت قراءة الملف." };
  }
}

export async function previewStaffAttendance(formData: FormData): Promise<{ result: StaffAttendanceResult } | { error: string }> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const res = await fromUpload(formData);
  return "error" in res ? res : { result: res };
}

export type IssueState = { error?: string; ok?: boolean; reportId?: string };

/** الإصدار: يُعاد حساب الملف نفسه ويُحفظ الناتج في السجل (الملف لا يُخزَّن) */
export async function issueStaffAttendance(formData: FormData): Promise<IssueState> {
  const session = await getSession();
  if (!session || (session.role !== "DIRECTOR" && session.role !== "ADMIN")) return { error: "غير مصرَّح لك بهذا الإجراء." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "اكتبوا اسمًا يُعرَف به التقرير في السجل لاحقًا." };
  const res = await fromUpload(formData);
  if ("error" in res) return res;
  if (!res.rows.length) return { error: "لا موظفين مربوطين بأرقام البصمة — أضيفوا «رقم البصمة» للموظفين من «إدارة المستخدمين»." };

  const created = await prisma.issuedReport.create({
    data: {
      kind: "STAFF_ATTENDANCE",
      name,
      fromDate: res.from,
      toDate: res.to,
      paramsJson: JSON.stringify({ totalDays: res.totalDays, rows: res.rows }),
      issuedById: session.userId,
    },
  });
  return { ok: true, reportId: created.id };
}
