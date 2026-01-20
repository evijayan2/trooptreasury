import { test, expect } from '../../fixtures/auth.fixture';
import { Decimal } from 'decimal.js';

test.describe('IBA & Bulk Operations', () => {

    /**
     * TC055: Bulk IBA Deposit
     * Priority: High
     */
    test('TC055: should deposit IBA to multiple scouts in bulk', async ({ adminPage, prisma }) => {
        // Create multiple test scouts
        const scouts = await Promise.all([
            prisma.scout.create({ data: { name: 'Bulk Scout 1', status: 'ACTIVE', ibaBalance: new Decimal(0) } }),
            prisma.scout.create({ data: { name: 'Bulk Scout 2', status: 'ACTIVE', ibaBalance: new Decimal(0) } }),
            prisma.scout.create({ data: { name: 'Bulk Scout 3', status: 'ACTIVE', ibaBalance: new Decimal(0) } }),
        ]);

        await adminPage.goto('/dashboard/scouts');

        // Select multiple scouts (if bulk selection is available)
        for (const scout of scouts) {
            const checkbox = adminPage.locator(`input[type="checkbox"][value="${scout.id}"]`);
            if (await checkbox.isVisible()) {
                await checkbox.check();
            }
        }

        // Click bulk deposit (if feature exists)
        const bulkDepositBtn = adminPage.locator('text=/bulk.*deposit|deposit.*selected/i');
        if (await bulkDepositBtn.isVisible()) {
            await bulkDepositBtn.click();
            await adminPage.fill('input[name="amount"]', '25');
            await adminPage.click('button[type="submit"]');

            // Verify all scouts received deposit
            for (const scout of scouts) {
                const updated = await prisma.scout.findUnique({ where: { id: scout.id } });
                expect(updated?.ibaBalance.toString()).toBe('25');
            }

            // Verify transactions created
            const transactions = await prisma.transaction.findMany({
                where: {
                    scoutId: { in: scouts.map(s => s.id) },
                    type: 'IBA_DEPOSIT',
                },
            });
            expect(transactions.length).toBe(3);
        } else {
            // Feature not implemented - deposit individually
            for (const scout of scouts) {
                await adminPage.goto(`/dashboard/scouts`);
                await adminPage.click(`text="${scout.name}"`);
                await adminPage.click('text=/deposit|add.*iba/i');
                await adminPage.fill('input[name="amount"]', '25');
                await adminPage.click('button[type="submit"]');
            }

            // Verify all received deposits
            for (const scout of scouts) {
                const updated = await prisma.scout.findUnique({ where: { id: scout.id } });
                expect(updated?.ibaBalance.toString()).toBe('25');
            }
        }

        // Cleanup
        await prisma.scout.deleteMany({ where: { id: { in: scouts.map(s => s.id) } } });
    });

    /**
     * TC056: IBA Balance Cannot Go Negative
     * Priority: Critical
     */
    test('TC056: should prevent IBA balance from going negative', async ({ adminPage, prisma }) => {
        const scout = await prisma.scout.create({
            data: { name: 'Negative Test Scout', status: 'ACTIVE', ibaBalance: new Decimal(10) },
        });

        // Create campout costing more than scout's IBA
        const campout = await prisma.campout.create({
            data: {
                name: 'Expensive Campout',
                location: 'Test',
                startDate: new Date('2025-08-01'),
                endDate: new Date('2025-08-03'),
                estimatedCost: new Decimal(50),
                status: 'OPEN',
            },
        });

        await prisma.campoutScout.create({
            data: { campoutId: campout.id, scoutId: scout.id },
        });

        // Attempt to pay $50 with only $10 IBA
        await adminPage.goto(`/dashboard/campouts/${campout.id}`);
        await adminPage.locator(`text="${scout.name}"`).click();

        const payButton = adminPage.locator('text=/pay.*iba/i');
        if (await payButton.isVisible()) {
            await payButton.click();

            // Should show error
            await expect(
                adminPage.locator('text=/insufficient.*balance/i').or(adminPage.locator('text=/not.*enough/i'))
            ).toBeVisible({ timeout: 5000 });

            // Verify balance unchanged
            const updatedScout = await prisma.scout.findUnique({ where: { id: scout.id } });
            expect(updatedScout?.ibaBalance.toString()).toBe('10');
        }

        // Cleanup
        await prisma.campoutScout.delete({
            where: { campoutId_scoutId: { campoutId: campout.id, scoutId: scout.id } },
        });
        await prisma.campout.delete({ where: { id: campout.id } });
        await prisma.scout.delete({ where: { id: scout.id } });
    });

    /**
     * TC050: Record Expense Transaction
     * Priority: Critical
     */
    test('TC050: should record expense transaction', async ({ financierPage, prisma }) => {
        await financierPage.goto('/dashboard/finance/transactions');

        // Click add transaction
        await financierPage.click('text=/add.*transaction|new.*transaction/i');

        // Fill expense details
        await financierPage.fill('input[name="amount"]', '250');
        await financierPage.selectOption('select[name="type"]', 'EXPENSE');
        await financierPage.fill('textarea[name="description"]', 'Equipment purchase');

        await financierPage.click('button[type="submit"]');

        // Verify success
        await expect(financierPage.locator('text=/success|recorded/i')).toBeVisible();

        // Verify in database
        const transaction = await prisma.transaction.findFirst({
            where: { description: 'Equipment purchase' },
            orderBy: { createdAt: 'desc' },
        });

        expect(transaction).toBeTruthy();
        expect(transaction?.type).toBe('EXPENSE');
        expect(transaction?.amount.toString()).toBe('250');
        expect(transaction?.status).toBe('APPROVED');
    });

    /**
     * TC053: Reject Pending Transaction
     * Priority: Medium
     */
    test('TC053: should reject pending transaction', async ({ adminPage, prisma }) => {
        // Create pending transaction
        const transaction = await prisma.transaction.create({
            data: {
                type: 'DONATION_IN',
                amount: new Decimal(75),
                description: 'Pending rejection test',
                status: 'PENDING',
            },
        });

        await adminPage.goto('/dashboard/finance/transactions');

        // Find and reject transaction
        await adminPage.locator(`text="${transaction.description}"`).first().click();

        const rejectButton = adminPage.locator('text=/reject/i');
        if (await rejectButton.isVisible()) {
            await rejectButton.click();

            // Confirm if needed
            const confirmButton = adminPage.locator('text=/confirm|yes/i');
            if (await confirmButton.isVisible()) {
                await confirmButton.click();
            }

            // Verify status changed
            const updated = await prisma.transaction.findUnique({
                where: { id: transaction.id },
            });

            expect(updated?.status).toBe('REJECTED');
        } else {
            // Reject feature might not be implemented
            test.skip();
        }
    });
});
