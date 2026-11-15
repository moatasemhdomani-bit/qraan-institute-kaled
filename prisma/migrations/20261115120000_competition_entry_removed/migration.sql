-- AlterTable
ALTER TABLE "CompetitionEntry" ADD COLUMN "removedAt" TIMESTAMP(3),
ADD COLUMN "refunded" BOOLEAN NOT NULL DEFAULT false;
