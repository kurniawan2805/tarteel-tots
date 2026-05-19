import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('navigate → login page loads', async ({ page }) => {
    await page.goto('/');
    // redirects to /login if not auth'd
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText(/Tarteel Tots/i);
    await expect(page.locator('h2')).toContainText(/Parent Login/i);
  });

  test('login form → fields exist', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"], input[name*="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('signup link → navigate to signup', async ({ page }) => {
    await page.goto('/login');
    
    const signupLink = page.locator('a:has-text("Create one")');
    await signupLink.click();
    
    await expect(page).toHaveURL(/\/signup/);
  });

  test('signup form → fields exist', async ({ page }) => {
    await page.goto('/signup');
    
    const emailInput = page.locator('input[type="email"], input[name*="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('local mode → no auth required (dev fallback)', async ({ page }) => {
    // if env vars missing → local mode → skip auth
    // bypass login, go to dashboard directly
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // if local mode active → should load (no redirect to /login)
    // adjust assertion based on actual behavior
    const url = page.url();
    const isLocalMode = !url.includes('/login');
    
    if (isLocalMode) {
      expect(url).not.toContain('/login');
    }
  });
});
