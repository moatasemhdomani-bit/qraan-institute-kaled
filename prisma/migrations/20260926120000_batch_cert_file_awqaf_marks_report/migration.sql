-- AlterEnum
ALTER TYPE "ReportKind" ADD VALUE 'AWQAF_MARKS';

-- AlterTable
ALTER TABLE "AwqafBatch" ADD COLUMN     "certFileUrl" TEXT;
