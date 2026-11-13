/**
 * Bounded post-sign-in destinations for PF03.
 * Validates local path families only — never open redirects or command replay.
 */

export const DEFAULT_SAFE_ENTRY = '/stories';

const UUID =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';

const ALLOWED = [
  /^\/stories$/,
  /^\/stories\/new$/,
  new RegExp(`^/stories/${UUID}$`),
  new RegExp(`^/stories/${UUID}/preview$`),
  new RegExp(`^/play/${UUID}$`),
] as const;

const MAX_RAW_LENGTH = 200;

function decodeOnce(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function pathnameAllowed(pathname: string): boolean {
  return ALLOWED.some((pattern) => pattern.test(pathname));
}

/** Normalize and accept only allowlisted same-origin app paths. */
export function resolveSafeEntryDestination(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_SAFE_ENTRY;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_RAW_LENGTH) return DEFAULT_SAFE_ENTRY;

  const decoded = decodeOnce(trimmed);
  if (decoded === null || decoded.length > MAX_RAW_LENGTH) {
    return DEFAULT_SAFE_ENTRY;
  }

  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded) ||
    decoded.includes('://')
  ) {
    return DEFAULT_SAFE_ENTRY;
  }

  let url: URL;
  try {
    url = new URL(decoded, 'http://offscreen.invalid');
  } catch {
    return DEFAULT_SAFE_ENTRY;
  }

  if (url.username || url.password || url.host !== 'offscreen.invalid') {
    return DEFAULT_SAFE_ENTRY;
  }

  let pathname = url.pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  if (!pathnameAllowed(pathname)) return DEFAULT_SAFE_ENTRY;

  if (pathname === '/stories/new') {
    const id = url.searchParams.get('id');
    if (id === null && [...url.searchParams.keys()].length === 0) {
      return '/stories/new';
    }
    if (
      id &&
      new RegExp(`^${UUID}$`).test(id) &&
      [...url.searchParams.keys()].every((key) => key === 'id')
    ) {
      return `/stories/new?id=${id}`;
    }
    return DEFAULT_SAFE_ENTRY;
  }

  if ([...url.searchParams.keys()].length > 0) {
    return DEFAULT_SAFE_ENTRY;
  }

  return pathname;
}

/** Build /sign-in with optional safe next; omits next when default. */
export function signInHrefFor(requestedPath: unknown): string {
  const next = resolveSafeEntryDestination(requestedPath);
  if (next === DEFAULT_SAFE_ENTRY) return '/sign-in';
  return `/sign-in?next=${encodeURIComponent(next)}`;
}

/** Header set by middleware for private-route redirects. */
export const PATHNAME_HEADER = 'x-offscreen-pathname';
