-- «أنهى السورة»: السور المنتهية وحدها تُحسب مسمَّعة؛ التسميع القديم كان يحسب كل سوره
ALTER TABLE "Recitation" ADD COLUMN "surahsDone" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "Recitation" SET "surahsDone" = "surahs";
