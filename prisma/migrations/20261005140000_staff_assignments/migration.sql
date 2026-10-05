-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'EXAM_SUPERVISOR';

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "track" "Track" NOT NULL DEFAULT 'QURAN',

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAssignment_userId_cohortId_key" ON "StaffAssignment"("userId", "cohortId");

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ── تحويل الموظفين الحاليين إلى أدوار لكل فوج ──
-- لا نوع «مدرس قرآن غيباً» بعد اليوم: «مدرس قرآن» يدرّس حلقات قرآن حاضراً وغيباً
UPDATE "User" SET "track" = 'QURAN' WHERE "role" = 'TEACHER' AND "track" = 'QURAN_GHAIB';

-- المدرّس: في أفواج حلقاته وأفواج تدريسه المسجّلة، بنوع الحلقة (قرآن غيباً → قرآن)
INSERT INTO "StaffAssignment" ("id", "userId", "cohortId", "role", "track")
SELECT md5(random()::text || u."id" || c."cohortId"), u."id", c."cohortId", 'TEACHER',
       COALESCE((SELECT CASE WHEN h."track" = 'QURAN_GHAIB' THEN 'QURAN'::"Track" ELSE h."track" END
                 FROM "Halqa" h WHERE h."teacherId" = u."id" AND h."cohortId" = c."cohortId" LIMIT 1), u."track")
FROM "User" u
JOIN (SELECT "teacherId" AS "userId", "cohortId" FROM "Halqa"
      UNION SELECT "userId", "cohortId" FROM "CohortTeacher") c ON c."userId" = u."id"
WHERE u."role" = 'TEACHER' AND u."deletedAt" IS NULL;

-- المدير والإداري والمختبِر (ومدرّس بلا أي فوج): كل الأفواج بدورهم ونوعهم الحاليين
INSERT INTO "StaffAssignment" ("id", "userId", "cohortId", "role", "track")
SELECT md5(random()::text || u."id" || co."id"), u."id", co."id", u."role", u."track"
FROM "User" u CROSS JOIN "Cohort" co
WHERE u."deletedAt" IS NULL
  AND (u."role" IN ('DIRECTOR', 'ADMIN', 'EXAMINER')
       OR (u."role" = 'TEACHER' AND NOT EXISTS (SELECT 1 FROM "StaffAssignment" s WHERE s."userId" = u."id")));
