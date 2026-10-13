-- تسميع السنة النبوية بالأرقام
CREATE TABLE "SunnahRecitation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "section" "SunnahSection" NOT NULL,
    "book" TEXT NOT NULL,
    "fromNo" INTEGER NOT NULL,
    "toNo" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "notes" TEXT,
    "examinerId" TEXT NOT NULL,
    CONSTRAINT "SunnahRecitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SunnahRecitation_studentId_section_idx" ON "SunnahRecitation"("studentId", "section");

ALTER TABLE "SunnahRecitation" ADD CONSTRAINT "SunnahRecitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SunnahRecitation" ADD CONSTRAINT "SunnahRecitation_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
