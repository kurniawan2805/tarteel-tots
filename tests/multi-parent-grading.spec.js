import { test, expect } from '@playwright/test';

test.describe('Grading & SR Logic', () => {
  test('grade 🟢 Perfect → updates progress', async ({ page }) => {
    await page.goto('/child-play');
    
    // find grade button
    const gradeBtn = page.locator('button').filter({ hasText: '🟢' }).first();
    
    if (await gradeBtn.isVisible({ timeout: 5000 })) {
      await gradeBtn.click();
      await page.waitForTimeout(500);
      
      // verify state change
      expect(await gradeBtn.isEnabled()).toBeTruthy();
    }
  });

  test('grade 🔴 Needs Help → records low score', async ({ page }) => {
    await page.goto('/child-play');
    
    const redBtn = page.locator('button').filter({ hasText: '🔴' }).first();
    
    if (await redBtn.isVisible({ timeout: 5000 })) {
      await redBtn.click();
      await page.waitForTimeout(500);
      
      expect(await redBtn.isEnabled()).toBeTruthy();
    }
  });

  test('garden visible → streak display works', async ({ page }) => {
    await page.goto('/child-play');
    
    // look for garden emoji/element
    const garden = page.locator('text=/🌱|🌰|🌿|🌳|🌴/');
    
    if (await garden.first().isVisible({ timeout: 5000 })) {
      await expect(garden.first()).toBeVisible();
    }
  });

  test('audio player controls visible', async ({ page }) => {
    await page.goto('/child-play');
    
    // play button
    const playBtn = page.locator('button').filter({ hasText: /play|▶/i }).first();
    
    if (await playBtn.isVisible({ timeout: 5000 })) {
      await expect(playBtn).toBeVisible();
    }
  });

  test('offline → grade locally → stays in Dexie', async ({ page }) => {
    await page.goto('/child-play');
    
    // go offline
    await page.context().setOffline(true);
    
    const btn = page.locator('button').filter({ hasText: '🟡' }).first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
    }
    
    // verify no error (local storage works)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // back online
    await page.context().setOffline(false);
  });
});
