-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'EXCUSED', 'ABSENT');

-- AlterTable
ALTER TABLE "Cohort" ADD COLUMN     "rotationStart" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "guardianUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guardianPasswordEnc" TEXT;

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "studentId" TEXT NOT NULL,
    "halqaId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recitation" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "none" BOOLEAN NOT NULL DEFAULT false,
    "noNew" BOOLEAN NOT NULL DEFAULT false,
    "noPast" BOOLEAN NOT NULL DEFAULT false,
    "newFrom" INTEGER,
    "newTo" INTEGER,
    "pastFrom" INTEGER,
    "pastTo" INTEGER,
    "gradeNew" TEXT,
    "gradePast" TEXT,
    "studentId" TEXT NOT NULL,
    "halqaId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_halqaId_date_idx" ON "Attendance"("halqaId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "Recitation_halqaId_date_idx" ON "Recitation"("halqaId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Recitation_studentId_date_key" ON "Recitation"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Student_guardianUserId_key" ON "Student"("guardianUserId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_guardianUserId_fkey" FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_halqaId_fkey" FOREIGN KEY ("halqaId") REFERENCES "Halqa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_halqaId_fkey" FOREIGN KEY ("halqaId") REFERENCES "Halqa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recitation" ADD CONSTRAINT "Recitation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

