-- إلغاء «متبقي»: يُكتب في ملاحظة الإدارة «متبقي: المبلغ» وتصير الحالة «لم يدفع»
UPDATE "Student"
SET "adminNotes" = CASE
      WHEN "adminNotes" IS NULL OR "adminNotes" = '' THEN 'متبقي: ' || COALESCE("feeAmount"::text || ' ل.س.ج', 'بلا مبلغ')
      ELSE "adminNotes" || E'\n' || 'متبقي: ' || COALESCE("feeAmount"::text || ' ل.س.ج', 'بلا مبلغ')
    END,
    "feeStatus" = 'UNPAID',
    "feeAmount" = NULL
WHERE "feeStatus" = 'REMAINING';
