-- رقم الموظف في البصّامة، ونوع تقرير «حضور الموظفين»
ALTER TABLE "User" ADD COLUMN "fingerprintNo" INTEGER;
CREATE UNIQUE INDEX "User_fingerprintNo_key" ON "User"("fingerprintNo");
ALTER TYPE "ReportKind" ADD VALUE 'STAFF_ATTENDANCE';
