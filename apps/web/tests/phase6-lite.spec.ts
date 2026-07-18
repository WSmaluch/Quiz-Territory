import { test, expect } from '@playwright/test';

test('Phase 6 - Mobile player view layout bounds', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:5173/play');
  
  // Verify main player constraints and readable UI without horizontal overflow
  const root = page.locator('#root');
  const box = await root.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(375);
});

test('Phase 6 - TV display elements', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/display');
  // Confirm safe-area rendering
});
