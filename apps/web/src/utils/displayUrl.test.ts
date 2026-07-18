import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildDisplayUrl,
  getHostDisplayToken,
  getPublicAppOrigin,
  isDisplayAuthorizationRestored,
  markDisplayAuthorized,
  storeHostDisplayToken,
} from './displayUrl';

describe('display URL helpers', () => {
  beforeEach(() => sessionStorage.clear());

  it('uses the configured LAN address instead of localhost', () => {
    const location = new URL('http://localhost:5173/host');
    expect(getPublicAppOrigin('192.168.1.50', location as any)).toBe('http://192.168.1.50:5173');
  });

  it('builds the canonical route with an encoded session and token', () => {
    const url = new URL(buildDisplayUrl('session/id', 'secret token', 'http://192.168.1.50:5173'));
    expect(url.pathname).toBe('/display/session%2Fid');
    expect(url.searchParams.get('token')).toBe('secret token');
  });

  it('stores host tokens and restored display identity per session', () => {
    storeHostDisplayToken('s1', 'token-1');
    markDisplayAuthorized('s1', 'display-uid');
    expect(getHostDisplayToken('s1')).toBe('token-1');
    expect(isDisplayAuthorizationRestored('s1', 'display-uid')).toBe(true);
    expect(isDisplayAuthorizationRestored('s2', 'display-uid')).toBe(false);
  });
});
