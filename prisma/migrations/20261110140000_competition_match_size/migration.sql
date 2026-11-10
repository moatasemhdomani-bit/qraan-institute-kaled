-- عدد الطلاب في المباراة، وأرقام المنافسين في المباراة الجماعية
ALTER TABLE "Competition" ADD COLUMN "matchSize" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "CompetitionResult" ADD COLUMN "opponents" TEXT;
