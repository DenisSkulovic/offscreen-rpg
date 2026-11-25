import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { MigrationMeta } from 'drizzle-orm/migrator';
import {
  assertAppliedPrefix,
  AppliedMigrationPrefixError,
  type AppliedMigrationLedgerRow,
} from '../src/migrations/journal';
import {
  runMigrationWithOps,
  type MigrationRunnerOps,
} from '../src/migrations/runner';

const verifiedEntries: MigrationMeta[] = [
  {
    sql: ['CREATE TABLE t();'],
    folderMillis: 1,
    hash: 'a'.repeat(64),
    bps: true,
  },
];

function completeLedgerRows(
  entries: MigrationMeta[],
): AppliedMigrationLedgerRow[] {
  return entries.map((entry, index) => ({
    id: index + 1,
    hash: entry.hash,
    created_at: entry.folderMillis,
  }));
}

type RecordedOp =
  | 'connect'
  | 'tryLock'
  | 'setLockTimeout'
  | 'readLedger'
  | 'migrateVerified'
  | 'close';

function createFakeOps(
  configure?: (base: {
    calls: RecordedOp[];
    closeCount: { value: number };
    connectionError: { value: Error | undefined };
  }) => Partial<MigrationRunnerOps>,
): {
  ops: MigrationRunnerOps;
  calls: RecordedOp[];
  closeCount: () => number;
} {
  const calls: RecordedOp[] = [];
  const closeCount = { value: 0 };
  const connectionError = { value: undefined as Error | undefined };

  const baseOps: MigrationRunnerOps = {
    async connect() {
      calls.push('connect');
    },
    async tryLock() {
      calls.push('tryLock');
      return true;
    },
    async setLockTimeout() {
      calls.push('setLockTimeout');
    },
    async readLedger() {
      calls.push('readLedger');
      const readIndex = calls.filter((op) => op === 'readLedger').length;
      if (readIndex === 1) {
        return [];
      }
      return completeLedgerRows(verifiedEntries);
    },
    async migrateVerified() {
      calls.push('migrateVerified');
    },
    async close() {
      calls.push('close');
      closeCount.value += 1;
    },
    get connectionError() {
      return connectionError.value;
    },
  };

  const overrides = configure?.({ calls, closeCount, connectionError }) ?? {};
  const ops: MigrationRunnerOps = { ...baseOps, ...overrides };

  if (overrides.connectionError === undefined) {
    Object.defineProperty(ops, 'connectionError', {
      get() {
        return connectionError.value;
      },
      enumerable: true,
      configurable: true,
    });
  }

  return { ops, calls, closeCount: () => closeCount.value };
}

test('happy path runs connect through close in order', async () => {
  const { ops, calls, closeCount } = createFakeOps();
  await runMigrationWithOps(ops, verifiedEntries, () => {});
  assert.deepEqual(calls, [
    'connect',
    'tryLock',
    'setLockTimeout',
    'readLedger',
    'migrateVerified',
    'readLedger',
    'close',
  ]);
  assert.equal(closeCount(), 1);
});

test('competing runner does not read ledger or run DDL', async () => {
  const { ops, calls, closeCount } = createFakeOps(({ calls: _c }) => ({
    async tryLock() {
      _c.push('tryLock');
      return false;
    },
  }));
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    /Another database migration is running/,
  );
  assert.deepEqual(calls, ['connect', 'tryLock', 'close']);
  assert.equal(closeCount(), 1);
});

test('corrupt applied prefix does not run DDL', async () => {
  const { ops, calls, closeCount } = createFakeOps();
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {
      throw new AppliedMigrationPrefixError('hash', 0);
    }),
    AppliedMigrationPrefixError,
  );
  assert.deepEqual(calls, [
    'connect',
    'tryLock',
    'setLockTimeout',
    'readLedger',
    'close',
  ]);
  assert.equal(closeCount(), 1);
  assert.ok(!calls.includes('migrateVerified'));
});

test('failed migration closes exactly once', async () => {
  const { ops, calls, closeCount } = createFakeOps(({ calls: _c }) => ({
    async migrateVerified() {
      _c.push('migrateVerified');
      throw new Error('migration failed');
    },
  }));
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    /migration failed/,
  );
  assert.equal(closeCount(), 1);
  assert.ok(calls.includes('migrateVerified'));
});

test('connection error after migration closes once', async () => {
  const { ops, calls, closeCount } = createFakeOps(
    ({ connectionError, calls: _c }) => ({
      async migrateVerified() {
        _c.push('migrateVerified');
        connectionError.value = new Error('idle disconnect');
      },
    }),
  );
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    /idle disconnect/,
  );
  assert.equal(closeCount(), 1);
  assert.ok(calls.includes('migrateVerified'));
});

test('close failure refuses success when migration succeeded', async () => {
  const { ops, closeCount } = createFakeOps(
    ({ calls: _c, closeCount: cc }) => ({
      async close() {
        _c.push('close');
        cc.value += 1;
        throw new Error('close failed');
      },
    }),
  );
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    /close failed/,
  );
  assert.equal(closeCount(), 1);
});

test('short post-migration ledger rejects without second success path', async () => {
  const { ops, calls, closeCount } = createFakeOps(({ calls: _c }) => ({
    async readLedger() {
      _c.push('readLedger');
      const readIndex = _c.filter((op) => op === 'readLedger').length;
      if (readIndex === 1) {
        return [];
      }
      return [];
    },
  }));
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    (error: unknown) =>
      error instanceof AppliedMigrationPrefixError &&
      error.category === 'length' &&
      error.index === 0,
  );
  assert.deepEqual(calls, [
    'connect',
    'tryLock',
    'setLockTimeout',
    'readLedger',
    'migrateVerified',
    'readLedger',
    'close',
  ]);
  assert.equal(closeCount(), 1);
});

test('invalid post-migration ledger does not complete successfully', async () => {
  const { ops, closeCount } = createFakeOps(({ calls: _c }) => ({
    async readLedger() {
      _c.push('readLedger');
      const readIndex = _c.filter((op) => op === 'readLedger').length;
      if (readIndex === 1) {
        return [];
      }
      return [{ id: 1, hash: 'b'.repeat(64), created_at: 1 }];
    },
  }));
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, (rows) => {
      assertAppliedPrefix(verifiedEntries, rows);
    }),
    AppliedMigrationPrefixError,
  );
  assert.equal(closeCount(), 1);
});

test('post-read ledger error closes exactly once', async () => {
  const { ops, calls, closeCount } = createFakeOps(({ calls: _c }) => ({
    async readLedger() {
      _c.push('readLedger');
      const readIndex = _c.filter((op) => op === 'readLedger').length;
      if (readIndex === 1) {
        return [];
      }
      throw new Error('post-read failed');
    },
  }));
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    /post-read failed/,
  );
  assert.deepEqual(calls, [
    'connect',
    'tryLock',
    'setLockTimeout',
    'readLedger',
    'migrateVerified',
    'readLedger',
    'close',
  ]);
  assert.equal(closeCount(), 1);
});

test('primary throw undefined with close failure surfaces undefined', async () => {
  const { ops, closeCount } = createFakeOps(
    ({ calls: _c, closeCount: cc }) => ({
      async migrateVerified() {
        _c.push('migrateVerified');
        throw undefined;
      },
      async close() {
        _c.push('close');
        cc.value += 1;
        throw new Error('close failed');
      },
    }),
  );
  await assert.rejects(runMigrationWithOps(ops, verifiedEntries, () => {}));
  assert.equal(closeCount(), 1);
});

test('close throw undefined after success surfaces undefined', async () => {
  const { ops, closeCount } = createFakeOps(
    ({ calls: _c, closeCount: cc }) => ({
      async close() {
        _c.push('close');
        cc.value += 1;
        throw undefined;
      },
    }),
  );
  await assert.rejects(runMigrationWithOps(ops, verifiedEntries, () => {}));
  assert.equal(closeCount(), 1);
});

test('close failure after migration failure surfaces migration error', async () => {
  const { ops, closeCount } = createFakeOps(
    ({ calls: _c, closeCount: cc }) => ({
      async migrateVerified() {
        _c.push('migrateVerified');
        throw new Error('migration failed');
      },
      async close() {
        _c.push('close');
        cc.value += 1;
        throw new Error('close failed');
      },
    }),
  );
  await assert.rejects(
    runMigrationWithOps(ops, verifiedEntries, () => {}),
    /migration failed/,
  );
  assert.equal(closeCount(), 1);
});
