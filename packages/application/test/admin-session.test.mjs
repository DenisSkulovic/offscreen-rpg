import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ADMIN_DEV_COOKIE,
  ADMIN_HOST_COOKIE,
  ADMIN_LOGIN_FRESHNESS_MS,
  clearAdminCookie,
  digestAdminToken,
  mintAdminToken,
  readAdminTokenFromCookieHeader,
  selectAdminCookieMode,
  serializeAdminCookie,
} from '../dist/admin/index.js';

test('admin cookie mode: host for https, dev for loopback', () => {
  assert.equal(selectAdminCookieMode('https://control.example'), 'host');
  assert.equal(selectAdminCookieMode('http://127.0.0.1:3000'), 'dev');
  assert.equal(selectAdminCookieMode('http://localhost:3100'), 'dev');
  assert.throws(() => selectAdminCookieMode('http://example.com'), /HTTPS/);
});

test('admin cookie serialize/parse/clear never puts Domain or plaintext in DB helpers', () => {
  const { token, digest } = mintAdminToken();
  assert.equal(digest.length, 64);
  assert.equal(digestAdminToken(token), digest);
  assert.notEqual(token, digest);

  const host = serializeAdminCookie(
    token,
    'host',
    new Date('2030-01-01T00:00:00.000Z'),
  );
  assert.ok(host.startsWith(`${ADMIN_HOST_COOKIE}=`));
  assert.ok(host.includes('Secure'));
  assert.ok(host.includes('HttpOnly'));
  assert.ok(host.includes('SameSite=Strict'));
  assert.ok(!host.toLowerCase().includes('domain='));

  const header = `${ADMIN_DEV_COOKIE}=${token}; other=1`;
  assert.equal(readAdminTokenFromCookieHeader(header, 'dev'), token);
  assert.equal(readAdminTokenFromCookieHeader(header, 'host'), null);

  const cleared = clearAdminCookie('dev');
  assert.ok(cleared.includes(`${ADMIN_DEV_COOKIE}=`));
  assert.ok(cleared.includes('1970'));
});

test('login freshness window is fifteen minutes', () => {
  assert.equal(ADMIN_LOGIN_FRESHNESS_MS, 15 * 60 * 1000);
});
