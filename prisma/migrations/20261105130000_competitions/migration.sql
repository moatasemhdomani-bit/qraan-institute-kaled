-- المسابقات (مسؤول النشاط)
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "levels" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompetitionResult" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL,
    "matchId" TEXT NOT NULL,
    "opponentNo" INTEGER,
    "byId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitionEntry_competitionId_studentId_attempt_key" ON "CompetitionEntry"("competitionId", "studentId", "attempt");
CREATE INDEX "CompetitionResult_entryId_idx" ON "CompetitionResult"("entryId");
CREATE INDEX "CompetitionResult_matchId_idx" ON "CompetitionResult"("matchId");

ALTER TABLE "Competition" ADD CONSTRAINT "Competition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CompetitionEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompetitionResult" ADD CONSTRAINT "CompetitionResult_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
