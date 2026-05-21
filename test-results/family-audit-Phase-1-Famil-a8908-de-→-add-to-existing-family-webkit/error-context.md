# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Family Creation Flow >> join family → enter code → add to existing family
- Location: tests/family-audit.spec.js:65:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:oxc] Transform failed with 1 error: [PARSE_ERROR] Unexpected token ╭─[ src/contexts/AuthContext.jsx:254:1 ] │ 254 │ } │ ┬ │ ╰── ─────╯"
  - generic [ref=e5]: /Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/src/contexts/AuthContext.jsx
  - generic [ref=e6]: at transformWithOxc (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:3339:19) at TransformPluginContext.transform (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:3410:26) at EnvironmentPluginContainer.transform (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:30271:51) at async loadAndTransform (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:24532:26) at async viteTransformMiddleware (file:///Users/adi/Library/CloudStorage/OneDrive-KFUPM/dev/tarteel-tots/node_modules/vite/dist/node/chunks/node.js:24326:20)
  - generic [ref=e7]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e8]: server.hmr.overlay
    - text: to
    - code [ref=e9]: "false"
    - text: in
    - code [ref=e10]: vite.config.js
    - text: .
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
  8   |       await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  9   |       
  10  |       // Step 1
  11  |       const email = `parent1-${Date.now()}@test.com`;
  12  |       await page.fill('input[type="email"]', email);
  13  |       await page.fill('input[type="password"]', 'password123');
  14  |       await page.fill('input[placeholder="Your name"]', 'Mother One');
  15  |       await page.click('button:has-text("Mother")');
  16  |       await page.click('button:has-text("Create Account")');
  17  |       
  18  |       // Step 2: Wait for Setup Your Space
  19  |       const setupSpace = page.locator('text=Setup Your Space');
  20  |       await setupSpace.waitFor({ timeout: 15000 });
  21  |       expect(await setupSpace.isVisible()).toBeTruthy();
  22  |       
  23  |       // Click Create New Family
  24  |       await page.click('button:has-text("Create New Family")');
  25  |       
  26  |       // Enter family name
  27  |       const familyInput = page.locator('input[placeholder="e.g. The Ahmed Family"]');
  28  |       await familyInput.waitFor({ timeout: 5000 });
  29  |       await familyInput.fill('Test Family');
  30  |       
  31  |       // Click Create Family Space
  32  |       await page.click('button:has-text("Create Family Space")');
  33  |       
  34  |       // Step 2.5: Wait for Family Space Created message
  35  |       const familyCreated = page.locator('text=Family Space Created');
  36  |       await familyCreated.waitFor({ timeout: 10000 }).catch(() => null);
  37  |       
  38  |       // If we see "Family Space Created", that means Step 2.5 rendered
  39  |       const isStep25 = await familyCreated.isVisible({ timeout: 3000 }).catch(() => false);
  40  |       
  41  |       if (isStep25) {
  42  |         // Look for family code display
  43  |         const codeElement = page.locator('code').first();
  44  |         expect(await codeElement.textContent()).toMatch(/^TT-[A-Z0-9]{4}$/);
  45  |         
  46  |         // Click Continue (takes to Step 3: Linked)
  47  |         await page.click('button:has-text("Continue to Dashboard")');
  48  |         
  49  |         // Step 3: Wait for Linked message
  50  |         await page.waitForSelector('text=You\'re Linked', { timeout: 5000 });
  51  |         
  52  |         // Click final Go to Dashboard button
  53  |         await page.click('button:has-text("Go to Dashboard")');
  54  |         
  55  |         // Should redirect to dashboard/onboarding
  56  |         await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10000 });
  57  |       } else {
  58  |         // If Step 2.5 didn't render, check page content for errors
  59  |         const pageContent = await page.content();
  60  |         console.log('Page did not reach Step 2.5. Page content snippet:', pageContent.substring(0, 500));
  61  |         expect(isStep25).toBeTruthy();
  62  |       }
  63  |     });
  64  | 
  65  |     test('join family → enter code → add to existing family', async ({ page }) => {
  66  |       await page.goto('/signup');
  67  |       
  68  |       // Step 1: Create second account
> 69  |       await page.fill('input[type="email"]', `parent2-${Date.now()}@test.com`);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
  70  |       await page.fill('input[type="password"]', 'password123');
  71  |       await page.fill('input[placeholder="Your name"]', 'Father One');
  72  |       await page.click('button:has-text("Father")');
  73  |       await page.click('button:has-text("Create Account")');
  74  |       
  75  |       // Step 2: Family choice - Join
  76  |       await page.waitForURL(/\/signup|\/dashboard|\/onboarding/, { timeout: 15000 });
  77  |       
  78  |       const setupSpace = page.locator('text=Setup Your Space').first();
  79  |       if (await setupSpace.isVisible({ timeout: 5000 }).catch(() => false)) {
  80  |         await page.click('button:has-text("Join Family")');
  81  |         
  82  |         // Enter family code - find the code input
  83  |         const codeInput = page.locator('input[placeholder*="code"]').or(page.locator('input[placeholder*="TT"]')).first();
  84  |         await codeInput.fill('TT-XXXX');
  85  |         
  86  |         // Try to join
  87  |         await page.click('button:has-text("Join")').catch(() => null);
  88  |         
  89  |         // Should show error (invalid code)
  90  |         await page.waitForTimeout(2000);
  91  |         const msg = await page.textContent('body');
  92  |         expect(msg).toMatch(/not found|invalid|error|check/i);
  93  |       }
  94  |     });
  95  |   });
  96  | 
  97  |   test.describe('Multi-Parent Grade Sync', () => {
  98  |     test('parent1 grade → realtime visible to parent2', async ({ browser }) => {
  99  |       // Simulate 2 logged-in parents viewing same child
  100 |       const ctx1 = await browser.newContext();
  101 |       const ctx2 = await browser.newContext();
  102 |       const p1 = await ctx1.newPage();
  103 |       const p2 = await ctx2.newPage();
  104 | 
  105 |       try {
  106 |         // Both navigate to child-play
  107 |         await p1.goto('/child-play');
  108 |         await p2.goto('/child-play');
  109 | 
  110 |         // Parent1 grades 🟢 Perfect
  111 |         const btn1 = p1.locator('button').filter({ hasText: '🟢' }).first();
  112 |         if (await btn1.isVisible({ timeout: 3000 })) {
  113 |           await btn1.click();
  114 |           await p1.waitForTimeout(500);
  115 |         }
  116 | 
  117 |         // Parent2 waits for realtime update (WebSocket)
  118 |         await p2.waitForTimeout(2000);
  119 | 
  120 |         // Parent2 should see grade (either UI update or check localStorage/DB)
  121 |         const progress = p2.locator('[class*="grade"], [class*="progress"], [aria-pressed]').first();
  122 |         
  123 |         if (await progress.isVisible({ timeout: 3000 })) {
  124 |           expect(await progress.isVisible()).toBeTruthy();
  125 |         }
  126 |       } finally {
  127 |         await ctx1.close();
  128 |         await ctx2.close();
  129 |       }
  130 |     });
  131 | 
  132 |     test.skip('multi-device same parent sync (phone → tablet)', async ({ browser }) => {
  133 |       // Skipped: requires authenticated parent sessions (full login fixture needed)
  134 |       // TODO: Add shared fixture for pre-authenticated users
  135 |       const ctx1 = await browser.newContext();
  136 |       const ctx2 = await browser.newContext();
  137 |       const phone = await ctx1.newPage();
  138 |       const tablet = await ctx2.newPage();
  139 | 
  140 |       try {
  141 |         // Same parent, 2 devices
  142 |         await phone.goto('/child-play');
  143 |         await tablet.goto('/child-play');
  144 | 
  145 |         // Grade on phone
  146 |         const btn = phone.locator('button').filter({ hasText: '🟡' }).first();
  147 |         if (await btn.isVisible({ timeout: 3000 })) {
  148 |           await btn.click();
  149 |         }
  150 | 
  151 |         // Check tablet sees update
  152 |         await tablet.waitForTimeout(1500);
  153 |         
  154 |         expect(tablet.url()).toContain('/child-play');
  155 |       } finally {
  156 |         await ctx1.close();
  157 |         await ctx2.close();
  158 |       }
  159 |     });
  160 | 
  161 |     test('concurrent grades on same ayah (conflict)', async ({ browser }) => {
  162 |       const ctx1 = await browser.newContext();
  163 |       const ctx2 = await browser.newContext();
  164 |       const p1 = await ctx1.newPage();
  165 |       const p2 = await ctx2.newPage();
  166 | 
  167 |       try {
  168 |         await p1.goto('/child-play');
  169 |         await p2.goto('/child-play');
```