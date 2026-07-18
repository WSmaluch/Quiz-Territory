import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateUUID, UUID_V4_PATTERN } from './uuid';

describe('generateUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates a valid UUID v4', () => {
    expect(generateUUID()).toMatch(UUID_V4_PATTERN);
  });

  it('uses secure getRandomValues when randomUUID is unavailable', () => {
    let nextByte = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_value, index) => {
          bytes[index] = nextByte++;
        });
        return bytes;
      },
    });

    expect(generateUUID()).toMatch(UUID_V4_PATTERN);
  });

  it('fails instead of using an insecure random source', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => generateUUID()).toThrow('No secure random number generator');
  });
});
