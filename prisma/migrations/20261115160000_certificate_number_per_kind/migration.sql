-- رقم الشهادة: تسلسل مستقل لكل نوع — يُعاد ترقيم الموجود بترتيب الإصدار داخل كل نوع
ALTER TABLE "IssuedCertificate" ALTER COLUMN "number" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "IssuedCertificate_number_seq";
DROP INDEX IF EXISTS "IssuedCertificate_number_key";

WITH r AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "kind" ORDER BY "createdAt", "number") AS n
  FROM "IssuedCertificate"
)
UPDATE "IssuedCertificate" c SET "number" = r.n FROM r WHERE c."id" = r."id";

CREATE UNIQUE INDEX "IssuedCertificate_kind_number_key" ON "IssuedCertificate"("kind", "number");
