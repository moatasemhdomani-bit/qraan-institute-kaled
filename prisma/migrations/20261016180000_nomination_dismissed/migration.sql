-- ترشيح أوقاف أُسقط من قائمة المؤهلين (عند حذف دفعته)
ALTER TABLE "Exam" ADD COLUMN "nominationDismissed" BOOLEAN NOT NULL DEFAULT false;
