/** Trusted Nest origin for Next SSR reads. Never expose via NEXT_PUBLIC_*. */
export function apiInternalOrigin(): string {
  return process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:3001';
}

/**
 * Nest origin for Next's same-origin `/api` rewrite (Node process only).
 * Independently configurable from SSR so local vs container network paths can differ.
 */
export function apiProxyOrigin(): string {
  return process.env.API_PROXY_ORIGIN ?? 'http://127.0.0.1:3001';
}
