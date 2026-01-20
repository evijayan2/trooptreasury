import { test, expect } from '../../fixtures/auth.fixture';
import bcrypt from 'bcryptjs';

test.describe('Authentication - Invitation & Password', () => {

    /**
     * TC007: Accept Invitation with Valid Token
     * Priority: Critical
     */
    test('TC007: should accept invitation with valid token', async ({ page, prisma }) => {
        // Create a user with invitation token
        const testEmail = 'newinvite@test.trooptreasury.com';
        const invitationToken = crypto.randomUUID();
        const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        await prisma.user.create({
            data: {
                email: testEmail,
                name: 'New Invite User',
                role: 'PARENT',
                invitationToken,
                invitationExpires,
            },
        });

        // Navigate to invitation page
        await page.goto(`/invite?token=${invitationToken}`);

        // Fill password form
        const newPassword = 'NewPassword123!@#';
        await page.fill('input[name="password"]', newPassword);
        await page.fill('input[name="confirmPassword"]', newPassword);

        // Submit
        await page.click('button[type="submit"]');

        // Should show success message or redirect to login
        await expect(
            page.locator('text=/password.*set/i').or(page.locator('text=/success/i'))
        ).toBeVisible({ timeout: 10000 });

        // Verify user is updated in database
        const user = await prisma.user.findUnique({
            where: { email: testEmail },
        });
        expect(user?.passwordHash).toBeTruthy();
        expect(user?.invitationToken).toBeNull();
        expect(user?.isActive).toBe(true);

        // Cleanup
        await prisma.user.delete({ where: { email: testEmail } });
    });

    /**
     * TC008: Accept Invitation with Expired Token
     * Priority: Medium
     */
    test('TC008: should reject expired invitation token', async ({ page, prisma }) => {
        const testEmail = 'expiredinvite@test.trooptreasury.com';
        const invitationToken = crypto.randomUUID();
        const invitationExpires = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago

        await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Expired Invite User',
                role: 'PARENT',
                invitationToken,
                invitationExpires,
            },
        });

        await page.goto(`/invite?token=${invitationToken}`);

        await page.fill('input[name="password"]', 'NewPassword123!@#');
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!@#');

        await page.click('button[type="submit"]');

        // Should show error about expired token
        await expect(page.locator('text=/expired/i').or(page.locator('text=/invalid.*token/i'))).toBeVisible();

        // Cleanup
        await prisma.user.delete({ where: { email: testEmail } });
    });

    /**
     * TC009: Password Complexity Validation
     * Priority: High
     */
    test('TC009: should enforce password complexity requirements', async ({ page, prisma }) => {
        const testEmail = 'passwordtest@test.trooptreasury.com';
        const invitationToken = crypto.randomUUID();
        const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Password Test User',
                role: 'PARENT',
                invitationToken,
                invitationExpires,
            },
        });

        await page.goto(`/invite?token=${invitationToken}`);

        // Test 1: Password without uppercase
        await page.fill('input[name="password"]', 'noupercase123!');
        await page.fill('input[name="confirmPassword"]', 'noupercase123!');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/uppercase/i')).toBeVisible();

        // Test 2: Password without number
        await page.fill('input[name="password"]', 'NoNumbersHere!');
        await page.fill('input[name="confirmPassword"]', 'NoNumbersHere!');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/number/i')).toBeVisible();

        // Test 3: Password without special character
        await page.fill('input[name="password"]', 'NoSpecialChar123');
        await page.fill('input[name="confirmPassword"]', 'NoSpecialChar123');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/special/i')).toBeVisible();

        // Test 4: Password too short
        await page.fill('input[name="password"]', 'Short1!');
        await page.fill('input[name="confirmPassword"]', 'Short1!');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/12.*characters/i')).toBeVisible();

        // Test 5: Passwords don't match
        await page.fill('input[name="password"]', 'ValidPassword123!');
        await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=/match/i')).toBeVisible();

        // Cleanup
        await prisma.user.delete({ where: { email: testEmail } });
    });

    /**
     * TC006: Request Password Reset
     * Priority: Medium
     */
    test('TC006: should handle password reset request', async ({ page, prisma }) => {
        // This test depends on password reset implementation
        // For now, we'll check if the feature exists

        await page.goto('/login');

        // Look for forgot password link
        const forgotPasswordLink = page.locator('text=/forgot.*password/i');

        if (await forgotPasswordLink.isVisible()) {
            await forgotPasswordLink.click();

            // Should navigate to password reset page
            await expect(page).toHaveURL(/.*reset|.*forgot/);

            // Should have email input
            await expect(page.locator('input[type="email"]')).toBeVisible();
        } else {
            // Feature not yet implemented - skip
            test.skip();
        }
    });
});
