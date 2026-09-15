-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('LOCAL', 'WAQF_NOMINATION', 'PLACEMENT');

-- CreateEnum
CREATE TYPE "EvalMode" AS ENUM ('MARK100', 'GRADE', 'LEVEL');

-- CreateTable
CREATE TABLE "EvaluationSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "placementMode" "EvalMode" NOT NULL DEFAULT 'MARK100',
    "awqafMode" "EvalMode" NOT NULL DEFAULT 'MARK100',

    CONSTRAINT "EvaluationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "examinerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "type" "ExamType" NOT NULL,
    "date" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examinerId" TEXT NOT NULL,
    "juz" INTEGER,
    "resultMark" INTEGER,
    "resultGrade" TEXT,
    "resultLevel" TEXT,
    "localTotal" INTEGER,
    "nominationPresent" BOOLEAN,
    "nominationParts" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mark" INTEGER NOT NULL,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_studentId_idx" ON "Exam"("studentId");

-- CreateIndex
CREATE INDEX "Exam_examinerId_idx" ON "Exam"("examinerId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
