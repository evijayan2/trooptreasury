/*
  Warnings:

  - You are about to drop the column `isActive` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `annualDuesAmount` on the `TroopSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Scout` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TROOP_PAYMENT';

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "isActive",
ADD COLUMN     "annualDuesAmount" DECIMAL(10,2) NOT NULL DEFAULT 150.00,
ADD COLUMN     "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Scout" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "TroopSettings" DROP COLUMN "annualDuesAmount";

-- CreateIndex
CREATE UNIQUE INDEX "Scout_email_key" ON "Scout"("email");
