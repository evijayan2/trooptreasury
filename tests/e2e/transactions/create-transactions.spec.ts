import { test, expect } from '../../fixtures/auth.fixture';
import { Decimal } from 'decimal.js';

test.describe('Transaction Management', () => {

    /**
     * TC049: Record Income Transaction
     * Priority: Critical
     */
    test('TC049: should record income transaction as financier', async ({ financierPage, prisma }) => {
        await financierPage.goto('/dashboard/finance/transactions');

        // Get initial troop balance
        const initialTransactions = await prisma.transaction.findMany({
            where: { status: 'APPROVED' },
        });

        // Add income transaction
        await financierPage.click('text=/add.*transaction/i');
        await financierPage.fill('input[name="amount"]', '500');
        await financierPage.selectOption('select[name="type"]', 'DONATION_IN');
        await financierPage.fill('textarea[name="description"]', 'Test donation');
        await financierPage.click('button[type="submit"]');

        // Verify success message
        await expect(financierPage.locator('text=/success|recorded/i')).toBeVisible();

        // Verify transaction in database
        const transaction = await prisma.transaction.findFirst({
            where: { description: 'Test donation' },
            orderBy: { createdAt: 'desc' },
        });

        expect(transaction).toBeTruthy();
        expect(transaction?.type).toBe('DONATION_IN');
        expect(transaction?.amount.toString()).toBe('500');
        expect(transaction?.status).toBe('APPROVED'); // Financier approval is auto
    });

    /**
     * TC054: Single IBA Deposit
     * Priority: High
     */
    test('TC054: should deposit to scout IBA account', async ({ adminPage, prisma }) => {
        // Create a test scout
        const scout = await prisma.scout.create({
            data: {
                name: 'IBA Test Scout',
                status: 'ACTIVE',
                ibaBalance: new Decimal(0),
            },
        });

        const initialBalance = scout.ibaBalance;

        await adminPage.goto(`/dashboard/scouts`);

        // Find and click on scout
        await adminPage.click(`text="${scout.name}"`);

        // Add IBA deposit
        await adminPage.click('text=/deposit|add.*iba/i');
        await adminPage.fill('input[name="amount"]', '50');
        await adminPage.fill('textarea[name="description"]', 'Test IBA deposit');
        await adminPage.click('button[type="submit"]');

        // Verify success
        await expect(adminPage.locator('text=/success/i')).toBeVisible();

        // Verify balance updated
        const updatedScout = await prisma.scout.findUnique({
            where: { id: scout.id },
        });

        expect(updatedScout?.ibaBalance.toString()).toBe('50');

        // Verify transaction created
        const transaction = await prisma.transaction.findFirst({
            where: {
                scoutId: scout.id,
                type: 'IBA_DEPOSIT',
            },
        });

        expect(transaction).toBeTruthy();
        expect(transaction?.amount.toString()).toBe('50');

        // Cleanup
        await prisma.scout.delete({ where: { id: scout.id } });
    });

    /**
     * TC051: Parent Creates Transaction (Pending Approval)
     * Priority: High
     */
    test('TC051: parent transaction should require approval', async ({ parentPage, prisma }) => {
        // Create scout and link to parent
        const parent = await prisma.user.findUnique({
            where: { email: 'parent@test.trooptreasury.com' },
        });

        const scout = await prisma.scout.create({
            data: {
                name: 'Parent Test Scout',
                status: 'ACTIVE',
                ibaBalance: new Decimal(0),
            },
        });

        // Link parent to scout
        await prisma.parentScout.create({
            data: {
                parentId: parent!.id,
                scoutId: scout.id,
            },
        });

        await parentPage.goto('/dashboard');

        // Create transaction
        await parentPage.click('text=/add.*transaction|new.*transaction/i');
        await parentPage.fill('input[name="amount"]', '25');
        await parentPage.selectOption('select[name="type"]', 'DONATION_IN');
        await parentPage.fill('textarea[name="description"]', 'Parent transaction test');
        await parentPage.click('button[type="submit"]');

        // Verify transaction is pending
        const transaction = await prisma.transaction.findFirst({
            where: { description: 'Parent transaction test' },
        });

        expect(transaction?.status).toBe('PENDING');
        expect(transaction?.approvedBy).toBeNull();

        // Cleanup
        await prisma.parentScout.delete({
            where: {
                parentId_scoutId: {
                    parentId: parent!.id,
                    scoutId: scout.id,
                },
            },
        });
        await prisma.scout.delete({ where: { id: scout.id } });
    });

    /**
     * TC052: Approve Pending Transaction
     * Priority: High
     */
    test('TC052: should approve pending transaction', async ({ adminPage, prisma }) => {
        // Create pending transaction
        const transaction = await prisma.transaction.create({
            data: {
                type: 'DONATION_IN',
                amount: new Decimal(100),
                description: 'Pending approval test',
                status: 'PENDING',
            },
        });

        await adminPage.goto('/dashboard/finance/transactions');

        // Find and approve transaction
        await adminPage.locator(`text="${transaction.description}"`).first().click();
        await adminPage.click('text=/approve/i');

        // Verify status changed
        const updated = await prisma.transaction.findUnique({
            where: { id: transaction.id },
        });

        expect(updated?.status).toBe('APPROVED');
        expect(updated?.approvedBy).toBeTruthy();
    });
});
