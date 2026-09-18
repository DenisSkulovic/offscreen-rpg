import assert from 'node:assert/strict';

export function requireDefined<T>(
  value: T | null | undefined,
  message: string,
): T {
  assert.ok(value != null, message);
  return value;
}

export function requireCookie(headers: Headers) {
  return requireDefined(headers.get('cookie'), 'Expected a session cookie');
}
