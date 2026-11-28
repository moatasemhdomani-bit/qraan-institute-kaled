-- CreateTable
CREATE TABLE "AbsencePermit" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "note" TEXT,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsencePermit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsencePermit_studentId_idx" ON "AbsencePermit"("studentId");

-- CreateIndex
CREATE INDEX "AbsencePermit_from_to_idx" ON "AbsencePermit"("from", "to");

-- AddForeignKey
ALTER TABLE "AbsencePermit" ADD CONSTRAINT "AbsencePermit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsencePermit" ADD CONSTRAINT "AbsencePermit_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
