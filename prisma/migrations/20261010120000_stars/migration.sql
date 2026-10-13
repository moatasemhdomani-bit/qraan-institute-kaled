-- النجوم: رصيد للطالب ورصيد للحلقة، وأرشيف العمليات
CREATE TYPE "StarTxnKind" AS ENUM ('CHARGE', 'WITHDRAW');

ALTER TABLE "Student" ADD COLUMN "stars" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Halqa" ADD COLUMN "stars" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "StarTxn" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "StarTxnKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "studentId" TEXT,
    "halqaId" TEXT,
    "fromPool" BOOLEAN NOT NULL DEFAULT false,
    "byId" TEXT NOT NULL,
    "byRole" "Role" NOT NULL,
    "reason" TEXT,
    CONSTRAINT "StarTxn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StarTxn_createdAt_idx" ON "StarTxn"("createdAt");
CREATE INDEX "StarTxn_studentId_idx" ON "StarTxn"("studentId");
CREATE INDEX "StarTxn_halqaId_idx" ON "StarTxn"("halqaId");

ALTER TABLE "StarTxn" ADD CONSTRAINT "StarTxn_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StarTxn" ADD CONSTRAINT "StarTxn_halqaId_fkey" FOREIGN KEY ("halqaId") REFERENCES "Halqa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StarTxn" ADD CONSTRAINT "StarTxn_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
