/*
  Warnings:

  - You are about to drop the column `productCost` on the `FundraisingCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `productIba` on the `FundraisingCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `FundraisingCampaign` table. All the data in the column will be lost.
  - You are about to drop the column `productPrice` on the `FundraisingCampaign` table. All the data in the column will be lost.

*/
-- AlterEnum (Moved to previous migration to avoid transaction lock)
-- ALTER TYPE "FundraisingStatus" ADD VALUE 'DRAFT';


-- AlterTable
ALTER TABLE "FundraisingCampaign" DROP COLUMN "productCost",
DROP COLUMN "productIba",
DROP COLUMN "productName",
DROP COLUMN "productPrice",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "sendEventInvite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sendThankYou" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thankYouTemplate" TEXT,
ADD COLUMN     "ticketPrice" DECIMAL(10,2),
ADD COLUMN     "volunteerPercentage" DECIMAL(5,2) DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "FundraisingOrder" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pushToken" TEXT;

-- CreateTable
CREATE TABLE "CampaignProduct" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "ibaAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundraisingVolunteer" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundraisingVolunteer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignProduct_campaignId_idx" ON "CampaignProduct"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "FundraisingVolunteer_campaignId_scoutId_key" ON "FundraisingVolunteer"("campaignId", "scoutId");

-- AddForeignKey
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingVolunteer" ADD CONSTRAINT "FundraisingVolunteer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingVolunteer" ADD CONSTRAINT "FundraisingVolunteer_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingOrder" ADD CONSTRAINT "FundraisingOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CampaignProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
