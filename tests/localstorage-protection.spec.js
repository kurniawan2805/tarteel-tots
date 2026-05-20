import { test, expect } from '@playwright/test';

// Test: Sensitive data should not be in localStorage/sessionStorage after login

test.describe('LocalStorage Data Protection', () => {
  test('login → check localStorage/sessionStorage', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', `parent+${Date.now()}@test.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for any navigation or dashboard element
    await page.waitForTimeout(5000); // fallback: wait for UI to update

    // Evaluate localStorage/sessionStorage for sensitive keys
    const localKeys = await page.evaluate(() => Object.keys(window.localStorage));
    const sessionKeys = await page.evaluate(() => Object.keys(window.sessionStorage));
    const localValues = await page.evaluate(() => Object.values(window.localStorage));
    const sessionValues = await page.evaluate(() => Object.values(window.sessionStorage));

    // Check for presence of sensitive data (email, password, token, profile, child)
    const sensitivePatterns = [/email/i, /token/i, /profile/i, /child/i, /password/i];
    for (const key of [...localKeys, ...sessionKeys]) {
      for (const pat of sensitivePatterns) {
        expect(key).not.toMatch(pat);
      }
    }
    for (const val of [...localValues, ...sessionValues]) {
      for (const pat of sensitivePatterns) {
        expect(val).not.toMatch(pat);
      }
    }
  });
});
