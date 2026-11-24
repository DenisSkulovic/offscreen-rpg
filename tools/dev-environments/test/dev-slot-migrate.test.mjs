import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import {
  connectPgWithFreshAttempts,
  migrateOwnedDevSlot,
  pgPortForwardArgs,
  redactMigrationFailure,
  validateDevMigrationSecret,
  waitForPortForwardReady,
} from '../src/adapters/dev-slot-migrate.mjs';
import { deriveDevSqlTenant } from '../src/rendering/dev-sql-tenant-contract.mjs';

test('pg port-forward args name the Kind context without shadowing spawn', () => {
  assert.deepEqual(pgPortForwardArgs(13136), [
    '--context',
    'kind-offscreen-dev',
    '-n',
    'offscreen-dev-postgres',
    'port-forward',
    '--address',
    '127.0.0.1',
    'service/dev-pg-rw',
    '13136:5432',
  ]);
});

const OWNER = {
  slotId: 'dev-1',
  ports: { game: 13108, control: 13109, tilt: 13110, spare: 13111 },
};

function secretBody(names, { username = names.migrationRole } = {}) {
  return {
    metadata: {
      name: names.migrationSecret,
      namespace: names.namespace,
      labels: {
        'offscreen.dev/owner': 'offscreen-dev',
        'offscreen.dev/slot': names.slotId,
      },
    },
    data: {
      username: Buffer.from(username).toString('base64'),
      password: Buffer.from('local-only').toString('base64'),
    },
  };
}

function fakeForward() {
  let closed = false;
  return {
    ok: true,
    async close() {
      closed = true;
    },
    wasClosed: () => closed,
  };
}

function fakeModules({
  expected = 26,
  ledgerRows,
  assertThrows = false,
} = {}) {
  const entries = Array.from({ length: expected }, (_, idx) => ({
    folderMillis: 1_000 + idx,
    hash: `${'a'.repeat(63)}${idx % 10}`,
    sql: ['SELECT 1'],
    bps: false,
  }));
  return {
    migrationsFolder: '/tmp/migrations',
    validateMigrationJournal: () => entries,
    assertAppliedPrefix: () => {
      if (assertThrows) {
        throw new Error('Applied migration prefix invalid at index 0: hash');
      }
    },
    applyMigrations: async () => {},
    entries,
    ledgerRows:
      ledgerRows ??
      entries.map((entry, idx) => ({
        id: idx + 1,
        hash: entry.hash,
        created_at: entry.folderMillis,
      })),
  };
}

function mockClientFactory(rows) {
  return class MockClient {
    async connect() {}
    async query(sql) {
      if (sql.includes('current_user AS writer')) {
        return {
          rows: [{ writer: 'dev_1_mig', runtime_insert: false, runtime_select: true }],
        };
      }
      if (sql.includes('current_user')) {
        return { rows: [{ role: 'dev_1_mig', current_database: 'dev_1' }] };
      }
      if (sql.includes('__drizzle_migrations')) {
        return { rows };
      }
      if (sql.includes('runtime_create')) {
        return { rows: [{ runtime_create: false, account: true }] };
      }
      return { rows: [] };
    }
    async end() {}
  };
}

test('redactMigrationFailure strips credentials from errors', () => {
  const redacted = redactMigrationFailure(
    'connect postgresql://dev_1_mig:sekret@127.0.0.1:13111/dev_1 password=sekret',
  );
  assert.match(redacted, /\[redacted-url\]/);
  assert.equal(redacted.includes('sekret'), false);
});

test('validateDevMigrationSecret rejects malformed migration secrets', () => {
  const names = deriveDevSqlTenant('dev-1');
  assert.equal(
    validateDevMigrationSecret(
      { metadata: { name: 'wrong', namespace: names.namespace, labels: {} }, data: {} },
      names,
    ).refusals[0].id,
    'migration-secret',
  );
  const badUsername = secretBody(names, { username: 'dev_1_run' });
  assert.equal(validateDevMigrationSecret(badUsername, names).refusals[0].detail, 'username');
});

test('waitForPortForwardReady matches the owned spare port', async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  const ready = waitForPortForwardReady(child, 13111, 500);
  child.stdout.emit('data', Buffer.from('Forwarding from 127.0.0.1:13111 -> 5432\n'));
  const result = await ready;
  assert.equal(result.ok, true);
});

test('malformed migration secret refuses before connecting', async () => {
  const names = deriveDevSqlTenant('dev-1');
  const body = secretBody(names);
  delete body.metadata.labels['offscreen.dev/slot'];
  const result = await migrateOwnedDevSlot(OWNER, '/tmp/worktree', {
    buildPackage: () => ({ ok: true, built: '/tmp/migrate.js' }),
    loadModules: async () => fakeModules(),
    probeSparePortFree: () => true,
    startPortForward: async () => fakeForward(),
    getMigrationSecret: () => ({ ok: true, body }),
  });
  assert.equal(result.refusals[0].id, 'migration-secret');
  assert.equal(result.refusals[0].detail, 'slot-label');
});

test('foreign spare port refuses before starting a port-forward', async () => {
  const started = [];
  const result = await migrateOwnedDevSlot(OWNER, '/tmp/worktree', {
    buildPackage: () => ({ ok: true, built: '/tmp/migrate.js' }),
    loadModules: async () => fakeModules(),
    probeSparePortFree: () => false,
    startPortForward: async () => {
      started.push('forward');
      return fakeForward();
    },
  });
  assert.equal(result.refusals[0].id, 'foreign-port');
  assert.equal(started.length, 0);
});

test('port-forward child exit and cleanup are bounded', async () => {
  const closed = [];
  const result = await migrateOwnedDevSlot(OWNER, '/tmp/worktree', {
    buildPackage: () => ({ ok: true, built: '/tmp/migrate.js' }),
    loadModules: async () => fakeModules(),
    probeSparePortFree: () => true,
    startPortForward: async () => ({
      ok: false,
      refusal: { id: 'port-forward-exited', detail: 'port-forward exited (1)' },
    }),
    getMigrationSecret: () => ({ ok: true, body: secretBody(deriveDevSqlTenant('dev-1')) }),
    createPgClient: () => mockClientFactory([]),
    connectPg: async () => ({ query: async () => ({ rows: [] }), end: async () => {} }),
  });
  assert.equal(result.refusals[0].id, 'port-forward-exited');

  const forward = fakeForward();
  const modules = fakeModules({ expected: 26 });
  const ok = await migrateOwnedDevSlot(OWNER, '/tmp/worktree', {
    buildPackage: () => ({ ok: true, built: '/tmp/migrate.js' }),
    loadModules: async () => modules,
    probeSparePortFree: () => true,
    startPortForward: async () => {
      forward.close = async () => {
        closed.push('forward');
      };
      return forward;
    },
    getMigrationSecret: () => ({ ok: true, body: secretBody(deriveDevSqlTenant('dev-1')) }),
    createPgClient: () => mockClientFactory(modules.ledgerRows),
    connectPg: async (Client, uri) => new Client({ connectionString: uri }),
    skipRuntimeGateVerify: true,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.expectedMigrations, 26);
  assert.equal(ok.appliedMigrations, 26);
  assert.equal(closed.length, 1);
});

test('journal length and mismatched hash verification', async () => {
  const modules = fakeModules({ expected: 26, assertThrows: true });
  const mismatch = await migrateOwnedDevSlot(OWNER, '/tmp/worktree', {
    buildPackage: () => ({ ok: true, built: '/tmp/migrate.js' }),
    loadModules: async () => modules,
    probeSparePortFree: () => true,
    startPortForward: async () => fakeForward(),
    getMigrationSecret: () => ({ ok: true, body: secretBody(deriveDevSqlTenant('dev-1')) }),
    createPgClient: () => mockClientFactory(modules.ledgerRows),
    connectPg: async (Client) => new Client({}),
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.refusals[0].id, 'schema-not-verified');

  const shortLedger = fakeModules({ expected: 26, ledgerRows: [{ id: 1, hash: 'x', created_at: 1 }] });
  const incomplete = await migrateOwnedDevSlot(OWNER, '/tmp/worktree', {
    buildPackage: () => ({ ok: true, built: '/tmp/migrate.js' }),
    loadModules: async () => shortLedger,
    probeSparePortFree: () => true,
    startPortForward: async () => fakeForward(),
    getMigrationSecret: () => ({ ok: true, body: secretBody(deriveDevSqlTenant('dev-1')) }),
    createPgClient: () => mockClientFactory(shortLedger.ledgerRows),
    connectPg: async (Client) => new Client({}),
  });
  assert.equal(incomplete.ok, false);
  assert.equal(incomplete.refusals[0].id, 'schema-not-verified');
});

test('connectPgWithFreshAttempts uses a fresh client per attempt', async () => {
  let attempts = 0;
  class FlakyClient {
    constructor() {
      this.id = attempts += 1;
    }
    async connect() {
      if (this.id < 3) throw new Error('not ready');
    }
    async end() {}
  }
  const client = await connectPgWithFreshAttempts(FlakyClient, 'postgresql://example', {
    attempts: 4,
    intervalMs: 0,
    sleep: async () => {},
  });
  assert.equal(attempts, 3);
  assert.ok(client);
});