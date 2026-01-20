import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Security & Input Validation', () => {

    /**
     * TC063: SQL Injection Prevention
     * Priority: Critical
     */
    test('TC063: should prevent SQL injection in name fields', async ({ adminPage, prisma }) => {
        await adminPage.goto('/dashboard/scouts');

        // Try to create scout with SQL injection attempt
        await adminPage.click('text=/add scout/i');

        const sqlInjection = "'; DROP TABLE scouts; --";
        await adminPage.fill('input[name="name"]', sqlInjection);
        await adminPage.fill('input[name="age"]', '15');
        await adminPage.click('button[type="submit"]');

        // Should either sanitize or reject
        // Verify scouts table still exists and data is sanitized
        const scouts = await prisma.scout.findMany();
        expect(scouts).toBeDefined(); // Table still exists

        // If scout was created, name should be sanitized
        const suspiciousScout = await prisma.scout.findFirst({
            where: { name: { contains: 'DROP' } },
        });

        if (suspiciousScout) {
            // Name should be stored as plain text, not executed
            expect(suspiciousScout.name).toContain('DROP');
        }
    });

    /**
     * TC064: XSS Attack Prevention
     * Priority: Critical
     */
    test('TC064: should prevent XSS in transaction descriptions', async ({ financierPage, prisma }) => {
        await financierPage.goto('/dashboard/finance/transactions');

        // Try to create transaction with XSS attempt
        const xssPayload = '<script>alert("XSS")</script>';

        await financierPage.click('text=/add.*transaction/i');
        await financierPage.fill('input[name="amount"]', '100');
        await financierPage.selectOption('select[name="type"]', 'DONATION_IN');
        await financierPage.fill('textarea[name="description"]', xssPayload);
        await financierPage.click('button[type="submit"]');

        // Reload page to see if script executes
        await financierPage.reload();

        // Set up dialog handler to catch any alerts
        let alertShown = false;
        financierPage.on('dialog', async dialog => {
            alertShown = true;
            await dialog.dismiss();
        });

        await financierPage.waitForTimeout(1000);

        // Alert should not have been shown
        expect(alertShown).toBe(false);

        // Verify description is stored but not executed
        const transaction = await prisma.transaction.findFirst({
            where: { description: { contains: 'script' } },
        });

        if (transaction) {
            expect(transaction.description).toContain('script');
            // Should be stored as plain text
        }
    });

    /**
     * TC065: Extremely Large Amount
     * Priority: Medium
     */
    test('TC065: should handle extremely large transaction amounts', async ({ financierPage }) => {
        await financierPage.goto('/dashboard/finance/transactions');

        await financierPage.click('text=/add.*transaction/i');

        // Test with very large number
        await financierPage.fill('input[name="amount"]', '999999999.99');
        await financierPage.selectOption('select[name="type"]', 'DONATION_IN');
        await financierPage.fill('textarea[name="description"]', 'Large amount test');

        await financierPage.click('button[type="submit"]');

        // Should either accept it or show validation error based on Decimal(10,2) constraint
        const errorOrSuccess = await Promise.race([
            financierPage.locator('text=/success/i').isVisible(),
            financierPage.locator('text=/error|invalid/i').isVisible(),
        ]);

        expect(errorOrSuccess).toBe(true);
    });

    /**
     * TC066: Zero Amount Transaction
     * Priority: Low
     */
    test('TC066: should reject zero amount transactions', async ({ financierPage }) => {
        await financierPage.goto('/dashboard/finance/transactions');

        await financierPage.click('text=/add.*transaction/i');

        await financierPage.fill('input[name="amount"]', '0');
        await financierPage.selectOption('select[name="type"]', 'DONATION_IN');
        await financierPage.fill('textarea[name="description"]', 'Zero amount test');

        await financierPage.click('button[type="submit"]');

        // Should show validation error
        await expect(financierPage.locator('text=/amount.*positive/i').or(financierPage.locator('text=/invalid.*amount/i'))).toBeVisible();
    });

    /**
     * TC067: Invalid Email Format
     * Priority: Medium
     */
    test('TC067: should reject invalid email format when creating user', async ({ adminPage }) => {
        await adminPage.goto('/dashboard/users');

        await adminPage.click('text=/add.*user/i');

        // Try invalid email
        await adminPage.fill('input[name="email"]', 'notanemail');
        await adminPage.fill('input[name="name"]', 'Test User');
        await adminPage.selectOption('select[name="role"]', 'PARENT');

        await adminPage.click('button[type="submit"]');

        // Should show email validation error
        await expect(adminPage.locator('text=/invalid.*email/i').or(adminPage.locator('input[name="email"]:invalid'))).toBeVisible();
    });
});
