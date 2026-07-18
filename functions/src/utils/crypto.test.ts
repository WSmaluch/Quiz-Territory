import { describe, it, expect } from 'vitest';
import { generateRoomCode, generateTakeoverPIN, hashPIN, generateSalt, generateToken } from './crypto';

describe('Crypto Utils', () => {
  describe('roomCode generation and validation', () => {
    it('generates a 4-character string', () => {
      const code = generateRoomCode();
      expect(code).toHaveLength(4);
    });

    it('contains only characters from the unambiguous alphabet', () => {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 100; i++) {
        const code = generateRoomCode();
        for (const char of code) {
          expect(alphabet.includes(char)).toBe(true);
        }
      }
    });

    it('can normalize lowercase room codes', () => {
      const input = 'a3f9';
      const normalized = input.toUpperCase().replace(/[^A-Z2-9]/g, '');
      expect(normalized).toBe('A3F9');
    });

    it('can remove whitespace during normalization', () => {
      const input = ' A 3 F 9 ';
      const normalized = input.toUpperCase().replace(/[^A-Z2-9]/g, '');
      expect(normalized).toBe('A3F9');
    });
    
    it('can reject invalid characters in the regex check', () => {
      const regex = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
      expect(regex.test('A3F9')).toBe(true);
      expect(regex.test('O01I')).toBe(false); // Ambiguous characters not in alphabet
      expect(regex.test('AB-C')).toBe(false); // Hyphens rejected
    });
  });

  describe('PIN and Token Hashing', () => {
    it('generates a 6-digit takeover PIN', () => {
      const pin = generateTakeoverPIN();
      expect(pin).toHaveLength(6);
      expect(/^\d{6}$/.test(pin)).toBe(true);
    });

    it('generates a 32-character random salt', () => {
      const salt = generateSalt();
      expect(salt).toHaveLength(32);
    });

    it('hashes the PIN deterministically', () => {
      const pin = '123456';
      const salt = 'testsalt';
      const hash1 = hashPIN(pin, salt);
      const hash2 = hashPIN(pin, salt);
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different salts', () => {
      const pin = '123456';
      const hash1 = hashPIN(pin, 'salt1');
      const hash2 = hashPIN(pin, 'salt2');
      expect(hash1).not.toBe(hash2);
    });
    
    it('hashes display tokens deterministically', () => {
      const token = '1234abcd';
      const hash1 = hashPIN(token, 'display');
      const hash2 = hashPIN(token, 'display');
      expect(hash1).toBe(hash2);
    });

    it('generates different tokens', () => {
      const t1 = generateToken();
      const t2 = generateToken();
      expect(t1).not.toEqual(t2);
      expect(t1).toHaveLength(64); // 32 bytes hex
    });
  });
});
