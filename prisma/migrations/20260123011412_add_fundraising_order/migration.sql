-- CreateTable
CREATE TABLE "FundraisingOrder" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scoutId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundraisingOrder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FundraisingOrder" ADD CONSTRAINT "FundraisingOrder_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FundraisingCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraisingOrder" ADD CONSTRAINT "FundraisingOrder_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
