-- CreateEnum
CREATE TYPE "LocalKind" AS ENUM ('GHAYBAN', 'HADIRAN', 'AMMA_GHAYBAN');

-- Existing local-exam answers referenced the old free-text Question bank,
-- which this migration replaces with the fixed TajweedTopic bank.
DELETE FROM "ExamAnswer";

-- DropForeignKey
ALTER TABLE "ExamAnswer" DROP CONSTRAINT "ExamAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_examinerId_fkey";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "localKind" "LocalKind",
ADD COLUMN     "pageFrom" INTEGER,
ADD COLUMN     "pageTo" INTEGER;

-- AlterTable
ALTER TABLE "ExamAnswer" DROP COLUMN "questionId",
ADD COLUMN     "topicId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Question";

-- CreateTable
CREATE TABLE "TajweedTopic" (
    "id" TEXT NOT NULL,
    "juz" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TajweedTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TajweedTopic_juz_idx" ON "TajweedTopic"("juz");

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "TajweedTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
