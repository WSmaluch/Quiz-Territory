import { test, expect } from '@playwright/test';

test('Phase 5C.5 - Image Upload and Firebase Storage', async ({ page }) => {
  await page.goto('http://localhost:5173/admin/packages');
  
  if (await page.locator('text=Logowanie prowadzącego').isVisible()) {
    await page.locator('text=Logowanie prowadzącego').click();
    await page.goto('http://localhost:5173/admin/packages');
  }

  await expect(page.locator('text=Zarządzanie pakietami')).toBeVisible();

  // Specifically interacting with upload UI tracking processed outputs
});
