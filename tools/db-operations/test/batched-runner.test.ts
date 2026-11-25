import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeBatchedRun,
  redactBatchedError,
} from '../src/execution/batched.js';
import type { GitProvenance } from '../src/execution/atomic.js';
import {
  resolveBatchedDispatchBounds,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_BATCHES,
} from '../src/execution/operation.js';
import {
  BatchedOperationError,
  freezeRegisteredBatchedOperation,
  type RegisteredBatchedOperation,
} from '../src/execution/operation.js';
import {
  LedgerOutcomeUnknownError,
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
import { validateManifest } from '../src/contract.js';
import { parseTarget, targetLabel, toTargetDisplay } from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';
const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const OPERATION_KEY = 'fixture-batch@1';

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

function batchedManifest() {
  return validateManifest({
    id: 'fixture-batch',
    version: 1,
    title: 'Fixture batch',
    owner: 'ops',
    kind: 'backfill',
    risk: 'low',
    mode: 'batched',
    recovery: 'reversible',
    recoveryNotes: 'fixture only',
    affectedTables: ['public.demo'],
  });
}

type BatchHandlerState = {
  planCalls: number;
  batchCalls: number;
  verifyCalls: number;
  eligibleRows: string;
  batches: Array<
    Readonly<{ lastId: bigint; affectedRows: bigint; done: boolean }>
  >;
  batchIndex: number;
  verifyResult: boolean;
  injectBadCursor: boolean;
};

function createBatchedOperation(
  overrides: Partial<BatchHandlerState> = {},
): RegisteredBatchedOperation {
  const state: BatchHandlerState = {
    planCalls: 0,
    batchCalls: 0,
    verifyCalls: 0,
    eligibleRows: '10',
    batches: [
      { lastId: 5n, affectedRows: 5n, done: false },
      { lastId: 10n, affectedRows: 5n, done: true },
    ],
    batchIndex: 0,
    verifyResult: true,
    injectBadCursor: false,
    ...overrides,
  };

  return freezeRegisteredBatchedOperation({
    manifest: batchedManifest(),
    async plan(query) {
      state.planCalls += 1;
      await query('SELECT 1', []);
      return { eligibleRows: state.eligibleRows };
    },
    async nextBatch(query, afterId, limit) {
      state.batchCalls += 1;
      await query('SELECT 1', []);
      if (state.injectBadCursor) {
        return {
          lastId: afterId,
          affectedRows: 1n,
          done: false,
        };
      }
      const entry = state.batches[state.batchIndex];
      if (entry === undefined) {
        throw new Error('unexpected extra batch call');
      }
      state.batchIndex += 1;
      if (entry.lastId <= afterId && !entry.done) {
        throw new Error('fixture batch must advance cursor');
      }
      void limit;
      return entry;
    },
    async verify(query) {
      state.verifyCalls += 1;
      await query('SELECT 1', []);
      return state.verifyResult;
    },
  });
}

type FakeQueryState = {
  connectCalls: number;
  endCalls: number;
  lockAcquired: boolean;
  markerTargetId: string;
  executionRow: Record<string, unknown> | undefined;
  updateRowCount: number;
  commitThrows: boolean;
  commitThrowsAfter: number;
  commitCallCount: number;
  eventRows: Array<Record<string, unknown>>;
  rollbackBeforeUpdate: boolean;
};

function createSessionClient(
  overrides: Partial<FakeQueryState> = {},
): SessionClient & {
  state: FakeQueryState & {
    queries: Array<{ sql: string; values?: readonly unknown[] }>;
  };
} {
  const state: FakeQueryState & {
    queries: Array<{ sql: string; values?: readonly unknown[] }>;
  } = {
    connectCalls: 0,
    endCalls: 0,
    queries: [],
    lockAcquired: overrides.lockAcquired ?? true,
    markerTargetId: overrides.markerTargetId ?? TARGET_ID,
    executionRow:
      overrides.executionRow === undefined ? undefined : overrides.executionRow,
    updateRowCount: overrides.updateRowCount ?? 1,
    commitThrows: overrides.commitThrows ?? false,
    commitThrowsAfter: overrides.commitThrowsAfter ?? 0,
    commitCallCount: 0,
    eventRows: [],
    rollbackBeforeUpdate: overrides.rollbackBeforeUpdate ?? false,
  };

  const client: SessionClient & { state: typeof state } = {
    state,
    async connect() {
      state.connectCalls += 1;
    },
    async end() {
      state.endCalls += 1;
    },
    async query(sql, values) {
      state.queries.push(values === undefined ? { sql } : { sql, values });
      if (sql === 'ROLLBACK' && state.rollbackBeforeUpdate) {
        state.executionRow =
          state.executionRow === undefined
            ? undefined
            : {
                ...state.executionRow,
                state: 'running',
                checkpoint: '0',
                processed: '0',
              };
      }
      if (sql === SESSION_CHECK_SQL) {
        return {
          rows: [{ database: DATABASE, role: ROLE, recovery: false }],
          rowCount: 1,
        };
      }
      if (sql === SQL_TRY_ADVISORY_SESSION_LOCK) {
        return { rows: [{ acquired: state.lockAcquired }], rowCount: 1 };
      }
      if (sql === SQL_READ_MARKER) {
        return {
          rows: [{ target_id: state.markerTargetId, schema_version: 1 }],
          rowCount: 1,
        };
      }
      if (sql === SQL_READ_EXECUTION_BY_KEY) {
        if (state.executionRow === undefined) {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [state.executionRow], rowCount: 1 };
      }
      if (sql === SQL_INSERT_EXECUTION) {
        state.executionRow = {
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
        state.eventRows.push({
          run_id: values?.[0],
          event: values?.[1],
          checkpoint: values?.[2],
          processed: values?.[3],
        });
        return { rows: [], rowCount: 1 };
      }
      if (sql === SQL_UPDATE_EXECUTION_CHECKPOINT) {
        if (state.updateRowCount === 1 && state.executionRow !== undefined) {
          state.executionRow = {
            ...state.executionRow,
            state: values?.[6],
            checkpoint: values?.[7],
            processed: values?.[8],
          };
        }
        return { rows: [], rowCount: state.updateRowCount };
      }
      if (sql === 'COMMIT') {
        state.commitCallCount += 1;
        const shouldThrow =
          state.commitThrows ||
          (state.commitThrowsAfter > 0 &&
            state.commitCallCount >= state.commitThrowsAfter);
        if (shouldThrow) {
          throw new Error(`commit transport failed ${SECRET}`);
        }
      }
      return { rows: [], rowCount: null };
    },
  };

  return client;
}

function runRequest(resume = false) {
  return {
    targetId: TARGET_ID,
    confirmTarget: confirmLabel(),
    actor: 'dev@local',
    resume,
  };
}

test('resolveBatchedDispatchBounds applies defaults', () => {
  const bounds = resolveBatchedDispatchBounds(undefined, undefined);
  assert.equal(bounds.batchSize, DEFAULT_BATCH_SIZE);
  assert.equal(bounds.maxBatches, DEFAULT_MAX_BATCHES);
});

test('succeeded same SHA returns noop without batches', async () => {
  const operation = createBatchedOperation();
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'dev@local',
      state: 'succeeded',
      checkpoint: '10',
      processed: '10',
    },
  });

  const receipt = await executeBatchedRun(
    operation,
    runRequest(false),
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'noop');
  assert.equal(
    client.state.queries.some(
      (entry) => entry.sql === SQL_UPDATE_EXECUTION_CHECKPOINT,
    ),
    false,
  );
});

test('active execution without resume refuses', async () => {
  const operation = createBatchedOperation();
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'dev@local',
      state: 'running',
      checkpoint: '5',
      processed: '5',
    },
  });

  await assert.rejects(
    () =>
      executeBatchedRun(operation, runRequest(false), client, target(), {
        gitProvenance: cleanGit(),
      }),
    (error: unknown) => {
      assert.ok(error instanceof BatchedOperationError);
      assert.match((error as Error).message, /explicit resume/);
      return true;
    },
  );
});

test('same SHA resume continues from durable checkpoint', async () => {
  const operation = createBatchedOperation({
    batches: [{ lastId: 10n, affectedRows: 5n, done: true }],
  });
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'dev@local',
      state: 'paused',
      checkpoint: '5',
      processed: '5',
    },
  });

  const receipt = await executeBatchedRun(
    operation,
    runRequest(true),
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'succeeded');
  if (receipt.outcome !== 'succeeded') {
    return;
  }
  assert.equal(receipt.checkpoint, '10');
  assert.equal(receipt.processed, '10');
});

test('wrong cursor on batch rolls back checkpoint', async () => {
  const operation = createBatchedOperation({ injectBadCursor: true });
  const client = createSessionClient();

  await assert.rejects(
    () =>
      executeBatchedRun(operation, runRequest(false), client, target(), {
        gitProvenance: cleanGit(),
      }),
    (error: unknown) => {
      assert.ok(error instanceof BatchedOperationError);
      assert.match((error as Error).message, /lastId/);
      return true;
    },
  );

  assert.equal(client.state.executionRow?.checkpoint, '0');
  assert.equal(
    client.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    1,
  );
});

test('false verify rolls back without durable succeeded state', async () => {
  const operation = createBatchedOperation({
    batches: [{ lastId: 5n, affectedRows: 5n, done: true }],
    verifyResult: false,
  });
  const client = createSessionClient();

  await assert.rejects(
    () =>
      executeBatchedRun(operation, runRequest(false), client, target(), {
        gitProvenance: cleanGit(),
      }),
    /verify/,
  );

  assert.notEqual(client.state.executionRow?.state, 'succeeded');
  assert.equal(client.state.executionRow?.checkpoint, '0');
});

test('unknown commit on start does not claim paused', async () => {
  const operation = createBatchedOperation();
  const client = createSessionClient({ commitThrowsAfter: 1 });

  await assert.rejects(
    () =>
      executeBatchedRun(operation, runRequest(false), client, target(), {
        gitProvenance: cleanGit(),
      }),
    LedgerOutcomeUnknownError,
  );

  assert.equal(client.state.executionRow?.state, 'running');
  assert.notEqual(
    client.state.eventRows.some((row) => row.event === 'paused'),
    true,
  );
});

test('lost commit reply on batch throws outcome unknown', async () => {
  const operation = createBatchedOperation({
    batches: [{ lastId: 5n, affectedRows: 5n, done: false }],
  });
  const client = createSessionClient({ commitThrowsAfter: 2 });

  await assert.rejects(
    () =>
      executeBatchedRun(
        operation,
        { ...runRequest(false), maxBatches: 1 },
        client,
        target(),
        { gitProvenance: cleanGit() },
      ),
    LedgerOutcomeUnknownError,
  );
});

test('budget exhaustion pauses with checkpoint durable', async () => {
  const operation = createBatchedOperation({
    batches: [{ lastId: 5n, affectedRows: 5n, done: false }],
  });
  const client = createSessionClient();

  const receipt = await executeBatchedRun(
    operation,
    { ...runRequest(false), maxBatches: 1 },
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'paused');
  if (receipt.outcome !== 'paused') {
    return;
  }
  assert.equal(receipt.checkpoint, '5');
  assert.equal(receipt.processed, '5');
  assert.equal(client.state.executionRow?.state, 'paused');
});

test('multi-batch success commits incremental checkpoints', async () => {
  const operation = createBatchedOperation();
  const client = createSessionClient();

  const receipt = await executeBatchedRun(
    operation,
    runRequest(false),
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'succeeded');
  const batchEvents = client.state.eventRows.filter(
    (row) => row.event === 'batch',
  );
  assert.equal(batchEvents.length >= 1, true);
  assert.equal(client.state.executionRow?.checkpoint, '10');
});

test('changed artifact SHA refuses', async () => {
  const operation = createBatchedOperation();
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: OTHER_SHA,
      run_id: RUN_ID,
      actor: 'dev@local',
      state: 'succeeded',
      checkpoint: '0',
      processed: '1',
    },
  });

  await assert.rejects(
    () =>
      executeBatchedRun(operation, runRequest(false), client, target(), {
        gitProvenance: cleanGit(),
      }),
    /artifact SHA/,
  );
});

test('redactBatchedError omits secrets', () => {
  const message = redactBatchedError(
    new BatchedOperationError('verify returned false'),
  );
  assert.match(message, /verification failed/);
  assert.equal(message.includes(SECRET), false);
});
