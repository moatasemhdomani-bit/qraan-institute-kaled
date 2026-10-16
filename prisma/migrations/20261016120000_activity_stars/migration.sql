-- رصيد نجوم النشاط لمسؤول النشاط، وربط عمليات النجوم به
ALTER TABLE "User" ADD COLUMN "activityStars" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StarTxn" ADD COLUMN "officerId" TEXT;
ALTER TABLE "StarTxn" ADD CONSTRAINT "StarTxn_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "StarTxn_officerId_idx" ON "StarTxn"("officerId");
-- عمليات مسؤول النشاط السابقة على الطلاب
UPDATE "StarTxn" SET "officerId" = "byId" WHERE "byRole" = 'ACTIVITY_OFFICER';
