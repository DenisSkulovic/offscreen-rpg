import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTerminalHttpClient,
  TerminalHttpError,
  TerminalRedirectError,
} from '../src/http.js';
import { assertAllowedApiOrigin } from '../src/config.js';

test('createTerminalHttpClient rejects remote HTTP at construction', () => {
  assert.throws(() => createTerminalHttpClient('http://evil.example'));
});

test('HTTP client refuses redirects', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(null, {
      status: 302,
      headers: { location: 'https://evil.example/steal' },
    });
  const client = createTerminalHttpClient('http://127.0.0.1:3000', {
    fetchImpl,
  });
  await assert.rejects(
    () => client.listStories('bearer-test'),
    (error: unknown) => error instanceof TerminalRedirectError,
  );
});

test('error responses never echo raw bearer token', async () => {
  const secret = 'super-secret-bearer-value-0123456789abcdef';
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ token: secret, code: 'denied' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  const client = createTerminalHttpClient('http://127.0.0.1:3000', {
    fetchImpl,
  });
  try {
    await client.readCurrentToken(secret);
    assert.fail('expected failure');
  } catch (error) {
    assert.ok(error instanceof TerminalHttpError);
    const serialized = String(error);
    assert.doesNotMatch(serialized, /super-secret-bearer/);
  }
});

test('create client accepts HTTPS origins', () => {
  assertAllowedApiOrigin('https://play.example.com');
  createTerminalHttpClient('https://play.example.com');
});
