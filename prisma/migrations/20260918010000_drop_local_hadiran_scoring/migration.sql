-- Remove the average-of-questions scoring for local exam حاضراً — the examiner now
-- enters one overall mark directly in Exam.resultMark, like the other local kinds.
-- No existing rows use either column (verified before writing this migration).
ALTER TABLE "Exam" DROP COLUMN "localTotal";
ALTER TABLE "ExamAnswer" DROP COLUMN "mark";
