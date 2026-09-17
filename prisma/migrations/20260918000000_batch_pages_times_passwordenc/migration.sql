-- Cohort: split each existing single time value into a start/end pair,
-- keeping the old value as the start time (admin fills in the end time later).
ALTER TABLE "Cohort" RENAME COLUMN "time1" TO "time1Start";
ALTER TABLE "Cohort" RENAME COLUMN "time2" TO "time2Start";
ALTER TABLE "Cohort" ADD COLUMN "time1End" TEXT;
ALTER TABLE "Cohort" ADD COLUMN "time2End" TEXT;

-- User: the reversible password field is no longer guardian-exclusive.
ALTER TABLE "User" RENAME COLUMN "guardianPasswordEnc" TO "passwordEnc";

-- Exam: replace the pageFrom/pageTo range with a flat list of individual pages,
-- expanding any existing range into its full set of page numbers.
ALTER TABLE "Exam" ADD COLUMN "pages" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
UPDATE "Exam" e SET "pages" = (
  SELECT COALESCE(array_agg(g ORDER BY g), ARRAY[]::INTEGER[])
  FROM generate_series(e."pageFrom", e."pageTo") g
)
WHERE e."pageFrom" IS NOT NULL AND e."pageTo" IS NOT NULL;
ALTER TABLE "Exam" DROP COLUMN "pageFrom";
ALTER TABLE "Exam" DROP COLUMN "pageTo";
