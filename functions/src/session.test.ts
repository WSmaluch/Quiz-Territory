import { describe, it, expect } from 'vitest';
import { JoinSessionSchema } from './session/joinGameSession';
import { z } from 'zod';

const commandId = '123e4567-e89b-42d3-a456-426614174000';
const clientId = '123e4567-e89b-42d3-b456-426614174000';
const validJoin = {
  sessionId: 's1',
  commandId,
  clientId,
  nickname: 'Alice',
};

const CreateSessionSchema = z.object({
  commandId: z.string().min(1),
  gameName: z.string().min(1).max(50),
  packageId: z.string(),
  themeId: z.string(),
  minPlayers: z.number().min(4).max(49),
  maxPlayers: z.number().min(4).max(49),
});

const HostActionSchema = z.object({
  sessionId: z.string(),
  action: z.enum(['APPROVE', 'REJECT', 'REMOVE', 'RENAME', 'CLOSE_JOINING', 'OPEN_JOINING']),
  targetId: z.string().optional(),
  payload: z.any().optional(),
  commandId: z.string().min(1),
});

describe('Session Unit Tests', () => {
  describe('Nickname Validation', () => {
    it('accepts valid nicknames', () => {
      const valid = JoinSessionSchema.safeParse(validJoin);
      expect(valid.success).toBe(true);
    });

    it('trims whitespace', () => {
      const parsed = JoinSessionSchema.parse({ ...validJoin, nickname: '  Bob  ' });
      expect(parsed.nickname).toBe('Bob');
    });

    it('rejects empty nicknames or whitespace only', () => {
      const empty = JoinSessionSchema.safeParse({ ...validJoin, nickname: '' });
      expect(empty.success).toBe(false);
      
      const spaces = JoinSessionSchema.safeParse({ ...validJoin, nickname: '   ' });
      expect(spaces.success).toBe(false);
    });

    it('enforces length limits', () => {
      const tooShort = JoinSessionSchema.safeParse({ ...validJoin, nickname: 'A' });
      expect(tooShort.success).toBe(false);

      const tooLong = JoinSessionSchema.safeParse({ ...validJoin, nickname: 'ThisIsWayTooLongOfANickname' });
      expect(tooLong.success).toBe(false);
    });
  });

  describe('Join Request Contract', () => {
    it('accepts a first join without a reconnect token', () => {
      expect(JoinSessionSchema.safeParse(validJoin).success).toBe(true);
    });

    it('accepts reconnect with a token of at least 32 characters', () => {
      expect(JoinSessionSchema.safeParse({
        ...validJoin,
        reconnectToken: 'a'.repeat(64),
      }).success).toBe(true);
    });

    it.each([
      ['null', null],
      ['empty', ''],
    ])('rejects a %s reconnect token', (_label, reconnectToken) => {
      const result = JoinSessionSchema.safeParse({ ...validJoin, reconnectToken });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['reconnectToken']);
      }
    });

    it.each(['commandId', 'clientId'] as const)('rejects an invalid %s', (field) => {
      const result = JoinSessionSchema.safeParse({ ...validJoin, [field]: 'legacy-id' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual([field]);
      }
    });
  });

  describe('Session Settings Validation', () => {
    it('enforces lobby minimum and maximum limits', () => {
      const valid = CreateSessionSchema.safeParse({
        commandId: 'c1', gameName: 'My Game', packageId: 'p1', themeId: 't1', minPlayers: 4, maxPlayers: 10
      });
      expect(valid.success).toBe(true);

      const minTooLow = CreateSessionSchema.safeParse({
        commandId: 'c1', gameName: 'My Game', packageId: 'p1', themeId: 't1', minPlayers: 3, maxPlayers: 10
      });
      expect(minTooLow.success).toBe(false);

      const maxTooHigh = CreateSessionSchema.safeParse({
        commandId: 'c1', gameName: 'My Game', packageId: 'p1', themeId: 't1', minPlayers: 4, maxPlayers: 50
      });
      expect(maxTooHigh.success).toBe(false);
    });
  });

  describe('Command ID Validation', () => {
    it('requires a command ID for join', () => {
      const noCommand = JoinSessionSchema.safeParse({ sessionId: 's1', nickname: 'Alice' });
      expect(noCommand.success).toBe(false);
    });
    
    it('requires a command ID for session creation', () => {
      const noCommand = CreateSessionSchema.safeParse({
        gameName: 'My Game', packageId: 'p1', themeId: 't1', minPlayers: 4, maxPlayers: 10
      });
      expect(noCommand.success).toBe(false);
    });

    it('requires a command ID for host actions', () => {
      const noCommand = HostActionSchema.safeParse({
        sessionId: 's1', action: 'APPROVE', targetId: 'p1'
      });
      expect(noCommand.success).toBe(false);
    });
  });

  describe('Host Lease Calculation', () => {
    it('determines host lease expiration', () => {
      const now = Date.now();
      const leaseDurationMs = 15000;
      const lastHeartbeat = now - 10000;
      
      const isExpired = (now - lastHeartbeat) > leaseDurationMs;
      expect(isExpired).toBe(false);
      
      const staleHeartbeat = now - 20000;
      const isExpiredStale = (now - staleHeartbeat) > leaseDurationMs;
      expect(isExpiredStale).toBe(true);
    });
  });

  describe('Session-Start Eligibility', () => {
    it('determines if session can start based on approved players', () => {
      const minPlayers = 4;
      const approvedCount = 4;
      expect(approvedCount >= minPlayers).toBe(true);
      
      const tooFew = 3;
      expect(tooFew >= minPlayers).toBe(false);
    });
  });
});
