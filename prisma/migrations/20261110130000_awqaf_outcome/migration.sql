-- نتيجة سبر الأوقاف الفعلي: ناجح / إعادة / لم يحضر
CREATE TYPE "AwqafOutcome" AS ENUM ('PASS', 'REPEAT', 'ABSENT');
ALTER TABLE "AwqafResult" ADD COLUMN "outcome" "AwqafOutcome";

-- العلامات المسجّلة سابقًا: ناجح إن بلغت حدّ النجاح (السنة 80، القرآن 90 حاضرًا و80 غيبًا)، وإلا إعادة
UPDATE "AwqafResult"
SET "outcome" = CASE
  WHEN "score" >= (CASE WHEN "sunnahSection" IS NOT NULL THEN 80 WHEN "nominationPresent" THEN 90 ELSE 80 END) THEN 'PASS'::"AwqafOutcome"
  ELSE 'REPEAT'::"AwqafOutcome"
END
WHERE "score" IS NOT NULL;
