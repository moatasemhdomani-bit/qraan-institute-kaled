-- علامات السبر تقبل نصف درجة (مثل 92.5)
ALTER TABLE "Exam" ALTER COLUMN "resultMark" TYPE DOUBLE PRECISION;
ALTER TABLE "AwqafResult" ALTER COLUMN "score" TYPE DOUBLE PRECISION;
