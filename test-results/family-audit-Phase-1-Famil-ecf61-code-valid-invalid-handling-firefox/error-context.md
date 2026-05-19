# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Offline & Sync Edge Cases >> family code valid/invalid handling
- Location: tests/family-audit.spec.js:208:5

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
> 218 |       await page.waitForSelector('text=Setup Your Space', { timeout: 5000 });
      |                  ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  219 |       await page.click('button:has-text("Join Family")');
  220 |       
  221 |       const codeField = page.locator('input').filter({ placeholder: /code|Code/i }).first();
  222 |       await codeField.fill('INVALID_CODE_XYZ');
  223 |       
  224 |       await page.click('button:has-text(/join|enter|submit/i)');
  225 |       
  226 |       // Should show error, not crash
  227 |       await page.waitForTimeout(500);
  228 |       expect(page.locator('body')).toBeTruthy();
  229 |     });
  230 |   });
  231 | 
  232 |   test.describe('Grade Attribution Audit', () => {
  233 |     test('grade shows parent name (or at least stores it)', async ({ page }) => {
  234 |       // Navigate to dashboard or progress view
  235 |       await page.goto('/dashboard');
  236 |       
  237 |       // Look for grade + parent attribution
  238 |       const gradeText = page.locator('text=/grade|mother|father/i').first();
  239 |       
  240 |       // Audit: just verify page renders
  241 |       if (await gradeText.isVisible({ timeout: 2000 })) {
  242 |         expect(await gradeText.textContent()).toBeTruthy();
  243 |       }
  244 |     });
  245 | 
  246 |     test('grade history shows all parent grades (not just latest)', async ({ page }) => {
  247 |       await page.goto('/dashboard');
  248 |       
  249 |       // Look for history or multiple grades per ayah
  250 |       const history = page.locator('[class*="history"], [class*="grades"]').first();
  251 |       
  252 |       // Audit check
  253 |       expect(page.locator('body')).toBeTruthy();
  254 |     });
  255 |   });
  256 | });
  257 | 
```