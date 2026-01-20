-- CreateEnum
CREATE TYPE "BudgetCategoryType" AS ENUM ('INCOME', 'EXPENSE', 'BOTH');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "budgetCategoryId" TEXT,
ADD COLUMN     "fundraisingCampaignId" TEXT;

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BudgetCategoryType" NOT NULL,
    "plannedIncome" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "plannedExpense" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundraisingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "goal" DECIMAL(10,2) NOT NULL,
    "isComplianceApproved" BOOLEAN NOT NULL DEFAULT false,
    "ibaPercentage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FundraisingCampaign_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fundraisingCampaignId_fkey" FOREIGN KEY ("fundraisingCampaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCategory" ADD CONSTRAINT "BudgetCategory_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
