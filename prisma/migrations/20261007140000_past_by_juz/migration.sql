-- الماضي لطلاب القرآن صار بالأجزاء والأحزاب بدل الصفحات.
-- قرار المعهد: يُحذف الماضي القديم المسجَّل بالصفحات (من صفحة/إلى صفحة/تقديره).
ALTER TABLE "Recitation" ADD COLUMN "pastItems" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Recitation" DROP COLUMN "pastFrom";
ALTER TABLE "Recitation" DROP COLUMN "pastTo";
ALTER TABLE "Recitation" DROP COLUMN "gradePast";
