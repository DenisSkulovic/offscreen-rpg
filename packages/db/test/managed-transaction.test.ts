import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PoolClient, QueryResult } from 'pg';
import { NodePgTransaction, NodePgSession } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import {
  type AdmissionClock,
  type ReleasableClient,
} from '../src/connection/admission';
import { createManagedClientRuntime } from '../src/connection/managed-client';
import {
  DatabaseTransactionError,
  type JitterFn,
  MAX_TRANSACTION_ATTEMPTS,
} from '../src/transaction/errors';
import {
  executeManagedTransaction,
  validateTransactionPolicy,
} from '../src/transaction/execute';
import type { TransactionPolicy } from '../src/transaction/policy';
import type { Transaction } from '../src/transaction/types';

type QueryCall = {
  text: string;
  values?: unknown[];
};

type FakeQueryClient = ReleasableClient & {
  queries: QueryCall[];
  releases: number;
  discardCalls: number;
  handlers: Array<
    (call: QueryCall, index: number) => Promise<QueryResult> | QueryResult
  >;
  release(err?: Error | boolean): void;
  query(text: string, values?: unknown[]): Promise<QueryResult>;
};

function okResult(command: string): QueryResult {
  return { command, rowCount: 0, rows: [], oid: 0, fields: [] };
}

function createFakeQueryClient(
  handlers: FakeQueryClient['handlers'] = [],
): FakeQueryClient {
  const client: FakeQueryClient = {
    queries: [],
    releases: 0,
    discardCalls: 0,
    handlers,
    release(err?: Error | boolean) {
      this.releases += 1;
      if (err === true) {
        this.discardCalls += 1;
      }
      if (err instanceof Error) {
        throw err;
      }
    },
    async query(text: string, values?: unknown[]): Promise<QueryResult> {
      const call: QueryCall =
        values === undefined ? { text } : { text, values };
      this.queries.push(call);
      const index = this.queries.length - 1;
      const handler = this.handlers[index];
      if (handler) {
        return await handler(call, index);
      }
      if (text === 'BEGIN ISOLATION LEVEL READ COMMITTED') {
        return okResult('BEGIN');
      }
      if (text.startsWith('SELECT set_config')) {
        return okResult('SELECT');
      }
      if (text === 'COMMIT') {
        return okResult('COMMIT');
      }
      if (text === 'ROLLBACK') {
        return okResult('ROLLBACK');
      }
      return okResult('SELECT');
    },
  };
  return client;
}

class FakeClock implements AdmissionClock {
  nowValue = 0;
  timers: Array<{ at: number; fn: () => void; handle: symbol }> = [];

  now = () => this.nowValue;

  setTimeout = (fn: () => void, delayMs: number) => {
    const handle = Symbol('timer');
    this.timers.push({ at: this.nowValue + delayMs, fn, handle });
    return handle;
  };

  clearTimeout = (handle: unknown) => {
    this.timers = this.timers.filter((timer) => timer.handle !== handle);
  };

  tick(ms: number) {
    this.nowValue += ms;
    const due = this.timers
      .filter((timer) => timer.at <= this.nowValue)
      .sort((a, b) => a.at - b.at);
    this.timers = this.timers.filter((timer) => timer.at > this.nowValue);
    for (const timer of due) {
      timer.fn();
    }
  }
}

function basePolicy(
  overrides: Partial<TransactionPolicy> = {},
): TransactionPolicy {
  return {
    name: 'worker.batch',
    workload: 'worker',
    isolation: 'read committed',
    readOnly: false,
    retry: 'none',
    timeoutMs: 5_000,
    statementTimeoutMs: 4_000,
    lockTimeoutMs: 1_000,
    ...overrides,
  };
}

function directRuntime(client: FakeQueryClient, clock = new FakeClock()) {
  return createManagedClientRuntime<FakeQueryClient & PoolClient>({
    maxActive: 1,
    maxQueued: 0,
    acquireTimeoutMs: 5_000,
    clock,
    connect: async () => client as FakeQueryClient & PoolClient,
    end: async () => {},
  });
}

const fixedJitter: JitterFn = () => 25;

test('NodePgTransaction constructor compiles against Transaction alias', () => {
  type FullSchema = Record<string, never>;
  type Schema = ExtractTablesWithRelations<FullSchema>;
  const client = createFakeQueryClient();
  const dialect = new PgDialect();
  const session = new NodePgSession<FullSchema, Schema>(
    client as unknown as PoolClient,
    dialect,
    undefined,
    {},
  );
  const tx: Transaction = new NodePgTransaction<FullSchema, Schema>(
    dialect,
    session,
    undefined,
  );
  assert.equal(tx.constructor.name, 'NodePgTransaction');
});

test('BEGIN failure surfaces without rollback', async () => {
  const beginError = Object.assign(new Error('begin failed'), {
    code: '08006',
  });
  const client = createFakeQueryClient([
    async () => {
      throw beginError;
    },
  ]);
  const runtime = directRuntime(client);

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy(),
      async () => 'never',
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'unavailable');
      return true;
    },
  );

  assert.equal(client.queries.filter((q) => q.text === 'ROLLBACK').length, 0);
});

test('BEGIN uses read-only isolation and set_config uses local timeouts', async () => {
  const client = createFakeQueryClient();
  const runtime = directRuntime(client);
  const policy = basePolicy({ readOnly: true, isolation: 'serializable' });

  await executeManagedTransaction(
    { withClient: runtime.withClient, onBackgroundError: () => {} },
    policy,
    async () => 'ok',
  );

  const beginQuery = client.queries[0];
  const timeoutQuery = client.queries[1];
  assert.ok(beginQuery);
  assert.ok(timeoutQuery);
  assert.match(
    beginQuery.text,
    /^BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY$/,
  );
  assert.match(
    timeoutQuery.text,
    /set_config\('statement_timeout', \$1, true\)/,
  );
  assert.match(timeoutQuery.text, /set_config\('lock_timeout', \$2, true\)/);
  assert.match(
    timeoutQuery.text,
    /set_config\('idle_in_transaction_session_timeout', \$3, true\)/,
  );
  assert.deepEqual(timeoutQuery.values, ['4000', '1000', '5000']);
  assert.equal(client.queries.at(-1)?.text, 'COMMIT');
});

test('callback rejection rolls back before surfacing error', async () => {
  const client = createFakeQueryClient();
  const runtime = directRuntime(client);
  const boom = new Error('callback failed');

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy(),
      async () => {
        throw boom;
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.cause, boom);
      return true;
    },
  );

  assert.equal(client.queries.at(-1)?.text, 'ROLLBACK');
});

test('COMMIT transport loss is commit-unknown and discards client', async () => {
  const transportError = new Error('connection dropped');
  const client = createFakeQueryClient();
  const baseQuery = client.query.bind(client);
  client.query = async (text, values) => {
    if (text === 'COMMIT') {
      throw transportError;
    }
    return baseQuery(text, values);
  };

  const runtime = directRuntime(client);

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy(),
      async () => 'done',
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'commit-unknown');
      return true;
    },
  );

  assert.equal(client.discardCalls, 1);
  assert.equal(client.queries.filter((q) => q.text === 'ROLLBACK').length, 0);
});

test('COMMIT ROLLBACK tag is not success', async () => {
  const client = createFakeQueryClient([
    async () => okResult('BEGIN'),
    async () => okResult('SELECT'),
    async () => okResult('ROLLBACK'),
  ]);

  const runtime = directRuntime(client);

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy(),
      async () => 'done',
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'application');
      return true;
    },
  );
});

test('timeout before COMMIT rolls back', async () => {
  const client = createFakeQueryClient();
  const runtime = directRuntime(client);
  const policy = basePolicy({
    timeoutMs: 30,
    statementTimeoutMs: 25,
    lockTimeoutMs: 10,
  });

  const runPromise = executeManagedTransaction(
    { withClient: runtime.withClient, onBackgroundError: () => {} },
    policy,
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'late';
    },
  );

  await assert.rejects(runPromise, (error: unknown) => {
    assert.ok(error instanceof DatabaseTransactionError);
    assert.equal(error.category, 'timeout');
    return true;
  });

  assert.equal(client.queries.at(-1)?.text, 'ROLLBACK');
});

test('rollback failure discards client and preserves callback cause', async () => {
  const callbackError = new Error('callback failed');
  const rollbackError = new Error('rollback failed');
  const client = createFakeQueryClient();
  const baseQuery = client.query.bind(client);
  client.query = async (text, values) => {
    if (text === 'ROLLBACK') {
      throw rollbackError;
    }
    return baseQuery(text, values);
  };

  const runtime = directRuntime(client);

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy(),
      async () => {
        throw callbackError;
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.cause, callbackError);
      return true;
    },
  );

  assert.equal(client.discardCalls, 1);
});

test('serialization conflict retries with confirmed rollback and jitter', async () => {
  let attempts = 0;
  const conflict = Object.assign(new Error('serialization failure'), {
    code: '40001',
  });

  const client = createFakeQueryClient();
  const runtime = directRuntime(client);

  const result = await executeManagedTransaction(
    {
      withClient: runtime.withClient,
      onBackgroundError: () => {},
    },
    basePolicy({ retry: 'sql-only-conflicts' }),
    async () => {
      attempts += 1;
      if (attempts < 2) {
        throw conflict;
      }
      return 'retried';
    },
    fixedJitter,
  );

  assert.equal(result, 'retried');
  assert.equal(attempts, 2);
  assert.ok(client.queries.filter((q) => q.text === 'ROLLBACK').length >= 1);
});

test('retry limit stops after max attempts', async () => {
  let attempts = 0;
  const conflict = Object.assign(new Error('serialization failure'), {
    code: '40001',
  });
  const client = createFakeQueryClient();
  const runtime = directRuntime(client);

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy({ retry: 'sql-only-conflicts', timeoutMs: 60_000 }),
      async () => {
        attempts += 1;
        throw conflict;
      },
      fixedJitter,
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'serialization');
      return true;
    },
  );

  assert.equal(attempts, MAX_TRANSACTION_ATTEMPTS);
});

test('invalid policy name is rejected', () => {
  assert.throws(
    () => validateTransactionPolicy(basePolicy({ name: 'INVALID' })),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'invalid-config');
      return true;
    },
  );
});

test('constraint errors do not retry', async () => {
  let attempts = 0;
  const constraint = Object.assign(new Error('duplicate key'), {
    code: '23505',
  });
  const client = createFakeQueryClient();
  const runtime = directRuntime(client);

  await assert.rejects(
    executeManagedTransaction(
      { withClient: runtime.withClient, onBackgroundError: () => {} },
      basePolicy({ retry: 'sql-only-conflicts' }),
      async () => {
        attempts += 1;
        throw constraint;
      },
      fixedJitter,
    ),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTransactionError);
      assert.equal(error.category, 'constraint');
      return true;
    },
  );

  assert.equal(attempts, 1);
});
