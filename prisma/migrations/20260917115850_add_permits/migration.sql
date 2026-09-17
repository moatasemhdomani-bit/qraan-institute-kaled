-- CreateEnum
CREATE TYPE "PermitKind" AS ENUM ('ENTRY', 'EXIT');

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "kind" "PermitKind" NOT NULL,
    "time" TEXT NOT NULL,
    "note" TEXT,
    "since" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permit_studentId_kind_key" ON "Permit"("studentId", "kind");

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
