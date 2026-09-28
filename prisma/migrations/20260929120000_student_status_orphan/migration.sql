-- AlterEnum
ALTER TYPE "ReportKind" ADD VALUE 'ORPHANS';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOrphan" BOOLEAN NOT NULL DEFAULT false;
