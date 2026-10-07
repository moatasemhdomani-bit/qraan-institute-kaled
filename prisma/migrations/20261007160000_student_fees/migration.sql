-- رسوم الطالب: حالة الدفع والمبلغ بالعملة الجديدة
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'UNPAID', 'REMAINING');
ALTER TABLE "Student" ADD COLUMN "feeStatus" "FeeStatus";
ALTER TABLE "Student" ADD COLUMN "feeAmount" INTEGER;
