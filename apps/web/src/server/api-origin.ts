const LOOPBACK_ORIGIN_PATTERN = /127\.0\.0\.1|localhost/i;

/** Trusted Nest origin for Next SSR reads. Never expose via NEXT_PUBLIC_*. */
export function apiInternalOrigin(): string {
  return process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
}

/**
 * Release Pod SSR guard: local dev/start (HOSTNAME ≠ 0.0.0.0) allows any configured origin;
 * in-cluster runners require a non-loopback origin matching API_PROXY_ORIGIN.
 */
export function releasePodAllowsSsr(origin: string): boolean {
  if (process.env.HOSTNAME !== '0.0.0.0') {
    return true;
  }
  if (!origin) {
    return false;
  }
  const proxyOrigin = process.env.API_PROXY_ORIGIN;
  if (!proxyOrigin || origin !== proxyOrigin) {
    return false;
  }
  if (LOOPBACK_ORIGIN_PATTERN.test(origin)) {
    return false;
  }
  return true;
}

/**
 * Nest origin for Next's same-origin `/api` rewrite (Node process only).
 * Independently configurable from SSR so local vs container network paths can differ.
 */
export function apiProxyOrigin(): string {
  return process.env.API_PROXY_ORIGIN ?? 'http://127.0.0.1:3001';
}
