-- صندوق المعهد (المالية): إيداع / سحب بالليرة السورية مع سبب إجباري
CREATE TYPE "FinanceKind" AS ENUM ('DEPOSIT', 'WITHDRAW');

CREATE TABLE "FinanceTxn" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "FinanceKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "byId" TEXT NOT NULL,
    CONSTRAINT "FinanceTxn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceTxn_date_idx" ON "FinanceTxn"("date");

ALTER TABLE "FinanceTxn" ADD CONSTRAINT "FinanceTxn_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
