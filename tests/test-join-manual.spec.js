import { test } from '@playwright/test';

test('Manual signup test with logs', async ({ page }) => {
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('Load profile') || text.includes('step')) {
      logs.push(`${msg.type()}: ${text}`);
    }
  });

  await page.goto('http://localhost:5173/signup');
  await page.waitForLoadState('networkidle');
  
  const email = `test-${Date.now()}@example.com`;
  await page.fill('input[placeholder="Your name"]', 'Test Parent');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'TestPass123!');
  await page.click('button:has-text("Mother")');
  
  console.log('Submitting signup...');
  await page.click('button:has-text("Create Account")');
  
  await page.waitForTimeout(3000);
  
  const content = await page.content();
  const hasStep2 = content.includes('Setup Your Space');
  console.log('Has Step 2 (Setup Your Space):', hasStep2);
  
  if (hasStep2) {
    console.log('✅ SUCCESS - Signup advanced to Step 2!');
    const joinBtn = page.locator('button:has-text("Join Family")');
    console.log('Join Family button visible:', await joinBtn.isVisible().catch(() => false));
  } else {
    console.log('❌ FAILED - Still on Step 1');
  }
  
  console.log('Console errors:');
  logs.forEach(l => console.log(l));
});
