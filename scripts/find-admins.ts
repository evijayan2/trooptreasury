
import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' });
dotenv.config();

const getConnectionString = () => {
    // Prioritize VERCEL_ENV as it distinguishes between 'production' and 'preview' deployments
    if (process.env.VERCEL_ENV === "production") {
        return (
            process.env.PROD_DATABASE_URL ||
            process.env.PROD_POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL
        )
    }

    if (
        process.env.VERCEL_ENV === "preview" ||
        process.env.VERCEL_ENV === "development"
    ) {
        return (
            process.env.PREVIEW_DATABASE_URL ||
            process.env.PREVIEW_POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL
        )
    }

    // Fallback for local development or non-Vercel environments
    return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
}

const connectionString = getConnectionString()
console.log(`Connecting to DB with connection string: ${connectionString ? 'FOUND' : 'MISSING'}`)

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                name: true,
                role: true,
            },
        });

        console.log('All users found:', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
