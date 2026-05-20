import { test, expect } from '@playwright/test';

// E2E: Onboarding flow - add child after login/signup

test.describe('Onboarding Add Child', () => {
  test('signup/login → onboarding → add child', async ({ page }) => {
    // Go to signup page
    await page.goto('/signup');
    await page.fill('input[type="email"]', `parent+${Date.now()}@test.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[placeholder="Your name"]', 'Parent User');
    await page.click('button:has-text("Mother"), button:has-text("Father")');
    await page.click('button:has-text("Create Account")');

    // Wait for onboarding step
    await expect(page.locator('text=Setup Your Space')).toBeVisible({ timeout: 15000 });
    // Create new family
    await page.click('button:has-text("Create New Family")');
    await page.fill('input[placeholder*="Family"]', 'Test Family');
    await page.click('button:has-text("Create Family Space")');
    await page.click('button:has-text("Continue")');

    // Wait for onboarding step 2 by looking for the onboarding stepper or a unique onboarding element
    await page.waitForTimeout(2000); // fallback: wait for UI to update
    // Try to fill child name (input should exist if onboarding step 2 is active)
    await page.fill('input[placeholder*="name"]', 'Test Child');
    // Set age using slider (range input)
    const ageSlider = page.locator('input[type="range"]');
    if (await ageSlider.isVisible()) {
      await ageSlider.fill('5');
    }
    await page.click('button:has-text("Add Child")');

    // Child should appear in list/dashboard or as a summary
    await expect(page.locator('text=Test Child')).toBeVisible({ timeout: 10000 });
  });
});
