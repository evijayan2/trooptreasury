import { test, expect } from '../../fixtures/auth.fixture';

test.describe('User Onboarding', () => {

    /**
     * TC069: Complete User Onboarding
     * Priority: High
     */
    test('TC069: complete user onboarding flow', async ({ page, prisma }) => {
        const testEmail = `onboarding${Date.now()}@test.trooptreasury.com`;
        const testName = 'Onboarding Test User';
        const testPassword = 'OnboardingTest123!@#';

        // Step 1: Admin creates user with invitation
        const invitationToken = crypto.randomUUID();
        const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await prisma.user.create({
            data: {
                email: testEmail,
                name: testName,
                role: 'PARENT',
                invitationToken,
                invitationExpires,
            },
        });

        // Step 2: User receives invite and sets password
        await page.goto(`/invite?token=${invitationToken}`);

        await page.fill('input[name="password"]', testPassword);
        await page.fill('input[name="confirmPassword"]', testPassword);
        await page.click('button[type="submit"]');

        // Should see success message or be redirected
        await expect(
            page.locator('text=/password.*set/i')
                .or(page.locator('text=/success/i'))
                .or(page.getByRole('heading', { name: /login/i }))
        ).toBeVisible({ timeout: 10000 });

        // Step 3: User logs in
        const loginUrl = page.url().includes('login') ? page.url() : '/login';
        if (!page.url().includes('login')) {
            await page.goto('/login');
        }

        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', testPassword);
        await page.click('button[type="submit"]');

        // Step 4: Should be redirected to dashboard or onboarding
        await expect(page).toHaveURL(/dashboard|onboarding/, { timeout: 15000 });

        // Step 5: If onboarding page exists, complete it
        if (page.url().includes('onboarding')) {
            // Fill out troop settings if this is first user setup
            const nameInput = page.locator('input[name="name"]');
            if (await nameInput.isVisible()) {
                await nameInput.fill('Test Troop Onboarding');

                const councilInput = page.locator('input[name="council"]');
                if (await councilInput.isVisible()) {
                    await councilInput.fill('Test Council');
                }

                await page.click('button[type="submit"]');
            }

            // Should be redirected to dashboard after onboarding
            await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
        }

        // Step 6: Verify user can access dashboard
        await expect(page.locator('text=/dashboard/i').or(page.locator('h1'))).toBeVisible();

        // Step 7: Verify user profile is complete
        const user = await prisma.user.findUnique({
            where: { email: testEmail },
        });

        expect(user?.isActive).toBe(true);
        expect(user?.passwordHash).toBeTruthy();
        expect(user?.invitationToken).toBeNull();

        // Cleanup
        await prisma.user.delete({ where: { email: testEmail } });
    });

    /**
     * TC069b: User Onboarding - Profile Completion
     * Priority: Medium
     */
    test('TC069b: should allow user to complete profile after login', async ({ page, prisma }) => {
        // Create user who has accepted invitation but not completed profile
        const testEmail = `profile${Date.now()}@test.trooptreasury.com`;
        const hashedPassword = await require('bcryptjs').hash('TestPassword123!@#', 10);

        await prisma.user.create({
            data: {
                email: testEmail,
                name: 'Profile Test User',
                role: 'PARENT',
                passwordHash: hashedPassword,
                isActive: true,
            },
        });

        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', 'TestPassword123!@#');
        await page.click('button[type="submit"]');

        // Should reach dashboard
        await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

        // Navigate to profile/settings if available
        const profileLink = page.locator('text=/profile|settings|account/i');
        if (await profileLink.first().isVisible()) {
            await profileLink.first().click();

            // Verify can view and edit profile
            await expect(page.locator('input[name="name"]').or(page.locator('text=/profile/i'))).toBeVisible();
        }

        // Cleanup
        await prisma.user.delete({ where: { email: testEmail } });
    });
});
