-- CreateEnum
CREATE TYPE "FundraisingType" AS ENUM ('GENERAL', 'PRODUCT_SALE');

-- AlterTable
ALTER TABLE "FundraisingCampaign" ADD COLUMN     "productIba" DECIMAL(10,2),
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "productPrice" DECIMAL(10,2),
ADD COLUMN     "type" "FundraisingType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "FundraisingSale" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundraisingSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundraisingSale_campaignId_scoutId_key" ON "FundraisingSale"("campaignId", "scoutId");

-- AddForeignKey
ALTER TABLE "FundraisingSale" ADD CONSTRAINT "FundraisingSale_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingSale" ADD CONSTRAINT "FundraisingSale_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
