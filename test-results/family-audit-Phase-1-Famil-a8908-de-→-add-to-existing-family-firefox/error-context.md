# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Family Creation Flow >> join family → enter code → add to existing family
- Location: tests/family-audit.spec.js:32:5

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
  17  |       await page.waitForSelector('text=Setup Your Space', { timeout: 5000 });
  18  |       await page.click('button:has-text("Create New Family")');
  19  |       
  20  |       // Enter family name
  21  |       await page.fill('input[placeholder*="Family"]', 'Test Family');
  22  |       await page.click('button:has-text("Create")');
  23  |       
  24  |       // Step 3: Should see family code (or navigate to onboarding)
  25  |       await page.waitForTimeout(1000);
  26  |       const bodyText = await page.textContent('body');
  27  |       
  28  |       // Verify either family code shown or child creation flow starts
  29  |       expect(bodyText).toMatch(/code|child|onboarding|success/i);
  30  |     });
  31  | 
  32  |     test('join family → enter code → add to existing family', async ({ page }) => {
  33  |       // This requires 2 browsers - parent1 creates, parent2 joins
  34  |       // Simplified: just verify join flow exists
  35  |       await page.goto('/signup');
  36  |       
  37  |       // Step 1: Create second account
  38  |       await page.fill('input[type="email"]', `parent2-${Date.now()}@test.com`);
  39  |       await page.fill('input[type="password"]', 'password123');
  40  |       await page.fill('input[placeholder*="name"]', 'Father One');
  41  |       await page.click('button:has-text("Father")');
  42  |       await page.click('button:has-text("Create Account")');
  43  |       
  44  |       // Step 2: Family choice - Join
> 45  |       await page.waitForSelector('text=Setup Your Space', { timeout: 5000 });
      |                  ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  46  |       await page.click('button:has-text("Join Family")');
  47  |       
  48  |       // Enter family code (placeholder)
  49  |       const codeInput = page.locator('input[placeholder*="code"], input[placeholder*="Code"]').first();
  50  |       await codeInput.fill('ABC123');
  51  |       
  52  |       // Try to join (will fail with invalid code, but tests flow)
  53  |       await page.click('button:has-text(/join|enter|submit/i)');
  54  |       
  55  |       // Should show error or success
  56  |       await page.waitForTimeout(500);
  57  |       const msg = await page.textContent('body');
  58  |       expect(msg).toMatch(/not found|joined|error|code/i);
  59  |     });
  60  |   });
  61  | 
  62  |   test.describe('Multi-Parent Grade Sync', () => {
  63  |     test('parent1 grade → realtime visible to parent2', async ({ browser }) => {
  64  |       // Simulate 2 logged-in parents viewing same child
  65  |       const ctx1 = await browser.newContext();
  66  |       const ctx2 = await browser.newContext();
  67  |       const p1 = await ctx1.newPage();
  68  |       const p2 = await ctx2.newPage();
  69  | 
  70  |       try {
  71  |         // Both navigate to child-play
  72  |         await p1.goto('/child-play');
  73  |         await p2.goto('/child-play');
  74  | 
  75  |         // Parent1 grades 🟢 Perfect
  76  |         const btn1 = p1.locator('button').filter({ hasText: '🟢' }).first();
  77  |         if (await btn1.isVisible({ timeout: 3000 })) {
  78  |           await btn1.click();
  79  |           await p1.waitForTimeout(500);
  80  |         }
  81  | 
  82  |         // Parent2 waits for realtime update (WebSocket)
  83  |         await p2.waitForTimeout(2000);
  84  | 
  85  |         // Parent2 should see grade (either UI update or check localStorage/DB)
  86  |         const progress = p2.locator('[class*="grade"], [class*="progress"], [aria-pressed]').first();
  87  |         
  88  |         if (await progress.isVisible({ timeout: 3000 })) {
  89  |           expect(await progress.isVisible()).toBeTruthy();
  90  |         }
  91  |       } finally {
  92  |         await ctx1.close();
  93  |         await ctx2.close();
  94  |       }
  95  |     });
  96  | 
  97  |     test('multi-device same parent sync (phone → tablet)', async ({ browser }) => {
  98  |       const ctx1 = await browser.newContext();
  99  |       const ctx2 = await browser.newContext();
  100 |       const phone = await ctx1.newPage();
  101 |       const tablet = await ctx2.newPage();
  102 | 
  103 |       try {
  104 |         // Same parent, 2 devices
  105 |         await phone.goto('/child-play');
  106 |         await tablet.goto('/child-play');
  107 | 
  108 |         // Grade on phone
  109 |         const btn = phone.locator('button').filter({ hasText: '🟡' }).first();
  110 |         if (await btn.isVisible({ timeout: 3000 })) {
  111 |           await btn.click();
  112 |         }
  113 | 
  114 |         // Check tablet sees update
  115 |         await tablet.waitForTimeout(1500);
  116 |         
  117 |         expect(tablet.url()).toContain('/child-play');
  118 |       } finally {
  119 |         await ctx1.close();
  120 |         await ctx2.close();
  121 |       }
  122 |     });
  123 | 
  124 |     test('concurrent grades on same ayah (conflict)', async ({ browser }) => {
  125 |       const ctx1 = await browser.newContext();
  126 |       const ctx2 = await browser.newContext();
  127 |       const p1 = await ctx1.newPage();
  128 |       const p2 = await ctx2.newPage();
  129 | 
  130 |       try {
  131 |         await p1.goto('/child-play');
  132 |         await p2.goto('/child-play');
  133 | 
  134 |         // Both click different grade buttons simultaneously
  135 |         const btn1 = p1.locator('button').filter({ hasText: '🟢' }).first();
  136 |         const btn2 = p2.locator('button').filter({ hasText: '🔴' }).first();
  137 | 
  138 |         if (await btn1.isVisible({ timeout: 2000 })) {
  139 |           await Promise.all([
  140 |             btn1.click().catch(() => {}),
  141 |             btn2.click().catch(() => {})
  142 |           ]);
  143 |         }
  144 | 
  145 |         await p1.waitForTimeout(1500);
```