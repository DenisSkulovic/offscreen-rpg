import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TargetParseError,
  TargetSessionError,
  createOpsClient,
  parseTarget,
  recordedClientFailure,
  targetLabel,
  toTargetDisplay,
  verifySession,
} from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';

function validEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/${DATABASE}`,
    ...overrides,
  };
}

function assertNoSecrets(error: unknown, secret = SECRET): void {
  assert.ok(error instanceof Error);
  assert.ok(!error.message.includes(secret));
  assert.ok(!error.message.includes('postgresql://'));
  assert.ok(!error.message.includes('postgres://'));
}

test('parseTarget accepts literal loopback IPv4 and exposes display label', () => {
  const target = parseTarget(validEnv());
  assert.equal(target.host, '127.0.0.1');
  assert.equal(target.port, 5433);
  assert.equal(target.database, DATABASE);
  assert.equal(target.role, ROLE);
  assert.equal(target.localEndpointOnly, true);

  const display = toTargetDisplay(target);
  assert.equal(targetLabel(display), `127.0.0.1:5433/${DATABASE}@${ROLE}`);
});

test('parseTarget accepts literal loopback IPv6 with bracketed label', () => {
  const target = parseTarget(
    validEnv({
      DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@[::1]:5433/${DATABASE}`,
    }),
  );
  assert.equal(target.host, '::1');
  assert.equal(
    targetLabel(toTargetDisplay(target)),
    `[::1]:5433/${DATABASE}@${ROLE}`,
  );
});

test('parseTarget rejects malformed URL without leaking credentials', () => {
  assert.throws(
    () => parseTarget(validEnv({ DB_OPS_URL: 'not-a-url' })),
    (error: unknown) => {
      assert.ok(error instanceof TargetParseError);
      assertNoSecrets(error);
      return true;
    },
  );
});

test('parseTarget rejects remote and DNS localhost hosts', () => {
  for (const url of [
    `postgresql://${ROLE}:${SECRET}@example.com:5433/${DATABASE}`,
    `postgresql://${ROLE}:${SECRET}@localhost:5433/${DATABASE}`,
  ]) {
    assert.throws(
      () => parseTarget(validEnv({ DB_OPS_URL: url })),
      (error: unknown) => {
        assert.ok(error instanceof TargetParseError);
        assertNoSecrets(error);
        return true;
      },
    );
  }
});

test('parseTarget rejects ambient PostgreSQL environment overrides', () => {
  assert.throws(
    () => parseTarget(validEnv({ PGSSLMODE: 'require' })),
    (error: unknown) => {
      assert.ok(error instanceof TargetParseError);
      assert.match((error as Error).message, /PGSSLMODE/);
      assertNoSecrets(error);
      return true;
    },
  );
});

test('parseTarget rejects missing explicit password component', () => {
  assert.throws(
    () =>
      parseTarget(
        validEnv({
          DB_OPS_URL: `postgresql://${ROLE}@127.0.0.1:5433/${DATABASE}`,
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof TargetParseError);
      assertNoSecrets(error);
      return true;
    },
  );
});

test('parseTarget rejects reserved and implicit databases', () => {
  assert.throws(() =>
    parseTarget(
      validEnv({
        DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/postgres`,
      }),
    ),
  );
  assert.throws(() => parseTarget(validEnv({ DB_OPS_URL: undefined })));
  assert.throws(() =>
    parseTarget(
      validEnv({
        DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/`,
      }),
    ),
  );
});

test('verifySession rejects wrong role', async () => {
  const queryable = {
    query: async () => ({
      rows: [{ database: DATABASE, role: 'other_role', recovery: false }],
    }),
  };

  await assert.rejects(
    () => verifySession(queryable, { database: DATABASE, role: ROLE }),
    (error: unknown) => {
      assert.ok(error instanceof TargetSessionError);
      assert.equal(
        (error as Error).message,
        'connected role does not match DB_OPS_URL target',
      );
      return true;
    },
  );
});

test('verifySession requires exact database and role match', async () => {
  const queryable = {
    query: async () => ({
      rows: [
        {
          database: 'other_db',
          role: ROLE,
          recovery: false,
        },
      ],
    }),
  };

  await assert.rejects(
    () => verifySession(queryable, { database: DATABASE, role: ROLE }),
    (error: unknown) => {
      assert.ok(error instanceof TargetSessionError);
      assert.equal(
        (error as Error).message,
        'connected database does not match DB_OPS_URL target',
      );
      return true;
    },
  );
});

test('verifySession rejects standby for write readiness', async () => {
  const queryable = {
    query: async () => ({
      rows: [{ database: DATABASE, role: ROLE, recovery: true }],
    }),
  };

  await assert.rejects(
    () => verifySession(queryable, { database: DATABASE, role: ROLE }),
    (error: unknown) => {
      assert.ok(error instanceof TargetSessionError);
      assert.match((error as Error).message, /recovery/);
      return true;
    },
  );
});

test('verifySession accepts matching primary session', async () => {
  const queryable = {
    query: async (sql: string) => {
      assert.match(sql, /current_database\(\)/);
      return {
        rows: [{ database: DATABASE, role: ROLE, recovery: false }],
      };
    },
  };

  const identity = await verifySession(queryable, {
    database: DATABASE,
    role: ROLE,
  });
  assert.deepEqual(identity, {
    database: DATABASE,
    role: ROLE,
    recovery: false,
  });
});

test('createOpsClient configures explicit fields without connectionString', () => {
  const target = parseTarget(validEnv());
  const client = createOpsClient(target);

  const params = client as unknown as {
    connectionParameters: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      ssl: false;
      connect_timeout: number;
      statement_timeout: number;
      idle_in_transaction_session_timeout: number;
      application_name: string;
    };
    _connectionTimeoutMillis: number;
  };

  assert.equal(params.connectionParameters.host, '127.0.0.1');
  assert.equal(params.connectionParameters.port, 5433);
  assert.equal(params.connectionParameters.database, DATABASE);
  assert.equal(params.connectionParameters.user, ROLE);
  assert.equal(params.connectionParameters.password, SECRET);
  assert.equal(params.connectionParameters.ssl, false);
  assert.equal(params._connectionTimeoutMillis, 5000);
  assert.equal(params.connectionParameters.connect_timeout, 5);
  assert.equal(params.connectionParameters.statement_timeout, 10000);
  assert.equal(
    params.connectionParameters.idle_in_transaction_session_timeout,
    15000,
  );
  assert.equal(
    params.connectionParameters.application_name,
    'offscreen-db-ops',
  );

  client.end().catch(() => undefined);
});

test('createOpsClient records connection errors without surfacing secrets', () => {
  const target = parseTarget(validEnv());
  const client = createOpsClient(target);
  const failure = new Error('connection refused');
  client.emit('error', failure);
  assert.equal(recordedClientFailure(client), failure);
  assertNoSecrets(failure);
  client.end().catch(() => undefined);
});
