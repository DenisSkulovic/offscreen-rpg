import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PoolClient, QueryResult } from 'pg';
import { NodePgTransaction, NodePgSession } from 'drizzle-orm/node-postgres';
import { PgDialect } from 'drizzle-orm/pg-core/dialect';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import {
  acquireTransactionAdvisoryLock,
  expectOneAffected,
} from '../src/transaction/concurrency';
import {
  AffectedRowConflictError,
  DatabaseTransactionError,
} from '../src/transaction/errors';
import type { Transaction } from '../src/transaction/types';

type FullSchema = Record<string, never>;
type Schema = ExtractTablesWithRelations<FullSchema>;

type QueryCall = {
  text: string;
  values?: unknown[];
};

function okResult(command: string): QueryResult {
  return { command, rowCount: 0, rows: [], oid: 0, fields: [] };
}

function createRecordingClient(handlers: QueryCall[] = []): {
  client: PoolClient & { queries: QueryCall[] };
  queries: QueryCall[];
} {
  const queries: QueryCall[] = handlers;
  const client = {
    queries,
    async query(
      queryTextOrConfig: string | { text: string },
      values?: unknown[],
    ) {
      if (
        typeof queryTextOrConfig === 'object' &&
        queryTextOrConfig !== null &&
        'text' in queryTextOrConfig
      ) {
        const call: QueryCall = { text: queryTextOrConfig.text };
        if (values !== undefined) {
          call.values = values;
        }
        queries.push(call);
        return okResult('SELECT');
      }
      const call: QueryCall =
        values === undefined
          ? { text: queryTextOrConfig }
          : { text: queryTextOrConfig, values };
      queries.push(call);
      return okResult('SELECT');
    },
  } as PoolClient & { queries: QueryCall[] };
  return { client, queries };
}

function nodePgTransaction(client: PoolClient): Transaction {
  const dialect = new PgDialect();
  const session = new NodePgSession<FullSchema, Schema>(
    client,
    dialect,
    undefined,
    {},
  );
  return new NodePgTransaction<FullSchema, Schema>(dialect, session, undefined);
}

test('expectOneAffected rejects zero, two, and NaN', () => {
  for (const count of [0, 2, Number.NaN]) {
    assert.throws(() => expectOneAffected(count), AffectedRowConflictError);
  }
});

test('expectOneAffected accepts exactly one affected row', () => {
  assert.doesNotThrow(() => expectOneAffected(1));
});

test('acquireTransactionAdvisoryLock rejects invalid keys without executing', async () => {
  const invalidKeys = [
    2_147_483_648,
    -2_147_483_649,
    3.14,
    Number.NaN,
  ] as const;
  for (const key of invalidKeys) {
    let executeCalls = 0;
    const tx = {
      execute: async () => {
        executeCalls += 1;
      },
    } as unknown as Transaction;

    await assert.rejects(
      acquireTransactionAdvisoryLock(tx, key),
      DatabaseTransactionError,
    );
    assert.equal(executeCalls, 0);
  }
});

test('acquireTransactionAdvisoryLock uses parameterized drizzle SQL on the provided tx only', async () => {
  const { client, queries } = createRecordingClient();
  const tx = nodePgTransaction(client);
  const other = {
    execute: async () => {
      throw new Error('other tx must not run');
    },
  } as unknown as Transaction;

  await acquireTransactionAdvisoryLock(tx, 42);
  assert.equal(queries.length, 1);
  const call = queries[0];
  assert.ok(call);
  assert.match(call.text, /pg_advisory_xact_lock\(\$1::bigint\)/);
  assert.deepEqual(call.values, [42]);

  await assert.rejects(acquireTransactionAdvisoryLock(other, 1));
  assert.equal(queries.length, 1);
});
