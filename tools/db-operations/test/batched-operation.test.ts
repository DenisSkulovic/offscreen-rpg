import assert from 'node:assert/strict';
import test from 'node:test';

import { operationKey } from '../src/contract.js';
import { executeBatchedRun } from '../src/execution/batched.js';
import type { GitProvenance } from '../src/execution/atomic.js';
import {
  BatchedOperationError,
  type OperationQuery,
  type OperationQueryResult,
} from '../src/execution/operation.js';
import {
  SQL_INSERT_EXECUTION,
  SQL_INSERT_EXECUTION_EVENT,
  SQL_READ_EXECUTION_BY_KEY,
  SQL_UPDATE_EXECUTION_CHECKPOINT,
} from '../src/ledger/repository.js';
import {
  SQL_READ_MARKER,
  SQL_TRY_ADVISORY_SESSION_LOCK,
} from '../src/ledger/schema.js';
import {
  SESSION_CHECK_SQL,
  type SessionClient,
} from '../src/execution/session.js';
import { parseTarget, targetLabel, toTargetDisplay } from '../src/target.js';
import {
  createNormalizeLabelsBatchedOperation,
  SQL_NORMALIZE_LABELS_PLAN,
  SQL_NORMALIZE_LABELS_READ_LOCKED,
  SQL_NORMALIZE_LABELS_SELECT_BATCH,
  SQL_NORMALIZE_LABELS_UPDATE_ROW,
  SQL_NORMALIZE_LABELS_VERIFY,
} from './fixtures/normalize-labels.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';
const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_SHA = 'a'.repeat(40);

type LabelRow = {
  id: bigint;
  original: string;
  normalized: string | null;
  revision: bigint;
};

type LabelStoreOptions = Readonly<{
  casStaleOnUpdateForId?: bigint;
}>;

function lower(original: string): string {
  return original.toLowerCase();
}

function createLabelStore(
  initial: readonly LabelRow[],
  options: LabelStoreOptions = {},
): {
  rows: Map<string, LabelRow>;
  queryLog: Array<{ sql: string; values?: readonly unknown[] }>;
  query: OperationQuery;
} {
  const rows = new Map<string, LabelRow>();
  for (const row of initial) {
    rows.set(row.id.toString(), { ...row });
  }
  const queryLog: Array<{ sql: string; values?: readonly unknown[] }> = [];

  const query: OperationQuery = async (sql, values) => {
    queryLog.push(values === undefined ? { sql } : { sql, values });
    return dispatchLabelSql(rows, sql, values, options);
  };

  return { rows, queryLog, query };
}

function dispatchLabelSql(
  rows: Map<string, LabelRow>,
  sql: string,
  values: readonly unknown[] | undefined,
  options: LabelStoreOptions,
): OperationQueryResult {
  if (sql === SQL_NORMALIZE_LABELS_PLAN) {
    let eligible = 0n;
    for (const row of rows.values()) {
      const target = lower(row.original);
      if (row.normalized !== target) {
        eligible += 1n;
      }
    }
    return {
      rows: [{ eligible_rows: eligible.toString() }],
      rowCount: 1,
    };
  }

  if (sql === SQL_NORMALIZE_LABELS_SELECT_BATCH) {
    const afterId = BigInt(String(values?.[0] ?? '0'));
    const limit = Number(values?.[1] ?? '0');
    const selected = [...rows.values()]
      .filter((row) => row.id > afterId)
      .sort((left, right) => (left.id < right.id ? -1 : 1))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        revision: row.revision,
        original: row.original,
      }));
    return { rows: selected, rowCount: selected.length };
  }

  if (sql === SQL_NORMALIZE_LABELS_UPDATE_ROW) {
    const id = BigInt(String(values?.[0]));
    const revision = BigInt(String(values?.[1]));
    const key = id.toString();
    const current = rows.get(key);
    if (current === undefined) {
      return { rows: [], rowCount: 0 };
    }
    if (
      options.casStaleOnUpdateForId !== undefined &&
      options.casStaleOnUpdateForId === id
    ) {
      current.revision += 1n;
      return { rows: [], rowCount: 0 };
    }
    if (current.revision !== revision) {
      return { rows: [], rowCount: 0 };
    }
    const target = lower(current.original);
    if (current.normalized === target) {
      return { rows: [], rowCount: 0 };
    }
    current.normalized = target;
    current.revision += 1n;
    return { rows: [], rowCount: 1 };
  }

  if (sql === SQL_NORMALIZE_LABELS_READ_LOCKED) {
    const id = BigInt(String(values?.[0]));
    const current = rows.get(id.toString());
    if (current === undefined) {
      return { rows: [], rowCount: 0 };
    }
    return {
      rows: [{ revision: current.revision, normalized: current.normalized }],
      rowCount: 1,
    };
  }

  if (sql === SQL_NORMALIZE_LABELS_VERIFY) {
    let violations = 0n;
    for (const row of rows.values()) {
      if (row.normalized !== lower(row.original)) {
        violations += 1n;
      }
    }
    return {
      rows: [{ violations: violations.toString() }],
      rowCount: 1,
    };
  }

  throw new Error(`unexpected fixture SQL in label store: ${sql}`);
}

function validEnv(): Record<string, string | undefined> {
  return {
    DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/${DATABASE}`,
  };
}

function target(): ReturnType<typeof parseTarget> {
  return parseTarget(validEnv());
}

function confirmLabel(): string {
  return targetLabel(toTargetDisplay(target()));
}

function cleanGit(sha = ARTIFACT_SHA): () => Promise<GitProvenance> {
  return async () => Object.freeze({ sha, clean: true });
}

function createLedgerClient(labelQuery: OperationQuery): SessionClient & {
  queries: Array<{ sql: string; values?: readonly unknown[] }>;
  executionRow: Record<string, unknown> | undefined;
} {
  const queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
  let executionRow: Record<string, unknown> | undefined;

  const client: SessionClient & {
    queries: typeof queries;
    executionRow: typeof executionRow;
  } = {
    queries,
    get executionRow() {
      return executionRow;
    },
    set executionRow(next) {
      executionRow = next;
    },
    async connect() {},
    async end() {},
    async query(sql, values) {
      queries.push(values === undefined ? { sql } : { sql, values });
      if (
        sql === SQL_NORMALIZE_LABELS_PLAN ||
        sql === SQL_NORMALIZE_LABELS_SELECT_BATCH ||
        sql === SQL_NORMALIZE_LABELS_UPDATE_ROW ||
        sql === SQL_NORMALIZE_LABELS_READ_LOCKED ||
        sql === SQL_NORMALIZE_LABELS_VERIFY
      ) {
        return labelQuery(sql, values);
      }
      if (sql === SESSION_CHECK_SQL) {
        return {
          rows: [{ database: DATABASE, role: ROLE, recovery: false }],
          rowCount: 1,
        };
      }
      if (sql === SQL_TRY_ADVISORY_SESSION_LOCK) {
        return { rows: [{ acquired: true }], rowCount: 1 };
      }
      if (sql === SQL_READ_MARKER) {
        return {
          rows: [{ target_id: TARGET_ID, schema_version: 1 }],
          rowCount: 1,
        };
      }
      if (sql === SQL_READ_EXECUTION_BY_KEY) {
        if (executionRow === undefined) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [executionRow], rowCount: 1 };
      }
      if (sql === SQL_INSERT_EXECUTION) {
        executionRow = {
          operation_key: values?.[0],
          artifact_sha: values?.[1],
          run_id: values?.[2],
          actor: values?.[3],
          state: 'running',
          checkpoint: values?.[4],
          processed: values?.[5],
        };
        return { rows: [], rowCount: 1 };
      }
      if (sql === SQL_INSERT_EXECUTION_EVENT) {
        return { rows: [], rowCount: 1 };
      }
      if (sql === SQL_UPDATE_EXECUTION_CHECKPOINT) {
        if (executionRow !== undefined) {
          executionRow = {
            ...executionRow,
            state: values?.[6],
            checkpoint: values?.[7],
            processed: values?.[8],
          };
        }
        return { rows: [], rowCount: 1 };
      }
      if (sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [], rowCount: null };
      }
      return { rows: [], rowCount: null };
    },
  };

  return client;
}

const operation = createNormalizeLabelsBatchedOperation();
const OPERATION_KEY = operationKey(operation.manifest);

function runRequest(resume = false, maxBatches = 20, batchSize = 100) {
  return {
    targetId: TARGET_ID,
    confirmTarget: confirmLabel(),
    actor: 'dev@local',
    resume,
    maxBatches,
    batchSize,
  };
}

test('normalize-labels plan and batches use parameterized SQL in order', async () => {
  const store = createLabelStore([
    { id: 1n, original: 'Alpha', normalized: null, revision: 0n },
    { id: 2n, original: 'BETA', normalized: 'beta', revision: 1n },
    { id: 3n, original: 'Gamma', normalized: null, revision: 0n },
  ]);

  const plan = await operation.plan(store.query);
  assert.equal(plan.eligibleRows, '2');

  const first = await operation.nextBatch(store.query, 0n, 2);
  assert.equal(first.affectedRows, 2n);
  assert.equal(first.lastId, 2n);
  assert.equal(first.done, false);

  const second = await operation.nextBatch(store.query, first.lastId, 2);
  assert.equal(second.lastId, 3n);
  assert.equal(second.done, true);

  const batchSelects = store.queryLog.filter(
    (entry) => entry.sql === SQL_NORMALIZE_LABELS_SELECT_BATCH,
  );
  assert.equal(batchSelects.length, 2);
  assert.deepEqual(batchSelects[0]?.values, ['0', 2]);
  assert.deepEqual(batchSelects[1]?.values, ['2', 2]);

  const verified = await operation.verify(store.query);
  assert.equal(verified, true);
  assert.equal(store.rows.get('1')?.normalized, 'alpha');
  assert.equal(store.rows.get('1')?.original, 'Alpha');
  assert.equal(store.rows.get('3')?.normalized, 'gamma');
});

test('normalize-labels idempotent row permits update rowCount 0', async () => {
  const store = createLabelStore([
    { id: 5n, original: 'Ok', normalized: 'ok', revision: 2n },
  ]);

  const batch = await operation.nextBatch(store.query, 0n, 10);
  assert.equal(batch.affectedRows, 1n);
  assert.equal(batch.done, true);
  assert.equal(
    store.queryLog.filter((e) => e.sql === SQL_NORMALIZE_LABELS_READ_LOCKED)
      .length,
    1,
  );
});

test('normalize-labels cursor advances across partial batches', async () => {
  const store = createLabelStore([
    { id: 10n, original: 'One', normalized: null, revision: 0n },
    { id: 20n, original: 'Two', normalized: null, revision: 0n },
    { id: 30n, original: 'Three', normalized: null, revision: 0n },
  ]);

  const first = await operation.nextBatch(store.query, 0n, 2);
  assert.equal(first.done, false);
  assert.equal(first.lastId, 20n);
  assert.equal(first.affectedRows, 2n);

  const second = await operation.nextBatch(store.query, first.lastId, 2);
  assert.equal(second.done, true);
  assert.equal(second.lastId, 30n);
  assert.equal(second.affectedRows, 1n);
});

test('normalize-labels CAS failure refuses stale revision', async () => {
  const store = createLabelStore(
    [{ id: 7n, original: 'Stale', normalized: null, revision: 0n }],
    { casStaleOnUpdateForId: 7n },
  );

  await assert.rejects(
    () => operation.nextBatch(store.query, 0n, 5),
    (error: unknown) => {
      assert.ok(error instanceof BatchedOperationError);
      assert.match((error as Error).message, /compare-and-set failed/);
      return true;
    },
  );
  assert.equal(
    store.queryLog.some(
      (entry) => entry.sql === SQL_NORMALIZE_LABELS_READ_LOCKED,
    ),
    true,
  );
});

test('normalize-labels runner resume continues from durable checkpoint', async () => {
  const store = createLabelStore([
    { id: 1n, original: 'A', normalized: 'a', revision: 1n },
    { id: 2n, original: 'B', normalized: null, revision: 0n },
    { id: 3n, original: 'C', normalized: null, revision: 0n },
  ]);
  const client = createLedgerClient(store.query);
  client.executionRow = {
    operation_key: OPERATION_KEY,
    artifact_sha: ARTIFACT_SHA,
    run_id: RUN_ID,
    actor: 'dev@local',
    state: 'paused',
    checkpoint: '1',
    processed: '1',
  };

  const receipt = await executeBatchedRun(
    operation,
    runRequest(true, 5, 1),
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'succeeded');
  if (receipt.outcome !== 'succeeded') {
    return;
  }
  assert.equal(receipt.checkpoint, '3');
  assert.equal(receipt.processed, '3');
  assert.equal(client.executionRow?.state, 'succeeded');
});

test('duplicate run on succeeded same SHA is noop', async () => {
  const store = createLabelStore([
    { id: 1n, original: 'Done', normalized: 'done', revision: 1n },
  ]);
  const client = createLedgerClient(store.query);
  client.executionRow = {
    operation_key: OPERATION_KEY,
    artifact_sha: ARTIFACT_SHA,
    run_id: RUN_ID,
    actor: 'dev@local',
    state: 'succeeded',
    checkpoint: '1',
    processed: '1',
  };

  const receipt = await executeBatchedRun(
    operation,
    runRequest(false),
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'noop');
  assert.equal(
    client.queries.some(
      (entry) => entry.sql === SQL_NORMALIZE_LABELS_SELECT_BATCH,
    ),
    false,
  );
});

test('fixture operation is not in production registry lookup path', () => {
  assert.equal(OPERATION_KEY, 'normalize-labels-fixture@1');
});
