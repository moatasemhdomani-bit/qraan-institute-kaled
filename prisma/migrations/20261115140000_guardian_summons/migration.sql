-- CreateTable
CREATE TABLE "GuardianSummons" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "byId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendedAt" TIMESTAMP(3),

    CONSTRAINT "GuardianSummons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuardianSummons_studentId_attendedAt_idx" ON "GuardianSummons"("studentId", "attendedAt");

-- AddForeignKey
ALTER TABLE "GuardianSummons" ADD CONSTRAINT "GuardianSummons_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianSummons" ADD CONSTRAINT "GuardianSummons_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
