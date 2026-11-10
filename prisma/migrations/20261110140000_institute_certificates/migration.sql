-- CreateEnum
CREATE TYPE "CertificateKind" AS ENUM ('AMMA', 'ARABIC');

-- CreateTable
CREATE TABLE "IssuedCertificate" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "kind" "CertificateKind" NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT,
    "dataJson" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCertificate_number_key" ON "IssuedCertificate"("number");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCertificate_kind_studentId_key" ON "IssuedCertificate"("kind", "studentId");

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
