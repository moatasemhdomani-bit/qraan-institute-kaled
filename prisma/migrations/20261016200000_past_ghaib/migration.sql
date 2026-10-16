-- سبر ماضٍ غيباً لمختبري القرآن
ALTER TYPE "ExamType" ADD VALUE 'PAST_GHAIB';
ALTER TABLE "Exam" ADD COLUMN "pastItems" JSONB;
