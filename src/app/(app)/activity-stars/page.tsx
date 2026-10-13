import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { starTxnRow, STAR_TXN_INCLUDE } from "@/lib/starsServer";
import PageHeader from "@/components/PageHeader";
import ActivityStarsClient from "./ActivityStarsClient";

const ARCHIVE_LIMIT = 200;

/** مسؤول النشاط: يسحب النجوم من أي طالب في المعهد مقابل دخوله النشاط، ويعيد ما سحبه بالغلط. */
export default async function ActivityStarsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ACTIVITY_OFFICER") redirect("/dashboard");

  const [studentsRaw, halaqat, txns] = await Promise.all([
    prisma.student.findMany({
      where: { active: true },
      select: { id: true, name: true, studentNo: true, stars: true, halqaId: true },
      orderBy: { studentNo: "asc" },
    }),
    prisma.halqa.findMany({ select: { id: true, name: true } }),
    prisma.starTxn.findMany({
      where: { byId: session.userId, byRole: "ACTIVITY_OFFICER" },
      orderBy: { createdAt: "desc" },
      take: ARCHIVE_LIMIT,
      include: STAR_TXN_INCLUDE,
    }),
  ]);
  const halqaNames = Object.fromEntries(halaqat.map((h) => [h.id, h.name]));

  return (
    <>
      <PageHeader title="نجوم النشاط" subtitle="سحب النجوم من الطلاب مقابل دخولهم النشاط — وإعادة ما سُحب بالغلط." />
      <ActivityStarsClient
        students={studentsRaw.map((s) => ({
          id: s.id,
          name: s.name,
          no: s.studentNo,
          stars: s.stars,
          halqaName: s.halqaId ? (halqaNames[s.halqaId] ?? null) : null,
        }))}
        archive={txns.map(starTxnRow)}
        archiveLimit={ARCHIVE_LIMIT}
      />
    </>
  );
}
