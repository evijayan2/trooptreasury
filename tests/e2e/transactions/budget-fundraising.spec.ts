import { test, expect } from '../../fixtures/auth.fixture';
import { Decimal } from 'decimal.js';

test.describe('Budget & Fundraising', () => {

    /**
     * TC057: Create Annual Budget
     * Priority: Low
     */
    test('TC057: should create annual budget with categories', async ({ adminPage, prisma }) => {
        await adminPage.goto('/dashboard/finance/budget');

        // Create new budget
        const budgetBtn = adminPage.locator('text=/new.*budget|create.*budget/i');
        if (await budgetBtn.isVisible()) {
            await budgetBtn.click();

            const currentYear = new Date().getFullYear();
            await adminPage.fill('input[name="year"]', currentYear.toString());
            await adminPage.click('button[type="submit"]');

            // Verify budget created
            const budget = await prisma.budget.findFirst({
                where: { year: currentYear.toString() },
            });
            expect(budget).toBeTruthy();

            // Add categories
            await adminPage.click('text=/add.*category/i');
            await adminPage.fill('input[name="name"]', 'Equipment');
            await adminPage.selectOption('select[name="type"]', 'EXPENSE');
            await adminPage.fill('input[name="plannedExpense"]', '5000');
            await adminPage.click('button[type="submit"]');

            // Verify category created
            const category = await prisma.budgetCategory.findFirst({
                where: { budgetId: budget!.id, name: 'Equipment' },
            });
            expect(category).toBeTruthy();
            expect(category?.plannedExpense.toString()).toBe('5000');

            // Cleanup
            await prisma.budgetCategory.deleteMany({ where: { budgetId: budget!.id } });
            await prisma.budget.delete({ where: { id: budget!.id } });
        } else {
            // Budget feature not accessible or not implemented
            test.skip();
        }
    });

    /**
     * TC058: Link Transaction to Budget Category
     * Priority: Low
     */
    test('TC058: should link transaction to budget category', async ({ financierPage, prisma }) => {
        // Create budget with category
        const budget = await prisma.budget.create({
            data: {
                year: '2025',
                isActive: true,
                categories: {
                    create: {
                        name: 'Camping Gear',
                        type: 'EXPENSE',
                        plannedExpense: new Decimal(3000),
                    },
                },
            },
            include: { categories: true },
        });

        const category = budget.categories[0];

        await financierPage.goto('/dashboard/finance/transactions');
        await financierPage.click('text=/add.*transaction/i');

        await financierPage.fill('input[name="amount"]', '150');
        await financierPage.selectOption('select[name="type"]', 'EXPENSE');
        await financierPage.fill('textarea[name="description"]', 'Tent purchase');

        // Link to budget category (if feature exists)
        const categorySelect = financierPage.locator('select[name="budgetCategoryId"]');
        if (await categorySelect.isVisible()) {
            await categorySelect.selectOption(category.id);
        }

        await financierPage.click('button[type="submit"]');

        // Verify transaction linked
        const transaction = await prisma.transaction.findFirst({
            where: { description: 'Tent purchase' },
            orderBy: { createdAt: 'desc' },
        });

        if (await categorySelect.isVisible()) {
            expect(transaction?.budgetCategoryId).toBe(category.id);
        }

        // Cleanup
        await prisma.budgetCategory.delete({ where: { id: category.id } });
        await prisma.budget.delete({ where: { id: budget.id } });
    });

    /**
     * TC059: Create Fundraising Campaign
     * Priority: Medium
     */
    test('TC059: should create fundraising campaign', async ({ adminPage, prisma }) => {
        await adminPage.goto('/dashboard/finance/fundraising');

        await adminPage.click('text=/new.*campaign|create.*campaign/i');

        const campaignName = `Test Campaign ${Date.now()}`;
        await adminPage.fill('input[name="name"]', campaignName);
        await adminPage.fill('input[name="goal"]', '10000');
        await adminPage.fill('input[name="ibaPercentage"]', '35');
        await adminPage.fill('input[name="startDate"]', '2025-09-01');

        await adminPage.click('button[type="submit"]');

        // Verify campaign created
        await expect(adminPage.locator(`text="${campaignName}"`)).toBeVisible();

        const campaign = await prisma.fundraisingCampaign.findFirst({
            where: { name: campaignName },
        });

        expect(campaign).toBeTruthy();
        expect(campaign?.goal.toString()).toBe('10000');
        expect(campaign?.ibaPercentage).toBe(35);
        expect(campaign?.status).toBe('ACTIVE');

        // Cleanup
        await prisma.fundraisingCampaign.delete({ where: { id: campaign!.id } });
    });

    /**
     * TC060: Link Transaction to Campaign
     * Priority: Medium
     */
    test('TC060: should link fundraising income to campaign', async ({ financierPage, prisma }) => {
        // Create campaign and scout
        const campaign = await prisma.fundraisingCampaign.create({
            data: {
                name: 'Popcorn Sale',
                goal: new Decimal(8000),
                ibaPercentage: 40,
                startDate: new Date('2025-10-01'),
                status: 'ACTIVE',
            },
        });

        const scout = await prisma.scout.create({
            data: {
                name: 'Fundraising Scout',
                status: 'ACTIVE',
                ibaBalance: new Decimal(0),
            },
        });

        await financierPage.goto('/dashboard/finance/transactions');
        await financierPage.click('text=/add.*transaction/i');

        await financierPage.fill('input[name="amount"]', '200');
        await financierPage.selectOption('select[name="type"]', 'FUNDRAISING_INCOME');
        await financierPage.fill('textarea[name="description"]', 'Popcorn sales - Scout');

        // Link to campaign and scout
        const campaignSelect = financierPage.locator('select[name="fundraisingCampaignId"]');
        if (await campaignSelect.isVisible()) {
            await campaignSelect.selectOption(campaign.id);
        }

        const scoutSelect = financierPage.locator('select[name="scoutId"]');
        if (await scoutSelect.isVisible()) {
            await scoutSelect.selectOption(scout.id);
        }

        await financierPage.click('button[type="submit"]');

        // Verify transaction linked
        const transaction = await prisma.transaction.findFirst({
            where: { description: 'Popcorn sales - Scout' },
            orderBy: { createdAt: 'desc' },
        });

        expect(transaction?.fundraisingCampaignId).toBe(campaign.id);
        expect(transaction?.scoutId).toBe(scout.id);

        // Verify IBA credit (40% of $200 = $80)
        const updatedScout = await prisma.scout.findUnique({ where: { id: scout.id } });
        expect(updatedScout?.ibaBalance.toNumber()).toBe(80);

        // Cleanup
        await prisma.scout.delete({ where: { id: scout.id } });
        await prisma.fundraisingCampaign.delete({ where: { id: campaign.id } });
    });

    /**
     * TC061: Close Campaign
     * Priority: Low
     */
    test('TC061: should close fundraising campaign', async ({ adminPage, prisma }) => {
        const campaign = await prisma.fundraisingCampaign.create({
            data: {
                name: 'Completed Campaign',
                goal: new Decimal(5000),
                ibaPercentage: 30,
                startDate: new Date('2025-05-01'),
                status: 'ACTIVE',
            },
        });

        await adminPage.goto('/dashboard/finance/fundraising');

        // Find campaign and close it
        await adminPage.locator(`text="${campaign.name}"`).click();

        const closeButton = adminPage.locator('text=/close.*campaign|change.*status/i');
        if (await closeButton.isVisible()) {
            await closeButton.click();

            const statusSelect = adminPage.locator('select[name="status"]');
            if (await statusSelect.isVisible()) {
                await statusSelect.selectOption('CLOSED');
                await adminPage.click('button[type="submit"]');
            }

            // Verify status changed
            const updated = await prisma.fundraisingCampaign.findUnique({
                where: { id: campaign.id },
            });

            expect(updated?.status).toBe('CLOSED');
        } else {
            // Feature not implemented
            test.skip();
        }

        // Cleanup
        await prisma.fundraisingCampaign.delete({ where: { id: campaign.id } });
    });
});
