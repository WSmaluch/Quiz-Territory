import { expect, test } from '@playwright/test';

test('base /display route shows connection instructions', async ({ page }) => {
  await page.goto('/display');
  await expect(page.getByRole('heading', { name: 'Ekran TV nie jest jeszcze połączony' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Połącz ekran' })).toBeVisible();
});

test('invalid display token produces an explicit error', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto('/demo');
  await expect(hostPage).toHaveURL(/\/host\/.+/);
  const sessionId = new URL(hostPage.url()).pathname.split('/').pop()!;

  const displayContext = await browser.newContext();
  const displayPage = await displayContext.newPage();
  await displayPage.goto(`/display/${sessionId}?token=invalid-token`);
  await expect(displayPage.getByText(/nieprawidłowy lub wygasł/i)).toBeVisible();
  await hostContext.close();
  await displayContext.close();
});

test('valid host link authorizes and survives display refresh', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto('/demo');
  await expect(hostPage).toHaveURL(/\/host\/.+/);
  const sessionId = new URL(hostPage.url()).pathname.split('/').pop()!;
  await hostPage.waitForFunction(
    (id) => Boolean(window.sessionStorage.getItem(`quiz_display_token_${id}`)),
    sessionId,
  );
  const token = await hostPage.evaluate(
    (id) => window.sessionStorage.getItem(`quiz_display_token_${id}`),
    sessionId,
  );
  expect(token).toBeTruthy();

  const displayContext = await browser.newContext();
  const displayPage = await displayContext.newPage();
  await displayPage.goto(`/display/${sessionId}?token=${encodeURIComponent(token!)}`);
  await expect(displayPage.getByText(/Gracze \(0\//)).toBeVisible();
  await expect(displayPage).not.toHaveURL(/token=/);
  await displayPage.reload();
  await expect(displayPage.getByText(/Gracze \(0\//)).toBeVisible();
  await hostContext.close();
  await displayContext.close();
});
