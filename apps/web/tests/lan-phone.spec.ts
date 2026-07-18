import { test, expect } from '@playwright/test';

test.describe('LAN Phone Fallback (no crypto.randomUUID)', () => {
  test('Phone player joins smoothly without randomUUID crash', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const phoneContext = await browser.newContext();

    // Crucial: Simulate HTTP LAN where randomUUID is undefined but getRandomValues exists
    await phoneContext.addInitScript(() => {
      Object.defineProperty(window.crypto, 'randomUUID', {
        get: () => undefined
      });
    });

    const hostPage = await hostContext.newPage();
    await hostPage.goto('/demo');
    await expect(hostPage).toHaveURL(/\/host\/.+/, { timeout: 15_000 });

    const roomCodeElement = hostPage.locator('.text-5xl.font-mono');
    await expect(roomCodeElement).toBeVisible({ timeout: 15000 });
    const roomCode = (await roomCodeElement.innerText()).trim();
    expect(roomCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);

    const playerPage = await phoneContext.newPage();
    await playerPage.goto(`/join?code=${roomCode}`);
    await playerPage.getByPlaceholder('np. MistrzQuizu').fill('PhonePlayer');
    await playerPage.getByRole('button', { name: 'Dołącz do gry' }).click();
    await expect(playerPage.getByText('Oczekiwanie na prowadzącego')).toBeVisible({ timeout: 10_000 });

    const playerRow = hostPage.locator('li', { hasText: 'PhonePlayer' });
    await expect(playerRow).toBeVisible();
    await playerRow.getByRole('button', { name: 'Zatwierdź' }).click();
    await expect(playerPage.getByText('Jesteś w grze!')).toBeVisible({ timeout: 10_000 });

    await hostContext.close();
    await phoneContext.close();
  });
});
