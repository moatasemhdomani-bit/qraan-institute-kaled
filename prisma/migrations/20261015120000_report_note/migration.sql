-- ملاحظة التقرير الشهري الدائمة للطالب — تبدأ بآخر ملاحظة شهرية كتبها المدرّس
ALTER TABLE "Student" ADD COLUMN "reportNote" TEXT;

UPDATE "Student" s SET "reportNote" = n."note"
FROM (
  SELECT DISTINCT ON ("studentId") "studentId", "note"
  FROM "TeacherMonthlyNote"
  WHERE btrim("note") <> ''
  ORDER BY "studentId", "month" DESC, "updatedAt" DESC
) n
WHERE n."studentId" = s."id";
