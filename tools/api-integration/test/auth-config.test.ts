import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAuthConfig } from '@offscreen/api/auth-config';

const valid = {
  APP_ORIGIN: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  GITHUB_CLIENT_ID: 'test',
  GITHUB_CLIENT_SECRET: 'secret',
};
test('auth config rejects unsafe origins and missing secrets without exposing values', () => {
  for (const origin of [
    'http://example.com',
    'https://user:password@example.com',
    'https://example.com/path',
    'https://example.com?key=secret',
    '//example.com',
  ]) {
    assert.throws(() => readAuthConfig({ ...valid, APP_ORIGIN: origin }), {
      message: 'Invalid authentication configuration: APP_ORIGIN',
    });
  }
  assert.throws(
    () => readAuthConfig({ ...valid, BETTER_AUTH_SECRET: 'secret' }),
    { message: 'Invalid authentication configuration: BETTER_AUTH_SECRET' },
  );
  assert.equal(readAuthConfig(valid).origin, valid.APP_ORIGIN);
  assert.equal(
    readAuthConfig({ ...valid, APP_ORIGIN: 'https://example.com' }).origin,
    'https://example.com',
  );
});
