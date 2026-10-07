-- «تم الدفع» تلقائيًا: للطلاب الذين لم تُحدَّد رسومهم بعد، وافتراضيًا لكل طالب جديد
UPDATE "Student" SET "feeStatus" = 'PAID' WHERE "feeStatus" IS NULL;
ALTER TABLE "Student" ALTER COLUMN "feeStatus" SET DEFAULT 'PAID';
