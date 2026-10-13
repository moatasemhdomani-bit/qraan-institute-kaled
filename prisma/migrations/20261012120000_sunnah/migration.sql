-- منهج السنة النبوية: مختبر حديث، والسبر المحلي والخارجي بالقسم والفرع
ALTER TYPE "Role" ADD VALUE 'SUNNAH_EXAMINER';
ALTER TYPE "ExamType" ADD VALUE 'SUNNAH';
ALTER TYPE "ExamType" ADD VALUE 'SUNNAH_AWQAF';

CREATE TYPE "SunnahSection" AS ENUM ('HADITH', 'SHAMAIL', 'SIRA');
ALTER TABLE "Exam" ADD COLUMN "sunnahSection" "SunnahSection";
