# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Family Creation Flow >> signup → create family → show family code
- Location: tests/family-audit.spec.js:6:5

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('text=Setup Your Space') to be visible

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]: 🌴
  - heading "Welcome to Tarteel Tots" [level=1] [ref=e7]
  - paragraph [ref=e8]: Help your little ones memorize the Quran through gentle repetition and fun rewards.
  - button "Get Started" [ref=e9] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Phase 1: Family Creation & Multi-Parent Sync Audit', () => {
  4   |   
  5   |   test.describe('Family Creation Flow', () => {
  6   |     test('signup → create family → show family code', async ({ page }) => {
  7   |       await page.goto('/signup');
  8   |       
  9   |       // Step 1: Account creation
  10  |       await page.fill('input[type="email"]', `parent1-${Date.now()}@test.com`);
  11  |       await page.fill('input[type="password"]', 'password123');
  12  |       await page.fill('input[placeholder*="name"]', 'Mother One');
  13  |       await page.click('button:has-text("Mother")');
  14  |       await page.click('button:has-text("Create Account")');
  15  |       
  16  |       // Step 2: Family choice - Create
> 17  |       await page.waitForSelector('text=Setup Your Space', { timeout: 5000 });
      |                  ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  18  |       await page.click('button:has-text("Create New Family")');
  19  |       
  20  |       // Enter family name
  21  |       await page.fill('input[placeholder*="Ahmed"]', 'Test Family');
  22  |       await page.click('button:has-text("Create Family Space")');
  23  |       
  24  |       // Step 2.5: Should see family code (NEW!)
  25  |       await page.waitForSelector('text=Family Space Created', { timeout: 5000 });
  26  |       
  27  |       // Verify family code displayed
  28  |       const code = page.locator('code').first();
  29  |       await expect(code).toBeVisible();
  30  |       
  31  |       const codeText = await code.textContent();
  32  |       expect(codeText).toMatch(/^TT-[A-Z0-9]{4}$/);
  33  |       
  34  |       // Click continue
  35  |       await page.click('button:has-text("Continue")');
  36  |       
  37  |       // Should redirect to dashboard
  38  |       await page.waitForURL('/dashboard', { timeout: 5000 });
  39  |     });
  40  | 
  41  |     test('join family → enter code → add to existing family', async ({ page }) => {
  42  |       await page.goto('/signup');
  43  |       
  44  |       // Step 1: Create second account
  45  |       await page.fill('input[type="email"]', `parent2-${Date.now()}@test.com`);
  46  |       await page.fill('input[type="password"]', 'password123');
  47  |       await page.fill('input[placeholder*="name"]', 'Father One');
  48  |       await page.click('button:has-text("Father")');
  49  |       await page.click('button:has-text("Create Account")');
  50  |       
  51  |       // Step 2: Family choice - Join
  52  |       await page.waitForSelector('text=Setup Your Space', { timeout: 5000 });
  53  |       await page.click('button:has-text("Join Family")');
  54  |       
  55  |       // Enter family code (placeholder - will fail, but tests flow)
  56  |       const codeInput = page.locator('input[placeholder*="TT"]').first();
  57  |       await codeInput.fill('TT-XXXX');
  58  |       
  59  |       // Try to join
  60  |       await page.click('button:has-text("Join Space")');
  61  |       
  62  |       // Should show error (invalid code)
  63  |       await page.waitForTimeout(1000);
  64  |       const msg = await page.textContent('body');
  65  |       expect(msg).toMatch(/not found|error|check/i);
  66  |     });
  67  |   });
  68  | 
  69  |   test.describe('Multi-Parent Grade Sync', () => {
  70  |     test('parent1 grade → realtime visible to parent2', async ({ browser }) => {
  71  |       // Simulate 2 logged-in parents viewing same child
  72  |       const ctx1 = await browser.newContext();
  73  |       const ctx2 = await browser.newContext();
  74  |       const p1 = await ctx1.newPage();
  75  |       const p2 = await ctx2.newPage();
  76  | 
  77  |       try {
  78  |         // Both navigate to child-play
  79  |         await p1.goto('/child-play');
  80  |         await p2.goto('/child-play');
  81  | 
  82  |         // Parent1 grades 🟢 Perfect
  83  |         const btn1 = p1.locator('button').filter({ hasText: '🟢' }).first();
  84  |         if (await btn1.isVisible({ timeout: 3000 })) {
  85  |           await btn1.click();
  86  |           await p1.waitForTimeout(500);
  87  |         }
  88  | 
  89  |         // Parent2 waits for realtime update (WebSocket)
  90  |         await p2.waitForTimeout(2000);
  91  | 
  92  |         // Parent2 should see grade (either UI update or check localStorage/DB)
  93  |         const progress = p2.locator('[class*="grade"], [class*="progress"], [aria-pressed]').first();
  94  |         
  95  |         if (await progress.isVisible({ timeout: 3000 })) {
  96  |           expect(await progress.isVisible()).toBeTruthy();
  97  |         }
  98  |       } finally {
  99  |         await ctx1.close();
  100 |         await ctx2.close();
  101 |       }
  102 |     });
  103 | 
  104 |     test('multi-device same parent sync (phone → tablet)', async ({ browser }) => {
  105 |       const ctx1 = await browser.newContext();
  106 |       const ctx2 = await browser.newContext();
  107 |       const phone = await ctx1.newPage();
  108 |       const tablet = await ctx2.newPage();
  109 | 
  110 |       try {
  111 |         // Same parent, 2 devices
  112 |         await phone.goto('/child-play');
  113 |         await tablet.goto('/child-play');
  114 | 
  115 |         // Grade on phone
  116 |         const btn = phone.locator('button').filter({ hasText: '🟡' }).first();
  117 |         if (await btn.isVisible({ timeout: 3000 })) {
```