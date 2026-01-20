import { test, expect } from '../../fixtures/auth.fixture';
import { Decimal } from 'decimal.js';

test.describe('End-to-End Workflows', () => {

    /**
     * TC068: Complete Campout Lifecycle
     * Priority: Critical
     */
    test('TC068: complete campout lifecycle - create, register, pay, close', async ({ leaderPage, prisma }) => {
        // Step 1: Create campout
        await leaderPage.goto('/dashboard/campouts');
        await leaderPage.click('text=/new.*campout/i');

        const campoutName = `E2E Test Campout ${Date.now()}`;
        await leaderPage.fill('input[name="name"]', campoutName);
        await leaderPage.fill('input[name="location"]', 'Test Location');
        await leaderPage.fill('input[name="startDate"]', '2025-06-01');
        await leaderPage.fill('input[name="endDate"]', '2025-06-03');
        await leaderPage.fill('input[name="costEstimate"]', '75');
        await leaderPage.click('button[type="submit"]');

        await expect(leaderPage.locator(`text="${campoutName}"`)).toBeVisible();

        const campout = await prisma.campout.findFirst({
            where: { name: campoutName },
        });
        expect(campout).toBeTruthy();
        expect(campout?.status).toBe('OPEN');

        // Step 2: Register scouts
        const scout1 = await prisma.scout.create({
            data: {
                name: 'E2E Scout 1',
                status: 'ACTIVE',
                ibaBalance: new Decimal(100),
            },
        });

        const scout2 = await prisma.scout.create({
            data: {
                name: 'E2E Scout 2',
                status: 'ACTIVE',
                ibaBalance: new Decimal(50),
            },
        });

        await leaderPage.goto(`/dashboard/campouts/${campout!.id}`);
        await leaderPage.click('text=/add.*scout|register/i');
        await leaderPage.selectOption('select[name="scoutId"]', scout1.id);
        await leaderPage.click('button[type="submit"]');

        await leaderPage.click('text=/add.*scout|register/i');
        await leaderPage.selectOption('select[name="scoutId"]', scout2.id);
        await leaderPage.click('button[type="submit"]');

        // Verify registrations
        const registrations = await prisma.campoutScout.findMany({
            where: { campoutId: campout!.id },
        });
        expect(registrations.length).toBe(2);

        // Step 3: Log expenses
        await leaderPage.click('text=/expense/i');
        await leaderPage.fill('input[name="amount"]', '150');
        await leaderPage.fill('textarea[name="description"]', 'Campsite fee');
        await leaderPage.click('button[type="submit"]');

        // Step 4: Process payments (IBA)
        await leaderPage.goto(`/dashboard/campouts/${campout!.id}`);
        await leaderPage.locator(`text="${scout1.name}"`).click();
        await leaderPage.click('text=/pay.*iba/i');

        // Verify payment
        const updatedScout1 = await prisma.scout.findUnique({
            where: { id: scout1.id },
        });
        expect(updatedScout1?.ibaBalance.toNumber()).toBe(25); // 100 - 75

        // Step 5: Close campout
        await leaderPage.goto(`/dashboard/campouts/${campout!.id}`);
        await leaderPage.click('text=/close|change.*status/i');
        await leaderPage.selectOption('select[name="status"]', 'CLOSED');
        await leaderPage.click('button[type="submit"]');

        const closedCampout = await prisma.campout.findUnique({
            where: { id: campout!.id },
        });
        expect(closedCampout?.status).toBe('CLOSED');

        // Cleanup
        await prisma.campoutScout.deleteMany({ where: { campoutId: campout!.id } });
        await prisma.adultExpense.deleteMany({ where: { campoutId: campout!.id } });
        await prisma.campout.delete({ where: { id: campout!.id } });
        await prisma.scout.deleteMany({ where: { id: { in: [scout1.id, scout2.id] } } });
    });

    /**
     * TC070: Fundraising → IBA Deposit → Event Payment
     * Priority: High
     */
    test('TC070: complete IBA workflow from fundraising to payment', async ({ adminPage, prisma }) => {
        // Create scout
        const scout = await prisma.scout.create({
            data: {
                name: 'IBA Workflow Scout',
                status: 'ACTIVE',
                ibaBalance: new Decimal(0),
            },
        });

        // Step 1: Create fundraising campaign
        await adminPage.goto('/dashboard/finance/fundraising');
        await adminPage.click('text=/new.*campaign/i');
        await adminPage.fill('input[name="name"]', 'E2E Fundraiser');
        await adminPage.fill('input[name="goal"]', '5000');
        await adminPage.fill('input[name="ibaPercentage"]', '30');
        await adminPage.click('button[type="submit"]');

        const campaign = await prisma.fundraisingCampaign.findFirst({
            where: { name: 'E2E Fundraiser' },
        });
        expect(campaign).toBeTruthy();

        // Step 2: Record fundraising income
        await adminPage.goto('/dashboard/finance/transactions');
        await adminPage.click('text=/add.*transaction/i');
        await adminPage.fill('input[name="amount"]', '100');
        await adminPage.selectOption('select[name="type"]', 'FUNDRAISING_INCOME');
        await adminPage.selectOption('select[name="fundraisingCampaignId"]', campaign!.id);
        await adminPage.selectOption('select[name="scoutId"]', scout.id);
        await adminPage.fill('textarea[name="description"]', 'Scout fundraising');
        await adminPage.click('button[type="submit"]');

        // Step 3: Verify IBA deposit (30% of $100 = $30)
        const updatedScout1 = await prisma.scout.findUnique({
            where: { id: scout.id },
        });
        expect(updatedScout1?.ibaBalance.toNumber()).toBe(30);

        // Step 4: Create campout
        const campout = await prisma.campout.create({
            data: {
                name: 'IBA Payment Campout',
                location: 'Test',
                startDate: new Date('2025-07-01'),
                endDate: new Date('2025-07-03'),
                estimatedCost: new Decimal(25),
                status: 'OPEN',
            },
        });

        // Register scout
        await prisma.campoutScout.create({
            data: {
                campoutId: campout.id,
                scoutId: scout.id,
            },
        });

        // Step 5: Pay with IBA
        await adminPage.goto(`/dashboard/campouts/${campout.id}`);
        await adminPage.locator(`text="${scout.name}"`).click();
        await adminPage.click('text=/pay.*iba/i');

        // Step 6: Verify final balance
        const finalScout = await prisma.scout.findUnique({
            where: { id: scout.id },
        });
        expect(finalScout?.ibaBalance.toNumber()).toBe(5); // 30 - 25

        // Cleanup
        await prisma.campoutScout.delete({
            where: { campoutId_scoutId: { campoutId: campout.id, scoutId: scout.id } },
        });
        await prisma.campout.delete({ where: { id: campout.id } });
        await prisma.fundraisingCampaign.delete({ where: { id: campaign!.id } });
        await prisma.scout.delete({ where: { id: scout.id } });
    });

    /**
     * TC071: Troop Balance After Multiple Transactions
     * Priority: Critical
     */
    test('TC071: troop balance calculation with multiple transactions', async ({ financierPage, prisma }) => {
        // Get initial balance
        const initialTransactions = await prisma.transaction.findMany({
            where: { status: 'APPROVED' },
        });

        const initialBalance = initialTransactions.reduce((sum, t) => {
            if (t.type.includes('INCOME') || t.type.includes('DONATION')) {
                return sum + t.amount.toNumber();
            } else if (t.type.includes('EXPENSE')) {
                return sum - t.amount.toNumber();
            }
            return sum;
        }, 0);

        // Add income
        await financierPage.goto('/dashboard/finance/transactions');
        await financierPage.click('text=/add.*transaction/i');
        await financierPage.fill('input[name="amount"]', '500');
        await financierPage.selectOption('select[name="type"]', 'DONATION_IN');
        await financierPage.fill('textarea[name="description"]', 'Balance test donation');
        await financierPage.click('button[type="submit"]');

        // Add expense
        await financierPage.click('text=/add.*transaction/i');
        await financierPage.fill('input[name="amount"]', '200');
        await financierPage.selectOption('select[name="type"]', 'EXPENSE');
        await financierPage.fill('textarea[name="description"]', 'Balance test expense');
        await financierPage.click('button[type="submit"]');

        // Add another income
        await financierPage.click('text=/add.*transaction/i');
        await financierPage.fill('input[name="amount"]', '100');
        await financierPage.selectOption('select[name="type"]', 'DONATION_IN');
        await financierPage.fill('textarea[name="description"]', 'Balance test donation 2');
        await financierPage.click('button[type="submit"]');

        // Calculate expected balance
        const expectedBalance = initialBalance + 500 - 200 + 100;

        // Navigate to dashboard to see balance
        await financierPage.goto('/dashboard');

        // Verify balance displayed (if shown on dashboard)
        const balanceElement = financierPage.locator('text=/troop.*balance/i').or(financierPage.locator('text=/balance/i'));
        if (await balanceElement.isVisible()) {
            const balanceText = await balanceElement.textContent();
            expect(balanceText).toContain(expectedBalance.toString());
        }

        // Verify in database
        const allTransactions = await prisma.transaction.findMany({
            where: { status: 'APPROVED' },
        });

        const calculatedBalance = allTransactions.reduce((sum, t) => {
            if (t.type.includes('INCOME') || t.type.includes('DONATION')) {
                return sum + t.amount.toNumber();
            } else if (t.type.includes('EXPENSE')) {
                return sum - t.amount.toNumber();
            }
            return sum;
        }, 0);

        expect(calculatedBalance).toBe(expectedBalance);
    });
});
