-- ربط نجوم النجاح بالسبر الذي أُعطيت عليه
ALTER TABLE "StarTxn" ADD COLUMN "examId" TEXT;
CREATE INDEX "StarTxn_examId_idx" ON "StarTxn"("examId");
