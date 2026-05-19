# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Multi-Parent Grade Sync >> multi-device same parent sync (phone → tablet)
- Location: tests/family-audit.spec.js:97:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "/child-play"
Received string:    "http://localhost:5173/login"
```

# Test source

```ts
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
  45  |       await page.waitForSelector('text=Setup Your Space', { timeout: 5000 });
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
> 117 |         expect(tablet.url()).toContain('/child-play');
      |                              ^ Error: expect(received).toContain(expected) // indexOf
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
  146 | 
  147 |         // Verify no crash, UI stable
  148 |         expect(p1.locator('body')).toBeTruthy();
  149 |         expect(p2.locator('body')).toBeTruthy();
  150 |       } finally {
  151 |         await ctx1.close();
  152 |         await ctx2.close();
  153 |       }
  154 |     });
  155 |   });
  156 | 
  157 |   test.describe('RLS & Permissions Audit', () => {
  158 |     test('parent cannot see other family data (RLS)', async ({ page }) => {
  159 |       // Login as parent1, try to access parent2's family data
  160 |       await page.goto('/login');
  161 |       
  162 |       // This requires actual DB setup with 2 families
  163 |       // For now, just verify login works
  164 |       await page.fill('input[type="email"]', 'test@test.com');
  165 |       await page.fill('input[type="password"]', 'test123');
  166 |       
  167 |       // Try submit (will fail with invalid creds, OK for audit)
  168 |       await page.click('button[type="submit"]');
  169 |       await page.waitForTimeout(500);
  170 |       
  171 |       // Should show error, not crash
  172 |       expect(page.locator('body')).toBeTruthy();
  173 |     });
  174 | 
  175 |     test('verify family_id filtering in child queries', async ({ page }) => {
  176 |       // Navigate to dashboard → verify children shown are from correct family only
  177 |       await page.goto('/dashboard');
  178 |       
  179 |       // If logged in, should see only this family's children
  180 |       const children = page.locator('[class*="child"], li').first();
  181 |       
  182 |       // Audit: just check page loads without error
  183 |       expect(page.locator('body')).toBeTruthy();
  184 |     });
  185 |   });
  186 | 
  187 |   test.describe('Offline & Sync Edge Cases', () => {
  188 |     test('grade offline → online → syncs', async ({ page }) => {
  189 |       await page.goto('/child-play');
  190 |       
  191 |       // Go offline
  192 |       await page.context().setOffline(true);
  193 |       
  194 |       // Grade
  195 |       const btn = page.locator('button').filter({ hasText: '🟡' }).first();
  196 |       if (await btn.isVisible({ timeout: 2000 })) {
  197 |         await btn.click();
  198 |       }
  199 |       
  200 |       // Back online
  201 |       await page.context().setOffline(false);
  202 |       await page.waitForTimeout(1500);
  203 |       
  204 |       // Verify sync triggered (check SW activity or DB state)
  205 |       expect(page.locator('body')).toBeTruthy();
  206 |     });
  207 | 
  208 |     test('family code valid/invalid handling', async ({ page }) => {
  209 |       await page.goto('/signup');
  210 |       
  211 |       // Click "Create Account" → "Join Family"
  212 |       await page.fill('input[type="email"]', `test-${Date.now()}@test.com`);
  213 |       await page.fill('input[type="password"]', 'pass123');
  214 |       await page.fill('input[placeholder*="name"]', 'Test User');
  215 |       await page.click('button[type="submit"]');
  216 |       
  217 |       // Step 2: Try to join with invalid code
```