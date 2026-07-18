const DISPLAY_TOKEN_STORAGE_PREFIX = 'quiz_display_token_';
const DISPLAY_AUTH_STORAGE_PREFIX = 'quiz_display_authorized_uid_';

export function getPublicAppOrigin(
  configuredHost = import.meta.env.VITE_LOCAL_PARTY_HOST,
  currentLocation = window.location,
): string {
  const value = configuredHost?.trim();
  if (!value) return currentLocation.origin;

  if (/^https?:\/\//i.test(value)) {
    return new URL(value).origin;
  }

  const hostHasPort = value.includes(':');
  const port = hostHasPort ? '' : currentLocation.port;
  return `${currentLocation.protocol}//${value}${port ? `:${port}` : ''}`;
}

export function buildDisplayUrl(
  sessionId: string,
  displayToken: string,
  origin = getPublicAppOrigin(),
): string {
  const url = new URL(`/display/${encodeURIComponent(sessionId)}`, origin);
  url.searchParams.set('token', displayToken);
  return url.toString();
}

export function storeHostDisplayToken(sessionId: string, token: string): void {
  sessionStorage.setItem(`${DISPLAY_TOKEN_STORAGE_PREFIX}${sessionId}`, token);
}

export function getHostDisplayToken(sessionId: string): string | null {
  return sessionStorage.getItem(`${DISPLAY_TOKEN_STORAGE_PREFIX}${sessionId}`);
}

export function markDisplayAuthorized(sessionId: string, uid: string): void {
  sessionStorage.setItem(`${DISPLAY_AUTH_STORAGE_PREFIX}${sessionId}`, uid);
}

export function isDisplayAuthorizationRestored(sessionId: string, uid: string): boolean {
  return sessionStorage.getItem(`${DISPLAY_AUTH_STORAGE_PREFIX}${sessionId}`) === uid;
}
