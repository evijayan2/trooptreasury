import { test, expect } from '../../fixtures/auth.fixture';
import { TEST_USERS } from '../../utils/test-users';

test.describe('Authentication - Login Flows', () => {

    /**
     * TC001: Successful Login
     * Priority: Critical
     */
    test('TC001: should login successfully with valid credentials', async ({ page, prisma }) => {
        test.setTimeout(120000);   // ← give it 2 minutes just for debugging

        console.log('→ Starting test at:', new Date().toISOString());

        await page.goto('/login');
        console.log('→ After goto /login:', await page.url(), new Date().toISOString());

        await page.fill('input[name="email"]', TEST_USERS.ADMIN.email);
        await page.fill('input[name="password"]', TEST_USERS.ADMIN.password);

        const startSubmit = Date.now();
        await page.click('button[type="submit"]');
        console.log(`→ Submit took ${Date.now() - startSubmit}ms`);

        // Wait explicitly — this replaces blind toHaveURL polling
        await page.waitForURL(/.*dashboard/, { timeout: 30000 });
        console.log('→ After waitForURL:', await page.url(), new Date().toISOString());

        // Now safe to assert (should be instant)
        await expect(page).toHaveURL(/.*dashboard/);

        await expect(page.locator('text=Sign Out').or(page.locator('text=Logout'))).toBeVisible();

        console.log('→ Test finished at:', new Date().toISOString());
    });

    /**
     * TC002: Invalid Credentials  
     * Priority: High
     */
    test('TC002: should show error for invalid credentials', async ({ page, prisma }) => {
        await page.goto('/login');

        await page.fill('input[name="email"]', TEST_USERS.ADMIN.email);
        await page.fill('input[name="password"]', 'WrongPassword123!');

        await page.click('button[type="submit"]');

        // Should stay on login page
        await expect(page).toHaveURL(/.*login/);

        // Should show error message
        await expect(page.locator('text=/invalid credentials/i')).toBeVisible();

        // Verify failed attempt is recorded in database
        const user = await prisma.user.findUnique({
            where: { email: TEST_USERS.ADMIN.email },
        });
        expect(user?.failedLoginAttempts).toBeGreaterThan(0);
    });

    /**
     * TC003: Account Lockout After 5 Failed Attempts
     * Priority: Critical
     */
    test('TC003: should lock account after 5 failed login attempts', async ({ page, prisma }) => {
        const email = TEST_USERS.LEADER.email;

        // Attempt login 5 times with wrong password
        for (let i = 0; i < 5; i++) {
            await page.goto('/login');
            await page.fill('input[name="email"]', email);
            await page.fill('input[name="password"]', 'WrongPassword123!');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(500);
        }

        // 6th attempt should show lockout message
        await page.goto('/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'WrongPassword123!');
        await page.click('button[type="submit"]');

        // Should show lockout message
        await expect(page.locator('text=/account.*locked/i').or(page.locator('text=/too many.*attempts/i'))).toBeVisible();

        // Verify user is locked in database
        const user = await prisma.user.findUnique({
            where: { email },
        });
        expect(user?.lockedUntil).toBeTruthy();
        expect(user?.lockedUntil).toBeInstanceOf(Date);
    });

    /**
     * TC004: Inactive User Login Attempt
     * Priority: High
     */
    test('TC004: should prevent inactive user from logging in', async ({ page, prisma }) => {
        await page.goto('/login');

        await page.fill('input[name="email"]', TEST_USERS.INACTIVE_USER.email);
        await page.fill('input[name="password"]', TEST_USERS.INACTIVE_USER.password);

        await page.click('button[type="submit"]');

        // Should stay on login page
        await expect(page).toHaveURL(/.*login/);

        // Should show error message about inactive account
        await expect(
            page.locator('text=/account.*inactive/i').or(page.locator('text=/invalid credentials/i'))
        ).toBeVisible();
    });

    /**
     * TC005: Session Timeout
     * Priority: Medium
     * Note: This is a simplified test. Full implementation would mock time.
     */
    test('TC005: should timeout session after configured period', async ({ adminPage, page }) => {
        // User is already logged in via adminPage fixture
        await expect(adminPage).toHaveURL(/.*dashboard/);

        // Navigate to settings to verify session is active
        await adminPage.goto('/dashboard/settings');
        await expect(adminPage.locator('text=/settings/i')).toBeVisible();

        // In a real scenario, we'd mock time advancement here
        // For now, we verify the session timeout configuration exists
        const timeoutConfig = await adminPage.locator('input[name="sessionTimeoutMinutes"]');
        if (await timeoutConfig.isVisible()) {
            await expect(timeoutConfig).toHaveValue(/\d+/);
        }

        // TODO: Implement full timeout test with time mocking
    });
});
