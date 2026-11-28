-- AlterTable
ALTER TABLE "FinanceTxn" ADD COLUMN "studentId" TEXT;

-- CreateIndex
CREATE INDEX "FinanceTxn_studentId_idx" ON "FinanceTxn"("studentId");

-- AddForeignKey
ALTER TABLE "FinanceTxn" ADD CONSTRAINT "FinanceTxn_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
