import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adminAuditEvent,
  adminStaffPrincipal,
  adminStaffSession,
} from '@offscreen/db/admin-schema';
import {
  ADMIN_DEV_COOKIE,
  ADMIN_HOST_COOKIE,
  ADMIN_LOGIN_FRESHNESS_MS,
  AdminSessionError,
  clearAdminCookie,
  createAdminSessions,
  digestAdminToken,
  mintAdminToken,
  readAdminTokenFromCookieHeader,
  selectAdminCookieMode,
  serializeAdminCookie,
} from '../dist/index.js';

/** Recording Database stub: tracks audit denial vs staff lookup vs session insert. */
function createRecordingDatabase() {
  const state = {
    auditDenials: [],
    staffSelectCalls: 0,
    sessionInsertCalls: 0,
  };

  const db = {
    insert(table) {
      return {
        values(values) {
          if (table === adminAuditEvent) {
            return (async () => {
              if (values.kind === 'admin.session.enter_denied') {
                state.auditDenials.push(values);
              }
            })();
          }
          if (table === adminStaffSession) {
            return {
              returning: async () => {
                state.sessionInsertCalls += 1;
                return [{ id: 'stub-session-id' }];
              },
            };
          }
          throw new Error(`unexpected insert table: ${String(table)}`);
        },
      };
    },
    select() {
      return {
        from(table) {
          if (table !== adminStaffPrincipal) {
            throw new Error(`unexpected select table: ${String(table)}`);
          }
          return {
            where() {
              return {
                limit: async () => {
                  state.staffSelectCalls += 1;
                  return [];
                },
              };
            },
          };
        },
      };
    },
  };

  return { database: { db }, state };
}

async function enterFreshnessDenied({ createdAt, now }) {
  const { database, state } = createRecordingDatabase();
  const sessions = createAdminSessions(database);
  await assert.rejects(
    () =>
      sessions.enter({
        authUserId: 'auth-user-stub',
        authSessionId: 'auth-session-stub',
        authSessionCreatedAt: createdAt,
        now,
      }),
    (err) => {
      assert.ok(err instanceof AdminSessionError);
      assert.equal(err.code, 'step_up_required');
      return true;
    },
  );
  assert.equal(state.auditDenials.length, 1);
  assert.equal(state.auditDenials[0].kind, 'admin.session.enter_denied');
  assert.deepEqual(state.auditDenials[0].payload, { reason: 'stale_login' });
  assert.equal(state.staffSelectCalls, 0);
  assert.equal(state.sessionInsertCalls, 0);
}

async function enterFreshnessAccepted({ createdAt, now }) {
  const { database, state } = createRecordingDatabase();
  const sessions = createAdminSessions(database);
  try {
    await sessions.enter({
      authUserId: 'auth-user-stub',
      authSessionId: 'auth-session-stub',
      authSessionCreatedAt: createdAt,
      now,
    });
  } catch (err) {
    assert.notEqual(
      err instanceof AdminSessionError ? err.code : err,
      'step_up_required',
    );
  }
  assert.equal(state.staffSelectCalls, 1);
  assert.equal(state.sessionInsertCalls, 0);
}

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

test('enter freshness: session created 60s ago is not stale_login', async () => {
  const now = new Date('2026-01-15T12:00:00.000Z');
  const createdAt = new Date(now.getTime() - 60_000);
  await enterFreshnessAccepted({ createdAt, now });
});

test('enter freshness: exactly fifteen minutes old is accepted', async () => {
  const now = new Date('2026-01-15T12:00:00.000Z');
  const createdAt = new Date(now.getTime() - ADMIN_LOGIN_FRESHNESS_MS);
  await enterFreshnessAccepted({ createdAt, now });
});

test('enter freshness: fifteen minutes plus one ms is denied before staff lookup', async () => {
  const now = new Date('2026-01-15T12:00:00.000Z');
  const createdAt = new Date(now.getTime() - ADMIN_LOGIN_FRESHNESS_MS - 1);
  await enterFreshnessDenied({ createdAt, now });
});

test('enter freshness: non-finite authSessionCreatedAt is denied', async () => {
  const now = new Date('2026-01-15T12:00:00.000Z');
  await enterFreshnessDenied({ createdAt: new Date(Number.NaN), now });
});

test('enter freshness: future authSessionCreatedAt is denied', async () => {
  const now = new Date('2026-01-15T12:00:00.000Z');
  const createdAt = new Date(now.getTime() + 1_000);
  await enterFreshnessDenied({ createdAt, now });
});

test('enter freshness: non-finite now is denied', async () => {
  const createdAt = new Date('2026-01-15T11:00:00.000Z');
  await enterFreshnessDenied({ createdAt, now: new Date(Number.NaN) });
});
