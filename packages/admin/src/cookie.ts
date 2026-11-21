/** Admin-purpose cookie naming and serialization (AD01). */

export const ADMIN_HOST_COOKIE = '__Host-offscreen-admin';
export const ADMIN_DEV_COOKIE = 'offscreen-admin';

export type AdminCookieMode = 'host' | 'dev';

export function selectAdminCookieMode(origin: string): AdminCookieMode {
  const url = new URL(origin);
  if (url.protocol === 'https:') return 'host';
  const host = url.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return 'dev';
  }
  throw new Error('Admin cookie requires HTTPS or loopback origin');
}

export function adminCookieName(mode: AdminCookieMode): string {
  return mode === 'host' ? ADMIN_HOST_COOKIE : ADMIN_DEV_COOKIE;
}

export function serializeAdminCookie(
  token: string,
  mode: AdminCookieMode,
  expiresAt: Date,
): string {
  const name = adminCookieName(mode);
  const parts = [
    `${name}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (mode === 'host') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function clearAdminCookie(mode: AdminCookieMode): string {
  const name = adminCookieName(mode);
  const parts = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (mode === 'host') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function readAdminTokenFromCookieHeader(
  cookieHeader: string | undefined,
  mode: AdminCookieMode,
): string | null {
  if (!cookieHeader) return null;
  const name = adminCookieName(mode);
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    if (key !== name) continue;
    const value = trimmed.slice(eq + 1);
    return value.length > 0 ? value : null;
  }
  return null;
}
