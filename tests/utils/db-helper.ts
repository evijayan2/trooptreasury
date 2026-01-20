import { PrismaClient } from '@/lib/generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient;
let pool: Pool;

/**
 * Get or create a singleton Prisma client for tests
 */
export function getTestPrismaClient(): PrismaClient {
    if (!prisma) {
        const connectionString = process.env.DATABASE_URL;
        pool = new Pool({ connectionString });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
    }
    return prisma;
}

/**
 * Clean up all test data from database
 * Use with caution - only in test environment!
 */
export async function cleanupDatabase(prisma: PrismaClient) {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('cleanupDatabase should only be called in test environment');
    }

    try {
        console.log(`[DB-DEBUG] Cleaning up database... NODE_ENV=${process.env.NODE_ENV}`);
        // Delete in correct order to respect foreign keys
        await prisma.adultExpense.deleteMany().catch(() => { });
        await prisma.campoutAdult.deleteMany().catch(() => { });
        await prisma.campoutScout.deleteMany().catch(() => { });
        await prisma.transaction.deleteMany().catch(() => { });
        await prisma.campout.deleteMany().catch(() => { });
        await prisma.parentScout.deleteMany().catch(() => { });
        await prisma.scout.deleteMany().catch(() => { });
        await prisma.fundraisingCampaign.deleteMany().catch(() => { });
        await prisma.budgetCategory.deleteMany().catch(() => { });
        await prisma.budget.deleteMany().catch(() => { });
        await prisma.user.deleteMany().catch(() => { });
    } catch (error) {
        console.warn('Cleanup error (continuing):', error);
    }
}

/**
 * Setup minimal troop settings for tests
 */
export async function setupTroopSettings(prisma: PrismaClient) {
    const existing = await prisma.troopSettings.findFirst();

    if (!existing) {
        await prisma.troopSettings.create({
            data: {
                name: 'Test Troop 123',
                council: 'Test Council',
                district: 'Test District',
                sessionTimeoutMinutes: 15,
                annualDuesAmount: 150,
            },
        });
    }
}

/**
 * Close Prisma connection and pool
 */
export async function disconnectPrisma() {
    if (prisma) {
        await prisma.$disconnect();
    }
    if (pool) {
        await pool.end();
    }
}
