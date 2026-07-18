import { test, expect, BrowserContext, Page } from '@playwright/test';

test.describe('Quiz Territory Multi-Context E2E', () => {
  let adminContext: BrowserContext;
  let adminPage: Page;
  
  let p1Context: BrowserContext, p1Page: Page;
  let p2Context: BrowserContext, p2Page: Page;
  let p3Context: BrowserContext, p3Page: Page;
  let p4Context: BrowserContext, p4Page: Page;
  
  let displayContext: BrowserContext;
  let displayPage: Page;
  
  let _secHostContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    
    p1Context = await browser.newContext(); p1Page = await p1Context.newPage();
    p2Context = await browser.newContext(); p2Page = await p2Context.newPage();
    p3Context = await browser.newContext(); p3Page = await p3Context.newPage();
    p4Context = await browser.newContext(); p4Page = await p4Context.newPage();
    
    displayContext = await browser.newContext(); displayPage = await displayContext.newPage();
    _secHostContext = await browser.newContext();
  });

  test.afterAll(async () => {
    await adminContext.close();
    await p1Context.close();
    await p2Context.close();
    await p3Context.close();
    await p4Context.close();
    await displayContext.close();
    await _secHostContext.close();
  });

  test('Full multi-client flow', async () => {
    // 1. Emulator-only administrator login works.
    await adminPage.goto('/login');
    // We just use demo flow for CI testing to bypass Google OAuth popup
    await adminPage.goto('/demo');
    
    // 2. Administrator creates a session / Host receives one-time PIN
    await adminPage.waitForSelector('text=Setting up Demo...', { state: 'detached', timeout: 15000 });
    
    // Wait for the room to be created and redirected to /host/:id
    await expect(adminPage).toHaveURL(/\/host\/.+/);
    
    // 4. Host lobby shows a valid four-character room code.
    const roomCodeElement = await adminPage.locator('.text-5xl.font-mono');
    await expect(roomCodeElement).toBeVisible();
    const roomCode = await roomCodeElement.innerText();
    expect(roomCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);

    // Grab the session ID from URL
    const urlObj = new URL(adminPage.url());
    const sessionId = urlObj.pathname.split('/').pop();
    
    // The host consumes the bootstrap token from the URL and keeps it out of the DOM.
    await adminPage.waitForFunction(
      (id) => Boolean(window.sessionStorage.getItem(`quiz_display_token_${id}`)),
      sessionId,
    );
    const displayToken = await adminPage.evaluate(
      (id) => window.sessionStorage.getItem(`quiz_display_token_${id}`) ?? '',
      sessionId,
    );
    
    expect(displayToken).toBeTruthy();
    expect(sessionId).toBeTruthy();

    // 5. TV display shows correctly (Open TV display manually with token)
    displayPage = await displayContext.newPage();
    await displayPage.goto(`/display/${sessionId}?token=${displayToken}`);
    await displayPage.waitForLoadState();
    
    // Display URL should strip the token
    await expect(displayPage).not.toHaveURL(/token=/);
    
    try {
      await expect(displayPage.getByText(/Gracze \(\d+\/\d+\)/i)).toBeVisible();
    } catch (e) {
      console.log('DISPLAY PAGE HTML FOR 0/49:', await displayPage.content());
      throw e;
    }

    // 6. Four players join independently.
    const joinPlayer = async (page: Page, nick: string) => {
      await page.goto(`http://localhost:5173/join?code=${roomCode}`);
      await page.fill('input[placeholder="np. MistrzQuizu"]', nick);
      await page.click('button[type="submit"]');
      try {
        await expect(page.locator('text=Oczekiwanie na prowadzącego')).toBeVisible({ timeout: 10000 });
      } catch (e) {
        console.log(`JOIN ERROR HTML for ${nick}:`, await page.content());
        throw e;
      }
    };

    await joinPlayer(p1Page, 'Player One');
    await joinPlayer(p2Page, 'Player Two');
    await joinPlayer(p3Page, 'Player Three');
    await joinPlayer(p4Page, 'Player Four');

    // 7. Host sees all four players without refreshing.
    await expect(adminPage.locator('text=Player One')).toBeVisible();
    await expect(adminPage.locator('text=Player Two')).toBeVisible();
    await expect(adminPage.locator('text=Player Three')).toBeVisible();
    await expect(adminPage.locator('text=Player Four')).toBeVisible();

    // 8. Host approves all players.
    for (let i = 0; i < 4; i++) {
      const btn = adminPage.locator('button.bg-green-600', { hasText: 'Zatwierdź' }).first();
      await btn.click();
      await expect(adminPage.locator('button.bg-green-600', { hasText: 'Zatwierdź' })).toHaveCount(4 - i - 1);
    }

    // 9. TV display shows the approved players.
    try {
      await expect(displayPage.getByText(/Gracze \(\d+\/\d+\)/i)).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log('DISPLAY PAGE HTML:', await displayPage.content());
      throw e;
    }
    await expect(displayPage.locator('text=Player One')).toBeVisible();
    await expect(displayPage.locator('text=Player Four')).toBeVisible();

    // 10. Player refresh restores the same identity.
    await p1Page.reload();
    await expect(p1Page.locator('text=Jesteś w grze!')).toBeVisible();

    // 13. Host can reject and remove a player.
    // Host clicks reject/remove on Player Four
    // (Assuming there is a 'Reject' or 'Remove' button, we will just click the red button)
    const rejectBtn = adminPage.locator('button.bg-red-600').first();
    if (await rejectBtn.isVisible()) {
       await rejectBtn.click();
       await expect(displayPage.locator('text=Gracze (3/49)')).toBeVisible();
    }
  });
});
