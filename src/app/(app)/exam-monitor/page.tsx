import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cohortScope } from "@/lib/examinerTrack";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ExamMonitorClient from "./ExamMonitorClient";

export default async function ExamMonitorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "DIRECTOR" && session.role !== "ADMIN" && session.role !== "TEACHER" && session.role !== "EXAM_SUPERVISOR") redirect("/dashboard");

  const [halaqatRaw, examsRaw, awqafResultsRaw] = await Promise.all([
    prisma.halqa.findMany({
      // المدرّس حلقاته في أفواج حسابه؛ مشرف مختبرين القرآن حلقات القرآن في أفواجه — المدير والإداري الكل
      where:
        session.role === "TEACHER"
          ? { teacherId: session.userId, ...cohortScope(session) }
          : session.role === "EXAM_SUPERVISOR"
            ? { track: { in: ["AMMA", "QURAN", "QURAN_GHAIB"] }, ...cohortScope(session) }
            : undefined,
      include: { teacher: { select: { name: true } }, cohort: { select: { name: true } }, students: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.exam.findMany({
      where: { student: { halqaId: { not: null } } },
      include: { examiner: { select: { id: true, name: true } }, student: { select: { id: true, name: true, halqaId: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.awqafResult.findMany({
      where: { student: { halqaId: { not: null } } },
      include: { batch: { select: { date: true } }, student: { select: { id: true, name: true, halqaId: true } } },
      orderBy: { batch: { date: "desc" } },
    }),
  ]);

  const blocks = halaqatRaw.map((h) => {
    const examRows = examsRaw
      .filter((e) => e.student.halqaId === h.id)
      .map((e) => ({
        id: e.id,
        studentId: e.studentId,
        studentName: e.student.name,
        type: e.type as (typeof e.type) | "AWQAF_ACTUAL",
        examinerId: e.examinerId,
        examinerName: e.examiner.name,
        batchId: null as string | null,
        date: e.date,
        localKind: e.localKind,
        juz: e.juz,
        startPage: e.startPage,
        pages: e.pages,
        resultMark: e.resultMark,
        repeat: e.repeat,
        nominationPresent: e.nominationPresent,
        nominationParts: e.nominationParts,
        stage: e.stage,
        grade: e.grade,
        notes: e.notes,
        certArrived: false,
        certArchived: false,
        certDelivered: false,
      }));

    const awqafRows = awqafResultsRaw
      .filter((r) => r.student.halqaId === h.id)
      .map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.student.name,
        type: "AWQAF_ACTUAL" as const,
        examinerId: "",
        examinerName: "جهة الأوقاف",
        batchId: r.batchId as string | null,
        date: r.batch.date,
        localKind: null,
        juz: null,
        pages: [] as number[],
        resultMark: r.score,
        nominationPresent: r.nominationPresent,
        // عدد الأجزاء من آخر ترشيح للطالب حتى تاريخ الدفعة، بنفس مسار حاضرًا/غيبًا
        nominationParts:
          examsRaw.find(
            (e) => e.type === "WAQF_NOMINATION" && e.studentId === r.studentId && e.nominationPresent === r.nominationPresent && e.date <= r.batch.date
          )?.nominationParts ?? null,
        notes: null as string | null,
        certArrived: r.certArrived,
        certArchived: r.certArchived,
        certDelivered: r.certDelivered,
      }));

    const rows = [...examRows, ...awqafRows].sort((a, b) => b.date.localeCompare(a.date));

    const sobredIds = new Set(examRows.map((r) => r.studentId));
    const neverCount = h.students.filter((s) => !sobredIds.has(s.id)).length;

    return {
      id: h.id,
      name: h.name,
      meta: `${h.teacher.name} · ${h.cohort.name} · ${h.students.length} طالبًا`,
      rows,
      neverLabel: neverCount > 0 ? `${neverCount} طالبًا لم يُسبَر بعد` : "",
    };
  });

  // المدرّس يرى في الفلترة أنواع السبر التي يُختبر بها طلابه فقط: القراءة العربية لمدرّسها، وأنواع القرآن لمدرّس القرآن
  const me = session.role === "TEACHER" || session.role === "EXAM_SUPERVISOR" ? { track: session.track } : null;
  const typeFilters: ("LOCAL" | "WAQF_NOMINATION" | "AWQAF_ACTUAL" | "ARABIC")[] = !me
    ? ["LOCAL", "WAQF_NOMINATION", "AWQAF_ACTUAL", "ARABIC"]
    : me.track === "ARABIC"
      ? ["ARABIC"]
      : ["LOCAL", "WAQF_NOMINATION", "AWQAF_ACTUAL"];

  return (
    <>
      <PageHeader
        title="متابعة السبر"
        subtitle={"سبورات كل الحلقات، وما لم يُسبَر بعد" + (session.role === "DIRECTOR" ? " — يمكنك إجراء سبر لأي حلقة." : ".")}
      />
      <ExamMonitorClient
        canEdit={session.role === "DIRECTOR"}
        isDirector={session.role === "DIRECTOR"}
        canManageAwqaf={session.role === "DIRECTOR" || session.role === "ADMIN"}
        canDelete={session.role === "DIRECTOR" || session.role === "ADMIN"}
        currentUserId={session.userId}
        blocks={blocks}
        typeFilters={typeFilters}
      />
    </>
  );
}
