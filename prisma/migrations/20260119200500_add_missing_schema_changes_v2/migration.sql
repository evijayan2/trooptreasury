-- CreateEnum
CREATE TYPE "FundraisingStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'IBA_DEPOSIT';

-- AlterTable
ALTER TABLE "FundraisingCampaign" ADD COLUMN "status" "FundraisingStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TroopSettings" ADD COLUMN "address" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "preferredColor" TEXT DEFAULT 'orange',
ADD COLUMN "preferredTheme" TEXT DEFAULT 'system';
