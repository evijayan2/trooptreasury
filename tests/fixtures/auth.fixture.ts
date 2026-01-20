import { test as base, Page } from '@playwright/test';
import { getTestPrismaClient, cleanupDatabase, setupTroopSettings } from '../utils/db-helper';
import { seedTestUsers, TEST_USERS } from '../utils/test-users';
import type { PrismaClient } from '@/lib/generated/client';

type AuthFixtures = {
    prisma: PrismaClient;
    authenticatedPage: Page;
    adminPage: Page;
    financierPage: Page;
    leaderPage: Page;
    parentPage: Page;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
    // Prisma client fixture
    prisma: async ({ }, use) => {
        const prisma = getTestPrismaClient();

        // Setup: Clean and seed database before tests
        await cleanupDatabase(prisma);
        await setupTroopSettings(prisma);
        await seedTestUsers(prisma);

        await use(prisma);

        // Teardown: Clean up after tests
        // NOTE: We don't cleanup here to avoid race conditions with trailing requests
        // cleanupDatabase is called at the BEGINNING of each test anyway.
        // await cleanupDatabase(prisma);
    },

    // Generic authenticated page (defaults to admin)
    authenticatedPage: async ({ page, prisma }, use) => {
        await setupTroopSettings(prisma);
        await seedTestUsers(prisma);

        await page.goto('/login');
        await page.fill('input[name="email"]', TEST_USERS.ADMIN.email);
        await page.fill('input[name="password"]', TEST_USERS.ADMIN.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard', { timeout: 15000 });

        await use(page);
    },

    // Admin-specific authenticated page
    adminPage: async ({ page, prisma }, use) => {
        await setupTroopSettings(prisma);
        await seedTestUsers(prisma);

        await page.goto('/login');
        await page.fill('input[name="email"]', TEST_USERS.ADMIN.email);
        await page.fill('input[name="password"]', TEST_USERS.ADMIN.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');

        await use(page);
    },

    // Financier-specific authenticated page
    financierPage: async ({ page, prisma }, use) => {
        await setupTroopSettings(prisma);
        await seedTestUsers(prisma);

        await page.goto('/login');
        await page.fill('input[name="email"]', TEST_USERS.FINANCIER.email);
        await page.fill('input[name="password"]', TEST_USERS.FINANCIER.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');

        await use(page);
    },

    // Leader-specific authenticated page
    leaderPage: async ({ page, prisma }, use) => {
        await setupTroopSettings(prisma);
        await seedTestUsers(prisma);

        await page.goto('/login');
        await page.fill('input[name="email"]', TEST_USERS.LEADER.email);
        await page.fill('input[name="password"]', TEST_USERS.LEADER.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');

        await use(page);
    },

    // Parent-specific authenticated page
    parentPage: async ({ page, prisma }, use) => {
        await setupTroopSettings(prisma);
        await seedTestUsers(prisma);

        await page.goto('/login');
        await page.fill('input[name="email"]', TEST_USERS.PARENT.email);
        await page.fill('input[name="password"]', TEST_USERS.PARENT.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('/dashboard');

        await use(page);
    },
});

export { expect } from '@playwright/test';
