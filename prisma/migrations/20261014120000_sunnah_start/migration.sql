-- الإعداد الأول للطالب في منهج السنة النبوية
CREATE TABLE "SunnahStart" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "section" "SunnahSection" NOT NULL,
    "level" INTEGER NOT NULL,
    "stage" INTEGER,
    "startNo" INTEGER NOT NULL,
    "setById" TEXT NOT NULL,
    CONSTRAINT "SunnahStart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SunnahStart_studentId_section_key" ON "SunnahStart"("studentId", "section");
ALTER TABLE "SunnahStart" ADD CONSTRAINT "SunnahStart_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SunnahStart" ADD CONSTRAINT "SunnahStart_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
