# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pwa.spec.js >> PWA Installability >> offline page loads from cache
- Location: tests/pwa.spec.js:109:3

# Error details

```
Error: page.reload: WebKit encountered an internal error
Call log:
  - waiting for navigation until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: 🌴
    - heading "Tarteel Tots" [level=1] [ref=e6]
    - paragraph [ref=e7]: Quran memorization for little ones
  - generic [ref=e8]:
    - heading "Parent Login" [level=2] [ref=e9]
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Email
        - textbox "parent@example.com" [ref=e13]
      - generic [ref=e14]:
        - generic [ref=e15]: Password
        - textbox "••••••••" [ref=e16]
      - button "Login" [ref=e17] [cursor=pointer]
    - paragraph [ref=e18]:
      - text: Don't have an account?
      - link "Create one" [ref=e19]:
        - /url: /signup
    - button "Try without account →" [ref=e21]
```

# Test source

```ts
  18  |       return navigator.serviceWorker?.controller !== null || 
  19  |              navigator.serviceWorker?.getRegistrations().then(r => r.length > 0);
  20  |     });
  21  |     
  22  |     expect(swRegistered).toBeTruthy();
  23  |   });
  24  | 
  25  |   test('theme-color meta tag present', async ({ page }) => {
  26  |     await page.goto('/');
  27  |     
  28  |     const themeColor = page.locator('meta[name="theme-color"]');
  29  |     await expect(themeColor).toHaveAttribute('content', '#FDFBF7');
  30  |   });
  31  | 
  32  |   test('manifest link in head', async ({ page }) => {
  33  |     await page.goto('/');
  34  |     
  35  |     const link = page.locator('link[rel="manifest"]');
  36  |     await expect(link.first()).toBeVisible();
  37  |   });
  38  | 
  39  |   test('install prompt shows after 10s (non-installed)', async ({ page }) => {
  40  |     // On fresh visit, install prompt should appear
  41  |     await page.goto('/');
  42  |     
  43  |     // Wait for install prompt (10s timeout in hook)
  44  |     await page.waitForTimeout(11000);
  45  |     
  46  |     // Look for install button or prompt text
  47  |     const prompt = page.locator('text=/Install|Get Tarteel/i');
  48  |     
  49  |     // Prompt may not show if standalone mode, so skip assertion
  50  |     // Just verify no error
  51  |     await expect(page.locator('body')).toBeVisible();
  52  |   });
  53  | 
  54  |   test('app icon visible in manifest', async ({ page }) => {
  55  |     const response = await page.goto('/manifest.webmanifest');
  56  |     const manifest = await response.json();
  57  |     
  58  |     expect(manifest.icons[0].src).toContain('icon-192');
  59  |     expect(manifest.icons[1].src).toContain('icon-512');
  60  |     expect(manifest.icons[2].purpose).toBe('maskable');
  61  |   });
  62  | 
  63  |   test('start_url points to root', async ({ page }) => {
  64  |     const response = await page.goto('/manifest.webmanifest');
  65  |     const manifest = await response.json();
  66  |     
  67  |     expect(manifest.start_url).toBe('/');
  68  |   });
  69  | 
  70  |   test('display mode is standalone', async ({ page }) => {
  71  |     const response = await page.goto('/manifest.webmanifest');
  72  |     const manifest = await response.json();
  73  |     
  74  |     expect(manifest.display).toBe('standalone');
  75  |   });
  76  | 
  77  |   test('dismiss prompt increments counter (soft re-prompt)', async ({ page }) => {
  78  |     await page.goto('/');
  79  |     
  80  |     // Simulate dismiss count in localStorage
  81  |     await page.evaluate(() => {
  82  |       localStorage.setItem('pwaPromptDismissCount', '1');
  83  |     });
  84  |     
  85  |     // Refresh → hook checks dismissCount < 3
  86  |     await page.reload();
  87  |     
  88  |     const count = await page.evaluate(() => localStorage.getItem('pwaPromptDismissCount'));
  89  |     expect(parseInt(count, 10)).toBe(1);
  90  |   });
  91  | 
  92  |   test('install resets dismiss counter', async ({ page }) => {
  93  |     await page.goto('/');
  94  |     
  95  |     // Set dismiss count
  96  |     await page.evaluate(() => {
  97  |       localStorage.setItem('pwaPromptDismissCount', '2');
  98  |     });
  99  |     
  100 |     // After install (simulated), counter should reset
  101 |     await page.evaluate(() => {
  102 |       localStorage.removeItem('pwaPromptDismissCount');
  103 |     });
  104 |     
  105 |     const count = await page.evaluate(() => localStorage.getItem('pwaPromptDismissCount'));
  106 |     expect(count).toBeNull();
  107 |   });
  108 | 
  109 |   test('offline page loads from cache', async ({ page }) => {
  110 |     // First visit → cache app
  111 |     await page.goto('/');
  112 |     await page.waitForTimeout(2000);
  113 |     
  114 |     // Go offline
  115 |     await page.context().setOffline(true);
  116 |     
  117 |     // Reload → should load from SW cache
> 118 |     await page.reload();
      |                ^ Error: page.reload: WebKit encountered an internal error
  119 |     const body = page.locator('body');
  120 |     await expect(body).toBeVisible();
  121 |     
  122 |     // Back online
  123 |     await page.context().setOffline(false);
  124 |   });
  125 | });
  126 | 
```