# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-audit.spec.js >> Phase 1: Family Creation & Multi-Parent Sync Audit >> Offline & Sync Edge Cases >> family code valid/invalid handling
- Location: tests/family-audit.spec.js:242:5

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
  170 | 
  171 |         // Both click different grade buttons simultaneously
  172 |         const btn1 = p1.locator('button').filter({ hasText: '🟢' }).first();
  173 |         const btn2 = p2.locator('button').filter({ hasText: '🔴' }).first();
  174 | 
  175 |         if (await btn1.isVisible({ timeout: 2000 })) {
  176 |           await Promise.all([
  177 |             btn1.click().catch(() => {}),
  178 |             btn2.click().catch(() => {})
  179 |           ]);
  180 |         }
  181 | 
  182 |         await p1.waitForTimeout(1500);
  183 | 
  184 |         // Verify no crash, UI stable
  185 |         expect(p1.locator('body')).toBeTruthy();
  186 |         expect(p2.locator('body')).toBeTruthy();
  187 |       } finally {
  188 |         await ctx1.close();
  189 |         await ctx2.close();
  190 |       }
  191 |     });
  192 |   });
  193 | 
  194 |   test.describe('RLS & Permissions Audit', () => {
  195 |     test('parent cannot see other family data (RLS)', async ({ page }) => {
  196 |       // Login as parent1, try to access parent2's family data
  197 |       await page.goto('/login');
  198 |       
  199 |       // This requires actual DB setup with 2 families
  200 |       // For now, just verify login works
  201 |       await page.fill('input[type="email"]', 'test@test.com');
  202 |       await page.fill('input[type="password"]', 'test123');
  203 |       
  204 |       // Try submit (will fail with invalid creds, OK for audit)
  205 |       await page.click('button[type="submit"]');
  206 |       await page.waitForTimeout(500);
  207 |       
  208 |       // Should show error, not crash
  209 |       expect(page.locator('body')).toBeTruthy();
  210 |     });
  211 | 
  212 |     test('verify family_id filtering in child queries', async ({ page }) => {
  213 |       // Navigate to dashboard → verify children shown are from correct family only
  214 |       await page.goto('/dashboard');
  215 |       
  216 |       // Audit: just check page loads without error
  217 |       expect(page.locator('body')).toBeTruthy();
  218 |     });
  219 |   });
  220 | 
  221 |   test.describe('Offline & Sync Edge Cases', () => {
  222 |     test('grade offline → online → syncs', async ({ page }) => {
  223 |       await page.goto('/child-play');
  224 |       
  225 |       // Go offline
  226 |       await page.context().setOffline(true);
  227 |       
  228 |       // Grade
  229 |       const btn = page.locator('button').filter({ hasText: '🟡' }).first();
  230 |       if (await btn.isVisible({ timeout: 2000 })) {
  231 |         await btn.click();
  232 |       }
  233 |       
  234 |       // Back online
  235 |       await page.context().setOffline(false);
  236 |       await page.waitForTimeout(1500);
  237 |       
  238 |       // Verify sync triggered (check SW activity or DB state)
  239 |       expect(page.locator('body')).toBeTruthy();
  240 |     });
  241 | 
  242 |     test('family code valid/invalid handling', async ({ page }) => {
  243 |       await page.goto('/signup');
  244 |       
  245 |       // Quick account creation
> 246 |       await page.fill('input[type="email"]', `test-${Date.now()}@test.com`);
      |                  ^ Error: page.fill: Test timeout of 30000ms exceeded.
  247 |       await page.fill('input[type="password"]', 'pass123');
  248 |       await page.fill('input[placeholder="Your name"]', 'Test User');
  249 |       await page.click('button:has-text("Create Account")');
  250 |       
  251 |       // Step 2: Try to join with invalid code
  252 |       await page.waitForURL(/\/signup|\/dashboard|\/onboarding/, { timeout: 15000 });
  253 |       
  254 |       const setupSpace = page.locator('text=Setup Your Space').first();
  255 |       if (await setupSpace.isVisible({ timeout: 5000 }).catch(() => false)) {
  256 |         await page.click('button:has-text("Join Family")');
  257 |         
  258 |         // Find code field - look for input with family code placeholder
  259 |         const codeField = page.locator('input').filter({ hasText: /code|TT/ }).first();
  260 |         await codeField.fill('INVALID_CODE_XYZ');
  261 |         
  262 |         await page.click('button:has-text("Join")').catch(() => null);
  263 |         
  264 |         // Should show error, not crash
  265 |         await page.waitForTimeout(1000);
  266 |         const bodyText = await page.textContent('body');
  267 |         expect(bodyText).toMatch(/not found|error|check|invalid/i);
  268 |       }
  269 |     });
  270 |   });
  271 | 
  272 |   test.describe('Grade Attribution Audit', () => {
  273 |     test('grade shows parent name (or at least stores it)', async ({ page }) => {
  274 |       // Navigate to dashboard or progress view
  275 |       await page.goto('/dashboard');
  276 |       
  277 |       // Look for grade + parent attribution
  278 |       const gradeText = page.locator('text=/grade|mother|father/i').first();
  279 |       
  280 |       // Audit: just verify page renders
  281 |       if (await gradeText.isVisible({ timeout: 2000 })) {
  282 |         expect(await gradeText.textContent()).toBeTruthy();
  283 |       }
  284 |     });
  285 | 
  286 |     test('grade history shows all parent grades (not just latest)', async ({ page }) => {
  287 |       await page.goto('/dashboard');
  288 |       
  289 |       // Audit check
  290 |       expect(page.locator('body')).toBeTruthy();
  291 |     });
  292 |   });
  293 | });
  294 | 
```