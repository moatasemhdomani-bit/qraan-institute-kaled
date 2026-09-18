/*
  Warnings:

  - You are about to drop the `AppSettings` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nominationPresent` to the `AwqafResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AwqafResult" ADD COLUMN     "nominationPresent" BOOLEAN NOT NULL;

-- DropTable
DROP TABLE "AppSettings";
