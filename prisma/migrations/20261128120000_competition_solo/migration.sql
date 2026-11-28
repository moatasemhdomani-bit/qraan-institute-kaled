-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "soloMatches" INTEGER, ADD COLUMN "soloQualify" INTEGER, ADD COLUMN "soloMaxPoints" INTEGER;

-- AlterTable
ALTER TABLE "CompetitionResult" ADD COLUMN "points" INTEGER;
