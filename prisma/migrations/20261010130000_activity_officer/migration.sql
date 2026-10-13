-- مسؤول النشاط، وإعادة النجوم المسحوبة بالغلط
ALTER TYPE "Role" ADD VALUE 'ACTIVITY_OFFICER';

ALTER TABLE "StarTxn" ADD COLUMN "reversesId" TEXT;
CREATE UNIQUE INDEX "StarTxn_reversesId_key" ON "StarTxn"("reversesId");
ALTER TABLE "StarTxn" ADD CONSTRAINT "StarTxn_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "StarTxn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
