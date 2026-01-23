
import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.development.local' });

const getConnectionString = () => {
    return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
}

const connectionString = getConnectionString()
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log("Verifying Pre-Order Data...");

    const campaign = await prisma.fundraisingCampaign.findFirst({
        where: { name: 'Fall Popcorn Sale' },
        include: { orders: true, sales: true }
    });

    if (campaign) {
        console.log(`[PASS] Campaign found: ${campaign.name} (ID: ${campaign.id})`);
        console.log(`- Type: ${campaign.type}`);
        console.log(`- Product: ${campaign.productName}`);
        console.log(`- Orders Count: ${campaign.orders.length}`);
        console.log(`- Recorded Sales Count: ${campaign.sales.length}`);

        if (campaign.orders.length > 0) {
            console.log("Orders:", JSON.stringify(campaign.orders, null, 2));
        }
    } else {
        console.log("[FAIL] Campaign 'Fall Popcorn Sale' not found.");
    }

    // Check for any orders general
    const orderCount = await prisma.fundraisingOrder.count();
    console.log(`Total Fundraising Orders in DB: ${orderCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
