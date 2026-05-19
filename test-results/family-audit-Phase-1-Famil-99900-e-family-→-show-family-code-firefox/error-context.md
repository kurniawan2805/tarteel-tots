# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Family Creation Flow >> signup → create family → show family code
- Location: tests/family-audit.spec.js:6:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: 🏠
    - heading "Setup Your Space" [level=1] [ref=e6]
    - paragraph [ref=e7]: Create a new family or join an existing one
  - generic [ref=e8]:
    - generic [ref=e9]: infinite recursion detected in policy for relation "memberships"
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Family Name
        - textbox "e.g. The Ahmed Family" [ref=e13]: Test Family
      - button "Create Family Space" [ref=e14] [cursor=pointer]
      - button "BACK" [ref=e15]
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
  46  |         // Click Continue
  47  |         await page.click('button:has-text("Continue to Dashboard")');
  48  |         
  49  |         // Should redirect to dashboard/onboarding
  50  |         await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10000 });
  51  |       } else {
  52  |         // If Step 2.5 didn't render, check page content for errors
  53  |         const pageContent = await page.content();
  54  |         console.log('Page did not reach Step 2.5. Page content snippet:', pageContent.substring(0, 500));
> 55  |         expect(isStep25).toBeTruthy();
      |                          ^ Error: expect(received).toBeTruthy()
  56  |       }
  57  |     });
  58  | 
  59  |     test('join family → enter code → add to existing family', async ({ page }) => {
  60  |       await page.goto('/signup');
  61  |       
  62  |       // Step 1: Create second account
  63  |       await page.fill('input[type="email"]', `parent2-${Date.now()}@test.com`);
  64  |       await page.fill('input[type="password"]', 'password123');
  65  |       await page.fill('input[placeholder="Your name"]', 'Father One');
  66  |       await page.click('button:has-text("Father")');
  67  |       await page.click('button:has-text("Create Account")');
  68  |       
  69  |       // Step 2: Family choice - Join
  70  |       await page.waitForURL(/\/signup|\/dashboard|\/onboarding/, { timeout: 15000 });
  71  |       
  72  |       const setupSpace = page.locator('text=Setup Your Space').first();
  73  |       if (await setupSpace.isVisible({ timeout: 5000 }).catch(() => false)) {
  74  |         await page.click('button:has-text("Join Family")');
  75  |         
  76  |         // Enter family code - find the code input
  77  |         const codeInput = page.locator('input[placeholder*="code"]').or(page.locator('input[placeholder*="TT"]')).first();
  78  |         await codeInput.fill('TT-XXXX');
  79  |         
  80  |         // Try to join
  81  |         await page.click('button:has-text("Join")').catch(() => null);
  82  |         
  83  |         // Should show error (invalid code)
  84  |         await page.waitForTimeout(2000);
  85  |         const msg = await page.textContent('body');
  86  |         expect(msg).toMatch(/not found|invalid|error|check/i);
  87  |       }
  88  |     });
  89  |   });
  90  | 
  91  |   test.describe('Multi-Parent Grade Sync', () => {
  92  |     test('parent1 grade → realtime visible to parent2', async ({ browser }) => {
  93  |       // Simulate 2 logged-in parents viewing same child
  94  |       const ctx1 = await browser.newContext();
  95  |       const ctx2 = await browser.newContext();
  96  |       const p1 = await ctx1.newPage();
  97  |       const p2 = await ctx2.newPage();
  98  | 
  99  |       try {
  100 |         // Both navigate to child-play
  101 |         await p1.goto('/child-play');
  102 |         await p2.goto('/child-play');
  103 | 
  104 |         // Parent1 grades 🟢 Perfect
  105 |         const btn1 = p1.locator('button').filter({ hasText: '🟢' }).first();
  106 |         if (await btn1.isVisible({ timeout: 3000 })) {
  107 |           await btn1.click();
  108 |           await p1.waitForTimeout(500);
  109 |         }
  110 | 
  111 |         // Parent2 waits for realtime update (WebSocket)
  112 |         await p2.waitForTimeout(2000);
  113 | 
  114 |         // Parent2 should see grade (either UI update or check localStorage/DB)
  115 |         const progress = p2.locator('[class*="grade"], [class*="progress"], [aria-pressed]').first();
  116 |         
  117 |         if (await progress.isVisible({ timeout: 3000 })) {
  118 |           expect(await progress.isVisible()).toBeTruthy();
  119 |         }
  120 |       } finally {
  121 |         await ctx1.close();
  122 |         await ctx2.close();
  123 |       }
  124 |     });
  125 | 
  126 |     test.skip('multi-device same parent sync (phone → tablet)', async ({ browser }) => {
  127 |       // Skipped: requires authenticated parent sessions (full login fixture needed)
  128 |       // TODO: Add shared fixture for pre-authenticated users
  129 |       const ctx1 = await browser.newContext();
  130 |       const ctx2 = await browser.newContext();
  131 |       const phone = await ctx1.newPage();
  132 |       const tablet = await ctx2.newPage();
  133 | 
  134 |       try {
  135 |         // Same parent, 2 devices
  136 |         await phone.goto('/child-play');
  137 |         await tablet.goto('/child-play');
  138 | 
  139 |         // Grade on phone
  140 |         const btn = phone.locator('button').filter({ hasText: '🟡' }).first();
  141 |         if (await btn.isVisible({ timeout: 3000 })) {
  142 |           await btn.click();
  143 |         }
  144 | 
  145 |         // Check tablet sees update
  146 |         await tablet.waitForTimeout(1500);
  147 |         
  148 |         expect(tablet.url()).toContain('/child-play');
  149 |       } finally {
  150 |         await ctx1.close();
  151 |         await ctx2.close();
  152 |       }
  153 |     });
  154 | 
  155 |     test('concurrent grades on same ayah (conflict)', async ({ browser }) => {
```