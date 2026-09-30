-- CreateEnum
CREATE TYPE "Track" AS ENUM ('QURAN', 'ARABIC');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "track" "Track" NOT NULL DEFAULT 'QURAN';

-- AlterTable
ALTER TABLE "Halqa" ADD COLUMN     "track" "Track" NOT NULL DEFAULT 'QURAN';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "track" "Track" NOT NULL DEFAULT 'QURAN';
