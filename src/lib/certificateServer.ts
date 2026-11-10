import { prisma, rawPrisma, nameWithNasab, studentFullName } from "./db";
import { passFailLabel } from "./exam";
import { ARABIC_CERT_STAGE, type CertificateData, type CertificateKindId } from "./certificate";

/** طالب مستحق لشهادة: آخر سبر ناجح يؤهّله، وشهادته إن كانت صدرت */
export type CertificateCandidate = {
  studentId: string;
  no: number;
  name: string;
  halqa: string;
  active: boolean;
  examId: string;
  examDate: string;
  mark: number | null;
  cert: { id: string; number: number; date: string } | null;
};

/** السبورات التي تؤهّل لكل نوع */
function qualifyingExams(kind: CertificateKindId) {
  return prisma.exam.findMany({
    // القراءة العربية: المرحلة 6 (آخر مراحل الكتاب) — لا «بينة للناس»
    where: kind === "AMMA" ? { type: "LOCAL", localKind: "AMMA_GHAYBAN" } : { type: "ARABIC", stage: ARABIC_CERT_STAGE },
    select: { id: true, studentId: true, date: true, type: true, localKind: true, stage: true, grade: true, resultMark: true, repeat: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

/** آخر سبر ناجح مؤهِّل لكل طالب */
async function latestPassByStudent(kind: CertificateKindId) {
  const exams = await qualifyingExams(kind);
  const byStudent = new Map<string, (typeof exams)[number]>();
  for (const e of exams) {
    if (byStudent.has(e.studentId)) continue;
    if (passFailLabel(e) === "ناجح") byStudent.set(e.studentId, e);
  }
  return byStudent;
}

/** كل الطلاب المستحقين لنوع من الشهادات، مع ما صدر منها */
export async function certificateCandidates(kind: CertificateKindId): Promise<CertificateCandidate[]> {
  const passes = await latestPassByStudent(kind);
  const ids = [...passes.keys()];
  if (ids.length === 0) return [];
  const [students, certs] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true, studentNo: true, name: true, active: true, halqa: { select: { name: true } } },
    }),
    prisma.issuedCertificate.findMany({ where: { kind, studentId: { in: ids } }, select: { id: true, studentId: true, number: true, dataJson: true } }),
  ]);
  const certBy = new Map(certs.map((c) => [c.studentId, c]));
  return students
    .map((s) => {
      const e = passes.get(s.id)!;
      const c = certBy.get(s.id);
      return {
        studentId: s.id,
        no: s.studentNo,
        name: s.name,
        halqa: s.halqa?.name ?? "",
        active: s.active,
        examId: e.id,
        examDate: e.date,
        mark: e.resultMark,
        cert: c ? { id: c.id, number: c.number, date: (JSON.parse(c.dataJson) as CertificateData).issueDate } : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

/** يبني لقطة بيانات الشهادة لطالب مستحق — أو null إن لم يعد مستحقًا */
export async function buildCertificateData(kind: CertificateKindId, studentId: string, issueDate: string) {
  const passes = await latestPassByStudent(kind);
  const exam = passes.get(studentId);
  if (!exam) return null;
  const s = await rawPrisma.student.findUnique({
    where: { id: studentId },
    select: { name: true, fatherName: true, familyName: true, birthDate: true, birthPlace: true },
  });
  if (!s) return null;
  const data: CertificateData = {
    // شهادة عمّ: الاسم الثلاثي؛ شهادة القراءة العربية فيها «ابن السيد» فيُكتب الاسم مع النسبة وحده
    name: kind === "AMMA" ? studentFullName(s.name, s.fatherName, s.familyName) : nameWithNasab(s.name, s.familyName),
    fatherName: s.fatherName?.trim() ?? "",
    birthPlace: s.birthPlace?.trim() ?? "",
    birthYear: s.birthDate?.match(/\d{4}/)?.[0] ?? "",
    mark: exam.resultMark,
    examDate: exam.date,
    issueDate,
  };
  return { examId: exam.id, data };
}
