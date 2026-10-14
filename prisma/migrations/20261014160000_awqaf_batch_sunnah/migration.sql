-- دفعات سبر الأوقاف للسنّة النبوية
ALTER TABLE "AwqafBatch" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'QURAN';
ALTER TABLE "AwqafResult" ADD COLUMN "sunnahSection" "SunnahSection";
ALTER TABLE "AwqafResult" ADD COLUMN "sunnahLevel" INTEGER;
ALTER TABLE "AwqafResult" ADD COLUMN "sunnahExamId" TEXT;
DROP INDEX "AwqafResult_batchId_studentId_key";
CREATE UNIQUE INDEX "AwqafResult_batchId_studentId_sunnahSection_key" ON "AwqafResult"("batchId", "studentId", "sunnahSection");
