-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "resultGrade",
DROP COLUMN "resultLevel";

-- DropTable
DROP TABLE "EvaluationSettings";

-- DropEnum
DROP TYPE "EvalMode";
