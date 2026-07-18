import { test, expect } from '@playwright/test';

test.skip('Phase 4 Lite - Suspend, Resume, Rematch (stale UI scenario; covered by callable integration)', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();

  // 1. Create a game via the UI
  await hostPage.goto('http://localhost:5173/admin/sessions/new');
  // Need to log in if not already
  if (await hostPage.locator('text=Logowanie prowadzącego').isVisible()) {
    await hostPage.locator('text=Logowanie prowadzącego').click();
  }
  // Assume demo login sets us up correctly
  await hostPage.goto('http://localhost:5173/admin/sessions/new');
  
  // Try using the actual UI to start the game
  await expect(hostPage.locator('text=Wybierz kategorie')).toBeVisible();
  
  // We can select categories (click 3 categories)
  const categoryCards = hostPage.locator('.bg-slate-800.cursor-pointer');
  await categoryCards.nth(0).click();
  await categoryCards.nth(1).click();
  await categoryCards.nth(2).click();

  // Create game
  await hostPage.locator('button:has-text("Utwórz sesję")').click();
  
  // Wait for lobby to open and get the session ID
  await expect(hostPage.locator('text=LOBBY')).toBeVisible();
  // Start players (4 players)
  const players = [];
  for(let i=0; i<4; i++) {
    const pContext = await browser.newContext();
    const pPage = await pContext.newPage();
    await pPage.goto(`http://localhost:5173/join`);
    
    // We need the room code from the host page
    const roomCodeText = await hostPage.locator('.text-6xl.font-mono').innerText();
    
    await pPage.fill('input[placeholder="Kod pokoju"]', roomCodeText);
    await pPage.fill('input[placeholder="Twój Nick"]', `Player${i+1}`);
    await pPage.click('button:has-text("Dołącz do gry")');
    players.push({ context: pContext, page: pPage });
  }

  // Host approves them
  const approveButtons = hostPage.locator('button:has-text("Zatwierdź")');
  for (let i=0; i<4; i++) {
    await approveButtons.nth(0).click();
  }

  // Start Category Selection
  await hostPage.locator('button:has-text("Rozpocznij Wybór Kategorii")').click();
  await expect(hostPage.locator('text=CATEGORY_SELECTION')).toBeVisible();

  // Wait for board reveal
  // The system auto-assigns after some time if players don't pick, 
  // or host can click "Przydziel automatycznie i przejdź dalej"
  await hostPage.locator('button:has-text("Przydziel automatycznie")').click();
  await expect(hostPage.locator('text=Zakończ przegląd planszy')).toBeVisible();

  // Board reveal complete
  await hostPage.locator('button:has-text("Zakończ przegląd planszy")').click();
  
  // Wait for DRAW phase or something
  // Since we don't have full test IDs, we use text locators.
  
  // Suspend game
  await hostPage.locator('button:has-text("Zapisz i zakończ na teraz")').click();
  
  // Handle confirm dialog
  hostPage.on('dialog', dialog => dialog.accept());

  // Wait for Admin Dashboard
  await expect(hostPage.locator('text=Admin Dashboard')).toBeVisible();
  
  // Verify it's in the suspended games
  await expect(hostPage.locator('text=Zawieszone gry')).toBeVisible();
  
  // Resume game
  await hostPage.locator('button:has-text("Wznów")').first().click();
  
  // Verify Host panel loads
  await expect(hostPage.locator('text=Quiz Territory Host')).toBeVisible();

  // Simulate complete via helper or finish it
  // Since completing 4 player game takes 30 mins manually, we check history directly or rely on the state 
  await hostPage.goto(`http://localhost:5173/admin/history`);
  await expect(hostPage.locator('text=Historia Gier')).toBeVisible();

  // Rematch
  // (We could do this from results if we had a completed game)
});
