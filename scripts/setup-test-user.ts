
import { PrismaClient, Role } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.development.local' });

const getConnectionString = () => {
    return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
}

const connectionString = getConnectionString()
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log("Setting up Test User for Verification...");

    // 1. Create or Find Scout
    const scout = await prisma.scout.upsert({
        where: { email: 'testscout@example.com' },
        update: {},
        create: {
            name: 'Test Scout',
            email: 'testscout@example.com',
            status: 'ACTIVE',
            ibaBalance: 0
        }
    });
    console.log(`Scout ready: ${scout.name} (${scout.id})`);

    // 2. Create or Find Parent User
    const email = 'testparent@example.com';
    const passwordHash = await bcrypt.hash('TroopTreasury2026!', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash, // Update password to ensure we know it
            role: 'PARENT'
        },
        create: {
            email,
            name: 'Test Parent',
            passwordHash,
            role: 'PARENT',
            isActive: true
        }
    });
    console.log(`User ready: ${user.email} (${user.id})`);

    // 3. Link Parent to Scout
    await prisma.parentScout.upsert({
        where: {
            parentId_scoutId: {
                parentId: user.id,
                scoutId: scout.id
            }
        },
        update: {},
        create: {
            parentId: user.id,
            scoutId: scout.id
        }
    });
    console.log("Link established: Parent -> Scout");

    console.log("Setup Complete.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
