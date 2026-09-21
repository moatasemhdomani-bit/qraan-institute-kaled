-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('HALAQAT', 'TEACHERS', 'STUDENT');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "behavior" TEXT NOT NULL DEFAULT 'ممتاز';

-- CreateTable
CREATE TABLE "StudentBehaviorLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBehaviorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherMonthlyNote" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherMonthlyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedReport" (
    "id" TEXT NOT NULL,
    "kind" "ReportKind" NOT NULL,
    "name" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "studentId" TEXT,
    "issuedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentBehaviorLog_studentId_idx" ON "StudentBehaviorLog"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherMonthlyNote_studentId_month_key" ON "TeacherMonthlyNote"("studentId", "month");

-- CreateIndex
CREATE INDEX "IssuedReport_kind_idx" ON "IssuedReport"("kind");

-- AddForeignKey
ALTER TABLE "StudentBehaviorLog" ADD CONSTRAINT "StudentBehaviorLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBehaviorLog" ADD CONSTRAINT "StudentBehaviorLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherMonthlyNote" ADD CONSTRAINT "TeacherMonthlyNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedReport" ADD CONSTRAINT "IssuedReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedReport" ADD CONSTRAINT "IssuedReport_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
