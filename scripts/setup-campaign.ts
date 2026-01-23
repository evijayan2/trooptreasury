
import { PrismaClient, FundraisingType, FundraisingStatus } from "@prisma/client"
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
    console.log("Creating Fall Popcorn Sale Campaign...");

    const campaign = await prisma.fundraisingCampaign.create({
        data: {
            name: 'Fall Popcorn Sale',
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            goal: 5000,
            status: FundraisingStatus.ACTIVE,
            type: FundraisingType.PRODUCT_SALE,
            productName: 'Popcorn Box',
            productPrice: 10.00,
            productCost: 6.00,
            productIba: 1.50
        }
    });

    console.log(`Campaign Created: ${campaign.name} (${campaign.id})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
