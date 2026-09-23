/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `IssuedReport` table. All the data in the column will be lost.
  - Added the required column `paramsJson` to the `IssuedReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IssuedReport" DROP COLUMN "fileUrl",
ADD COLUMN     "paramsJson" TEXT NOT NULL;
