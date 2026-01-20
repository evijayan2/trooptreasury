import { PrismaClient } from '@/lib/generated/client';
import bcrypt from 'bcryptjs';

export const TEST_USERS = {
    ADMIN: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@test.trooptreasury.com',
        password: 'TestAdmin123!@#',
        name: 'Test Admin',
        role: 'ADMIN' as const,
    },
    FINANCIER: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'financier@test.trooptreasury.com',
        password: 'TestFinancier123!@#',
        name: 'Test Financier',
        role: 'FINANCIER' as const,
    },
    LEADER: {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'leader@test.trooptreasury.com',
        password: 'TestLeader123!@#',
        name: 'Test Leader',
        role: 'LEADER' as const,
    },
    PARENT: {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'parent@test.trooptreasury.com',
        password: 'TestParent123!@#',
        name: 'Test Parent',
        role: 'PARENT' as const,
    },
    SCOUT: {
        id: '00000000-0000-0000-0000-000000000005',
        email: 'scout@test.trooptreasury.com',
        password: 'TestScout123!@#',
        name: 'Test Scout User',
        role: 'SCOUT' as const,
    },
    INACTIVE_USER: {
        id: '00000000-0000-0000-0000-000000000006',
        email: 'inactive@test.trooptreasury.com',
        password: 'TestInactive123!@#',
        name: 'Inactive User',
        role: 'PARENT' as const,
        isActive: false,
    },
};

/**
 * Seed test users in the database
 */
export async function seedTestUsers(prisma: PrismaClient) {
    const users = [];

    for (const [key, userData] of Object.entries(TEST_USERS)) {
        const u = userData as any;
        // Use salt round 1 for tests to speed up
        const hashedPassword = await bcrypt.hash(u.password, 1);

        // Individual delete to ensure clean slate for this email
        await prisma.user.deleteMany({ where: { email: u.email } });

        const user = await prisma.user.create({
            data: {
                id: u.id,
                email: u.email,
                name: u.name,
                passwordHash: hashedPassword,
                role: u.role,
                isActive: u.isActive ?? true,
            },
        });

        users.push(user);

        // Auto-create scout for SCOUT user
        if (userData.role === 'SCOUT') {
            await prisma.scout.upsert({
                where: { userId: user.id },
                update: {},
                create: {
                    name: userData.name,
                    userId: user.id,
                    status: 'ACTIVE',
                    ibaBalance: 0,
                },
            });
        }
    }

    return users;
}

/**
 * Clean up test users
 */
export async function cleanupTestUsers(prisma: PrismaClient) {
    const emails = Object.values(TEST_USERS).map(u => u.email);
    await prisma.user.deleteMany({
        where: { email: { in: emails } },
    });
}
