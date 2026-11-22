import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAllowedApiOrigin,
  normalizeApiOrigin,
  TerminalConfigError,
} from '../src/config.js';

test('normalizeApiOrigin strips trailing slash', () => {
  assert.equal(
    normalizeApiOrigin('https://play.example.com/'),
    'https://play.example.com',
  );
});

test('assertAllowedApiOrigin rejects non-HTTPS remote origins', () => {
  assert.throws(
    () => assertAllowedApiOrigin('http://play.example.com'),
    (error: unknown) => {
      assert.ok(error instanceof TerminalConfigError);
      return true;
    },
  );
});

test('assertAllowedApiOrigin allows loopback HTTP', () => {
  const url = assertAllowedApiOrigin('http://127.0.0.1:3000');
  assert.equal(url.hostname, '127.0.0.1');
});
