-- CreateEnum
CREATE TYPE "FinanceCurrency" AS ENUM ('SYP', 'USD');

-- AlterTable
ALTER TABLE "FinanceTxn" ADD COLUMN "currency" "FinanceCurrency" NOT NULL DEFAULT 'SYP';
