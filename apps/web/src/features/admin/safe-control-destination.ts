/**
 * Allowlisted Admin return paths after sign-in / enter.
 * Separate from player safe-entry-destination — never merge those lists.
 */

export const DEFAULT_SAFE_CONTROL_ENTRY = '/control/enter';

const ALLOWED = [
  /^\/control$/,
  /^\/control\/enter$/,
  /^\/control\/players$/,
] as const;

const MAX_RAW_LENGTH = 200;
const REF_ID = /^[A-Za-z0-9_-]{1,128}$/;

function decodeOnce(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/** Normalize and accept only allowlisted /control paths. */
export function resolveSafeControlDestination(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_SAFE_CONTROL_ENTRY;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_RAW_LENGTH) {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  const decoded = decodeOnce(trimmed);
  if (decoded === null || decoded.length > MAX_RAW_LENGTH) {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded) ||
    decoded.includes('://')
  ) {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  let url: URL;
  try {
    url = new URL(decoded, 'http://offscreen.invalid');
  } catch {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  if (url.username || url.password || url.host !== 'offscreen.invalid') {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  let pathname = url.pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  if (!ALLOWED.some((pattern) => pattern.test(pathname))) {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  if (pathname === '/control/players') {
    const ref = url.searchParams.get('ref');
    const keys = [...url.searchParams.keys()];
    if (keys.length === 0) return '/control/players';
    if (
      ref &&
      REF_ID.test(ref) &&
      keys.every((key) => key === 'ref')
    ) {
      return `/control/players?ref=${encodeURIComponent(ref)}`;
    }
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  if ([...url.searchParams.keys()].length > 0) {
    return DEFAULT_SAFE_CONTROL_ENTRY;
  }

  return pathname;
}

export function signInHrefForControl(requestedPath: unknown): string {
  const next = resolveSafeControlDestination(requestedPath);
  return `/sign-in?next=${encodeURIComponent(next)}`;
}
