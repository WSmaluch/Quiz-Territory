import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

let testEnv: any;

describe('Realtime Database Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'quiz-territory-local',
      database: {
        host: '127.0.0.1',
        port: 9000,
        rules: fs.readFileSync(path.resolve(__dirname, '../database.rules.json'), 'utf8'),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearDatabase();
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      await context.database().ref('liveSessions/testSession').update({
        'hostLease/hostId': 'host1',
        'public/state': 'LOBBY',
        'publicPlayers/player1': { nickname: 'Player One', status: 'APPROVED' },
        'publicPlayers/player2': { nickname: 'Player Two', status: 'APPROVED' },
        'playerPrivate/player1/categoryOffers': [],
        'displays/display1': true,
      });
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('unauthenticated users cannot read a session', async () => {
    const unauthDb = testEnv.unauthenticatedContext().database();
    await assertFails(unauthDb.ref('liveSessions/testSession').get());
  });

  it('unauthenticated users cannot read public state, players, presence, or host lease', async () => {
    const unauthDb = testEnv.unauthenticatedContext().database();
    await assertFails(unauthDb.ref('liveSessions/testSession/public').get());
    await assertFails(unauthDb.ref('liveSessions/testSession/publicPlayers').get());
    await assertFails(unauthDb.ref('liveSessions/testSession/presence').get());
    await assertFails(unauthDb.ref('liveSessions/testSession/hostLease').get());
  });

  it('a player cannot read the private session root', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertFails(playerDb.ref('liveSessions/testSession').get());
  });

  it('a player can read the public lobby list', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertSucceeds(playerDb.ref('liveSessions/testSession/publicPlayers').get());
  });

  it('an authenticated user from outside the session cannot read it', async () => {
    const outsiderDb = testEnv.authenticatedContext('outsider').database();
    await assertFails(outsiderDb.ref('liveSessions/testSession/public').get());
    await assertFails(outsiderDb.ref('liveSessions/testSession/publicPlayers').get());
    await assertFails(outsiderDb.ref('liveSessions/testSession/hostLease').get());
  });

  it('an authorized display reads only public state', async () => {
    const displayDb = testEnv.authenticatedContext('display1').database();
    await assertSucceeds(displayDb.ref('liveSessions/testSession/public').get());
    await assertSucceeds(displayDb.ref('liveSessions/testSession/publicPlayers').get());
    await assertFails(displayDb.ref('liveSessions/testSession').get());
    await assertFails(displayDb.ref('liveSessions/testSession/host').get());
    await assertFails(displayDb.ref('liveSessions/testSession/public/state').set('GAME_COMPLETE'));
  });

  it('a player can read their own private metadata', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertSucceeds(playerDb.ref('liveSessions/testSession/playerPrivate/player1').get());
  });

  it('a player cannot read another players private metadata', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertFails(playerDb.ref('liveSessions/testSession/playerPrivate/player2').get());
  });

  it('a player cannot read host data, command history, or private correct answers', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertFails(playerDb.ref('liveSessions/testSession/host').get());
    await assertFails(playerDb.ref('liveSessions/testSession/commandHistory').get());
    await assertFails(playerDb.ref('liveSessions/testSession/private/correctAnswers').get());
  });

  it('a player cannot perform direct administrative writes', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertFails(playerDb.ref('liveSessions/testSession/public/state').set('GAME_COMPLETE'));
    await assertFails(playerDb.ref('liveSessions/testSession/publicPlayers/player2/status').set('APPROVED'));
    await assertFails(playerDb.ref('liveSessions/testSession/host/duelPrivate').set({ answer: 'secret' }));
  });

  it('a player can read the intended public game state', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertSucceeds(playerDb.ref('liveSessions/testSession/public').get());
  });

  it('a player sees a public question prompt but not the host-only correct answer', async () => {
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      await context.database().ref('liveSessions/testSession').update({
        'public/duel/currentQuestion': { prompt: 'Public prompt', difficulty: 'EASY' },
        'host/duelPrivate/currentAnswer': 'Secret answer',
      });
    });
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertSucceeds(playerDb.ref('liveSessions/testSession/public/duel/currentQuestion').get());
    await assertFails(playerDb.ref('liveSessions/testSession/host/duelPrivate/currentAnswer').get());
  });

  it('the host can read required host state', async () => {
    await testEnv.withSecurityRulesDisabled(async (context: any) => {
      await context.database().ref('liveSessions/testSession/hostLease').set({ hostId: 'host1' });
    });

    const hostDb = testEnv.authenticatedContext('host1').database();
    await assertSucceeds(hostDb.ref('liveSessions/testSession').get());
    await assertSucceeds(hostDb.ref('liveSessions/testSession/host').get());
  });

  it('a forged clientId cannot migrate another player', async () => {
    const playerDb = testEnv.authenticatedContext('player1').database();
    await assertFails(playerDb.ref('liveSessions/testSession/playerPrivate/player2').set({
      clientId: 'my-forged-client-id'
    }));
  });
});
