import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAuthConfig } from '@offscreen/api/auth-config';

const valid = {
  APP_ORIGIN: 'http://127.0.0.1:3000',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  GITHUB_CLIENT_ID: 'test',
  GITHUB_CLIENT_SECRET: 'secret',
};

test('auth config accepts the local loopback GitHub origin', () => {
  const config = readAuthConfig(valid);
  assert.equal(config.origin, 'http://127.0.0.1:3000');
  assert.equal(config.githubClientId, 'test');
  assert.equal(config.githubClientSecret, 'secret');
  assert.equal('cookiePrefix' in config, false);
  assert.equal(
    readAuthConfig({ ...valid, APP_ORIGIN: 'https://example.com' }).origin,
    'https://example.com',
  );
});

test('auth config rejects unsafe origins and a short secret without exposing values', () => {
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
});

test('missing GitHub client credentials fail clearly', () => {
  assert.throws(
    () =>
      readAuthConfig({
        APP_ORIGIN: 'http://127.0.0.1:3000',
        BETTER_AUTH_SECRET: 'a'.repeat(32),
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(
        error.message,
        /^Invalid authentication configuration: GITHUB_CLIENT_ID/,
      );
      return true;
    },
  );
  assert.throws(
    () =>
      readAuthConfig({
        APP_ORIGIN: 'http://127.0.0.1:3000',
        BETTER_AUTH_SECRET: 'a'.repeat(32),
        GITHUB_CLIENT_ID: 'test',
      }),
    { message: 'Invalid authentication configuration: GITHUB_CLIENT_SECRET' },
  );
});

test('auth config accepts distinct cookie prefixes and rejects invalid ones', () => {
  const first = readAuthConfig({
    ...valid,
    BETTER_AUTH_COOKIE_PREFIX: 'offscreen-dev-1',
  });
  const second = readAuthConfig({
    ...valid,
    BETTER_AUTH_COOKIE_PREFIX: 'offscreen-dev-10',
  });
  assert.equal(first.cookiePrefix, 'offscreen-dev-1');
  assert.equal(second.cookiePrefix, 'offscreen-dev-10');
  assert.notEqual(first.cookiePrefix, second.cookiePrefix);
  assert.equal(first.githubClientId, 'test');
  for (const prefix of ['', ' ', 'Offscreen', 'a.b', 'has space', 'a'.repeat(64), '-slot']) {
    assert.throws(
      () => readAuthConfig({ ...valid, BETTER_AUTH_COOKIE_PREFIX: prefix }),
      { message: 'Invalid authentication configuration: BETTER_AUTH_COOKIE_PREFIX' },
    );
  }
});

test('removed local bypass flags do not authenticate or relax GitHub requirements', () => {
  assert.throws(
    () =>
      readAuthConfig({
        APP_ORIGIN: 'http://127.0.0.1:3000',
        BETTER_AUTH_SECRET: 'a'.repeat(32),
        POC_OPEN_ACCESS: '1',
        LOCAL_DEMO_AUTH: '1',
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /GITHUB_CLIENT_ID/);
      assert.equal(error.message.includes('poc-local-player'), false);
      return true;
    },
  );
});
