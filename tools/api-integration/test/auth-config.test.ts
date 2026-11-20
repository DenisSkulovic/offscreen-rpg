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

test('POC_OPEN_ACCESS is honored only on loopback HTTP origins', () => {
  const loopback = { ...valid, POC_OPEN_ACCESS: '1' };
  assert.equal(readAuthConfig(loopback).pocOpenAccess, true);
  assert.throws(
    () =>
      readAuthConfig({
        ...valid,
        APP_ORIGIN: 'https://example.com',
        POC_OPEN_ACCESS: '1',
      }),
  );
});

test('non-demo auth config requires GitHub credentials', () => {
  assert.throws(
    () =>
      readAuthConfig({
        APP_ORIGIN: 'http://localhost:3000',
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
        APP_ORIGIN: 'http://localhost:3000',
        BETTER_AUTH_SECRET: 'a'.repeat(32),
        GITHUB_CLIENT_ID: 'test',
      }),
    { message: 'Invalid authentication configuration: GITHUB_CLIENT_SECRET' },
  );
  assert.equal(readAuthConfig(valid).localDemoAuth, false);
});

test('LOCAL_DEMO_AUTH on loopback accepts missing GitHub credentials', () => {
  const demo = readAuthConfig({
    APP_ORIGIN: 'http://127.0.0.1:3000',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    LOCAL_DEMO_AUTH: '1',
  });
  assert.equal(demo.localDemoAuth, true);
  assert.equal(demo.githubClientId, '');
  assert.equal(demo.githubClientSecret, '');
});

test('LOCAL_DEMO_AUTH rejects unsafe origins and production', () => {
  for (const env of [
    {
      ...valid,
      APP_ORIGIN: 'https://example.com',
      LOCAL_DEMO_AUTH: '1',
    },
    {
      APP_ORIGIN: 'http://localhost:3000',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      LOCAL_DEMO_AUTH: '1',
      NODE_ENV: 'production',
    },
    {
      APP_ORIGIN: 'http://0.0.0.0:3000',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      LOCAL_DEMO_AUTH: '1',
    },
  ]) {
    assert.throws(() => readAuthConfig(env), {
      message: 'Invalid authentication configuration: LOCAL_DEMO_AUTH',
    });
  }
});