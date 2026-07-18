import { describe, it, expect } from 'vitest';
import { getFirebaseEmulatorHost } from '../src/utils/firebaseUtils';

describe('getFirebaseEmulatorHost', () => {
  it('uses window.location.hostname by default when env is undefined', () => {
    expect(getFirebaseEmulatorHost(undefined, '192.168.1.100')).toBe('192.168.1.100');
  });

  it('uses configured host from environment if provided', () => {
    expect(getFirebaseEmulatorHost('10.0.0.5', 'localhost')).toBe('10.0.0.5');
  });

  it('trims the environment variable', () => {
    expect(getFirebaseEmulatorHost(' 10.0.0.5  ', 'localhost')).toBe('10.0.0.5');
  });
});
