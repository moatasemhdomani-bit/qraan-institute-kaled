-- سبر مراحل السنة النبوية
ALTER TYPE "ExamType" ADD VALUE 'SUNNAH_STAGE';
ALTER TABLE "Exam" ADD COLUMN "sunnahStage" INTEGER;
