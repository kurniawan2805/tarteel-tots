# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Auth Flow >> signup form → fields exist
- Location: tests/auth.spec.js:33:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="email"], input[name*="email"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[type="email"], input[name*="email"]')

```

```yaml
- text: "[plugin:vite:oxc] Transform failed with 1 error: [PARSE_ERROR] Unexpected token ╭─[ src/contexts/AuthContext.jsx:254:1 ] │ 254 │ } │ ┬ │ ╰── ─────╯ /Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/src/contexts/AuthContext.jsx at transformWithOxc (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:3339:19) at TransformPluginContext.transform (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:3410:26) at EnvironmentPluginContainer.transform (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:30271:51) at async loadAndTransform (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:24532:26) at async viteTransformMiddleware (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:24326:20) Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
- code: server.hmr.overlay
- text: to
- code: "false"
- text: in
- code: vite.config.js
- text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Auth Flow', () => {
  4  |   test('navigate → login page loads', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     // redirects to /login if not auth'd
  7  |     await expect(page).toHaveURL(/\/login/);
  8  |     await expect(page.locator('h1')).toContainText(/Tarteel Tots/i);
  9  |     await expect(page.locator('h2')).toContainText(/Parent Login/i);
  10 |   });
  11 | 
  12 |   test('login form → fields exist', async ({ page }) => {
  13 |     await page.goto('/login');
  14 |     
  15 |     const emailInput = page.locator('input[type="email"], input[name*="email"]');
  16 |     const passwordInput = page.locator('input[type="password"]');
  17 |     const submitBtn = page.locator('button[type="submit"]');
  18 |     
  19 |     await expect(emailInput).toBeVisible();
  20 |     await expect(passwordInput).toBeVisible();
  21 |     await expect(submitBtn).toBeVisible();
  22 |   });
  23 | 
  24 |   test('signup link → navigate to signup', async ({ page }) => {
  25 |     await page.goto('/login');
  26 |     
  27 |     const signupLink = page.locator('a:has-text("Create one")');
  28 |     await signupLink.click();
  29 |     
  30 |     await expect(page).toHaveURL(/\/signup/);
  31 |   });
  32 | 
  33 |   test('signup form → fields exist', async ({ page }) => {
  34 |     await page.goto('/signup');
  35 |     
  36 |     const emailInput = page.locator('input[type="email"], input[name*="email"]');
  37 |     const passwordInput = page.locator('input[type="password"]');
  38 |     const submitBtn = page.locator('button[type="submit"]');
  39 |     
> 40 |     await expect(emailInput).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  41 |     await expect(passwordInput).toBeVisible();
  42 |     await expect(submitBtn).toBeVisible();
  43 |   });
  44 | 
  45 |   test('local mode → no auth required (dev fallback)', async ({ page }) => {
  46 |     // if env vars missing → local mode → skip auth
  47 |     // bypass login, go to dashboard directly
  48 |     await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  49 |     
  50 |     // if local mode active → should load (no redirect to /login)
  51 |     // adjust assertion based on actual behavior
  52 |     const url = page.url();
  53 |     const isLocalMode = !url.includes('/login');
  54 |     
  55 |     if (isLocalMode) {
  56 |       expect(url).not.toContain('/login');
  57 |     }
  58 |   });
  59 | });
  60 | 
```