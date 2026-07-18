import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateUUID } from '../src/utils/uuid';

describe('UUID Generator', () => {
  let originalCrypto: any;

  beforeEach(() => {
    originalCrypto = globalThis.crypto;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, writable: true, configurable: true });
    vi.restoreAllMocks();
  });

  it('uses native randomUUID if available', () => {
    const mockRandomUUID = vi.fn().mockReturnValue('native-uuid');
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: mockRandomUUID },
      writable: true, configurable: true
    });

    const result = generateUUID();
    expect(result).toBe('native-uuid');
    expect(mockRandomUUID).toHaveBeenCalled();
  });

  it('falls back to getRandomValues if randomUUID is undefined (e.g. LAN HTTP)', () => {
    const mockGetRandomValues = vi.fn().mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    });

    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: undefined, getRandomValues: mockGetRandomValues },
      writable: true, configurable: true
    });

    const result = generateUUID();
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(mockGetRandomValues).toHaveBeenCalled();
  });

  it('throws an error if no secure random generator is available', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      writable: true, configurable: true
    });

    expect(() => generateUUID()).toThrow('No secure random number generator available to generate UUID');
  });
});
