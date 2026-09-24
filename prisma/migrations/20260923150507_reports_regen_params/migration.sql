/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `IssuedReport` table. All the data in the column will be lost.
  - Added the required column `paramsJson` to the `IssuedReport` table. Existing rows are backfilled with '{}'.

*/
-- AlterTable
ALTER TABLE "IssuedReport" ADD COLUMN     "paramsJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "IssuedReport" ALTER COLUMN "paramsJson" DROP DEFAULT;
ALTER TABLE "IssuedReport" DROP COLUMN "fileUrl";
