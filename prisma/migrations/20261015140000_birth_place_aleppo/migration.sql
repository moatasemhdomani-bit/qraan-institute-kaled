-- مكان الولادة «حلب» للسابقين، وافتراضيًا للجدد
ALTER TABLE "Student" ALTER COLUMN "birthPlace" SET DEFAULT 'حلب';
ALTER TABLE "User" ALTER COLUMN "birthPlace" SET DEFAULT 'حلب';
UPDATE "Student" SET "birthPlace" = 'حلب' WHERE "birthPlace" IS NULL OR btrim("birthPlace") = '';
UPDATE "User" SET "birthPlace" = 'حلب' WHERE "birthPlace" IS NULL OR btrim("birthPlace") = '';
