-- التراجع عن مباراة واحدة فقط
ALTER TABLE "Competition" ADD COLUMN "lastUndoAt" TIMESTAMP(3);
