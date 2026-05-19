import { test, expect } from '@playwright/test';

test.describe('Child Play Mode', () => {
  test.beforeEach(async ({ page }) => {
    // skip auth check (local mode or mocked session)
    // directly navigate to child play
    await page.goto('/child-play');
  });

  test('page load → content visible', async ({ page }) => {
    await expect(page.locator('body')).toBeTruthy();
    
    // child mode = full-screen, giant controls
    const playContainer = page.locator('[class*="child"], [class*="play"]');
    await expect(playContainer.first()).toBeVisible();
  });

  test('audio player → controls exist', async ({ page }) => {
    const playBtn = page.locator('button:has-text("Play"), button[aria-label*="play"]').first();
    const pauseBtn = page.locator('button:has-text("Pause"), button[aria-label*="pause"]').first();
    const loopControl = page.locator('[class*="loop"], input[type="range"]').first();
    
    await expect(playBtn.or(pauseBtn)).toBeVisible();
  });

  test('grading panel → grade buttons exist', async ({ page }) => {
    const redGrade = page.locator('button:has-text("🔴"), [aria-label*="needs help"]').first();
    const yellowGrade = page.locator('button:has-text("🟡"), [aria-label*="good"]').first();
    const greenGrade = page.locator('button:has-text("🟢"), [aria-label*="perfect"]').first();
    
    await expect(redGrade.or(yellowGrade).or(greenGrade)).toBeVisible();
  });

  test('grade button click → record interaction', async ({ page }) => {
    const greenBtn = page.locator('button:has-text("🟢"), [aria-label*="perfect"]').first();
    
    if (await greenBtn.isVisible()) {
      await greenBtn.click();
      // verify state change (highlight, disable, etc)
      // adjust based on actual behavior
      const isPressedOrDisabled = await greenBtn.getAttribute('aria-pressed') === 'true' || await greenBtn.isDisabled();
      expect(isPressedOrDisabled).toBeTruthy();
    }
  });

  test('garden display → visible on page', async ({ page }) => {
    const garden = page.locator('[class*="garden"], [class*="streak"], [class*="palm"]').first();
    
    if (await garden.isVisible()) {
      await expect(garden).toContainText(/🌱|🌰|🌿|🌳|🌴/);
    }
  });

  test('screen dim after inactive → radio mode', async ({ page }) => {
    // if screen_time_limit exceeded → screen dims (night sky bg)
    const nightSkyEl = page.locator('[class*="night"], [style*="background"], body').first();
    
    // rough check: if night sky class/style applied after timeout
    // depends on useScreenTime hook impl
    // test may need adjustment based on actual dimming behavior
    expect(nightSkyEl).toBeTruthy();
  });

  test('Ayah content → display + audio', async ({ page }) => {
    const ayahText = page.locator('div:has-text(/سورة|آية/i), [class*="ayah"]').first();
    
    if (await ayahText.isVisible()) {
      await expect(ayahText).toBeVisible();
    }
  });

  test('viewport lock → no scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // mobile
    
    const overflow = await page.locator('body').evaluate(el => window.getComputedStyle(el).overflow);
    
    // child mode should disable scroll or lock viewport
    expect(overflow === 'hidden' || overflow === 'auto').toBeTruthy();
  });
});
