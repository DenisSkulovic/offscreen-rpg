import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LedgerError,
  LedgerOutcomeUnknownError,
  SQL_INSERT_EXECUTION,
  SQL_INSERT_EXECUTION_EVENT,
  SQL_READ_EXECUTION_BY_KEY,
  SQL_UPDATE_EXECUTION_CHECKPOINT,
  assertMarkerTargetId,
  formatNonNegativeBigInt,
  insertExecutionClaim,
  parseNonNegativeBigInt,
  readExecutionByKey,
  readMarker,
  redactLedgerError,
  requireUuidSyntax,
  updateExecutionCheckpoint,
} from '../src/ledger/repository.js';
import {
  SQL_READ_MARKER,
  SQL_TRY_ADVISORY_SESSION_LOCK,
} from '../src/ledger/schema.js';
import {
  SESSION_CHECK_SQL,
  SessionError,
  runInTransaction,
  withMutationSession,
  withReadOnlySession,
  redactSessionError,
  type SessionClient,
} from '../src/execution/session.js';
import { parseTarget, targetLabel, toTargetDisplay } from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';
const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_SHA = 'a'.repeat(40);
const OPERATION_KEY = 'demo@1';

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

type FakeQueryState = {
  connectCalls: number;
  endCalls: number;
  queries: Array<{ sql: string; values?: readonly unknown[] }>;
  lockAcquired: boolean;
  markerPresent: boolean;
  markerTargetId: string;
  executionRow: Record<string, unknown> | undefined;
  updateRowCount: number;
  commitThrows: boolean;
  commitCallCount: number;
  insertDuplicate: boolean;
  role: string;
};

function createSessionClient(
  overrides: Partial<
    Pick<
      FakeQueryState,
      | 'lockAcquired'
      | 'markerPresent'
      | 'markerTargetId'
      | 'executionRow'
      | 'updateRowCount'
      | 'commitThrows'
      | 'insertDuplicate'
      | 'role'
    >
  > = {},
): SessionClient & { state: FakeQueryState } {
  const state: FakeQueryState = {
    connectCalls: 0,
    endCalls: 0,
    queries: [],
    lockAcquired: overrides.lockAcquired ?? true,
    markerPresent: overrides.markerPresent ?? true,
    markerTargetId: overrides.markerTargetId ?? TARGET_ID,
    executionRow:
      overrides.executionRow === undefined ? undefined : overrides.executionRow,
    updateRowCount: overrides.updateRowCount ?? 1,
    commitThrows: overrides.commitThrows ?? false,
    commitCallCount: 0,
    insertDuplicate: overrides.insertDuplicate ?? false,
    role: overrides.role ?? ROLE,
  };

  const client: SessionClient & { state: FakeQueryState } = {
    state,
    async connect() {
      state.connectCalls += 1;
    },
    async end() {
      state.endCalls += 1;
    },
    async query(sql, values) {
      state.queries.push(values === undefined ? { sql } : { sql, values });

      if (sql === SESSION_CHECK_SQL) {
        return {
          rows: [{ database: DATABASE, role: state.role, recovery: false }],
          rowCount: 1,
        };
      }
      if (sql === SQL_TRY_ADVISORY_SESSION_LOCK) {
        return {
          rows: [{ acquired: state.lockAcquired }],
          rowCount: 1,
        };
      }
      if (sql === SQL_READ_MARKER) {
        if (!state.markerPresent) {
          return { rows: [], rowCount: 0 };
        }
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
        if (state.insertDuplicate) {
          throw new Error(`duplicate key ${SECRET}`);
        }
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
        return { rows: [], rowCount: 1 };
      }
      if (sql === SQL_UPDATE_EXECUTION_CHECKPOINT) {
        return { rows: [], rowCount: state.updateRowCount };
      }
      if (sql === 'COMMIT' && state.commitThrows) {
        state.commitCallCount += 1;
        throw new Error(`commit transport failed ${SECRET}`);
      }
      if (sql === 'COMMIT') {
        state.commitCallCount += 1;
      }
      return { rows: [], rowCount: null };
    },
  };

  return client;
}

function assertNoSecrets(text: string): void {
  assert.equal(text.includes(SECRET), false);
  assert.equal(/postgres(?:ql)?:\/\//i.test(text), false);
}

test('requireUuidSyntax refuses malformed target id', () => {
  assert.throws(
    () => requireUuidSyntax('not-a-uuid', 'target_id'),
    (error: unknown) => {
      assert.ok(error instanceof LedgerError);
      return true;
    },
  );
});

test('readMarker refuses missing marker', async () => {
  const client = createSessionClient({ markerPresent: false });
  await assert.rejects(
    () => readMarker(client),
    (error: unknown) => {
      assert.ok(error instanceof LedgerError);
      assert.match((error as Error).message, /marker/);
      return true;
    },
  );
});

test('parseNonNegativeBigInt accepts decimal strings and rejects Number paths', () => {
  assert.equal(parseNonNegativeBigInt('0', 'checkpoint'), 0n);
  assert.equal(parseNonNegativeBigInt('42', 'checkpoint'), 42n);
  assert.throws(() => parseNonNegativeBigInt(-1, 'checkpoint'), /nonnegative/);
  assert.throws(() => parseNonNegativeBigInt('12.5', 'checkpoint'), /decimal/);
});

test('withMutationSession verifies marker and holds session lock', async () => {
  const client = createSessionClient();
  const ran = await withMutationSession(
    target(),
    { targetId: TARGET_ID, confirmTarget: confirmLabel() },
    client,
    async (ctx) => {
      assert.equal(ctx.marker.targetId, TARGET_ID);
      return 'ok';
    },
  );
  assert.equal(ran, 'ok');
  assert.equal(client.state.connectCalls, 1);
  assert.equal(client.state.endCalls, 1);
  assert.equal(
    client.state.queries.some(
      (entry) => entry.sql === SQL_TRY_ADVISORY_SESSION_LOCK,
    ),
    true,
  );
});

test('wrong confirm-target refuses before connect', async () => {
  const client = createSessionClient();
  await assert.rejects(
    () =>
      withMutationSession(
        target(),
        {
          targetId: TARGET_ID,
          confirmTarget: '127.0.0.1:5433/wrong@ops_admin',
        },
        client,
        async () => 'unused',
      ),
    (error: unknown) => {
      assert.ok(error instanceof SessionError);
      assert.match((error as Error).message, /confirm-target/);
      return true;
    },
  );
  assert.equal(client.state.connectCalls, 0);
});

test('target_id mismatch after lock refuses', async () => {
  const client = createSessionClient({
    markerTargetId: '33333333-3333-4333-8333-333333333333',
  });
  await assert.rejects(
    () =>
      withMutationSession(
        target(),
        { targetId: TARGET_ID, confirmTarget: confirmLabel() },
        client,
        async () => 'unused',
      ),
    (error: unknown) => {
      assert.ok(error instanceof LedgerError);
      assert.match((error as Error).message, /target_id/);
      return true;
    },
  );
  assert.equal(client.state.endCalls, 1);
});

test('wrong role refuses during session verification', async () => {
  const client = createSessionClient({ role: 'other_role' });
  await assert.rejects(
    () =>
      withMutationSession(
        target(),
        { targetId: TARGET_ID, confirmTarget: confirmLabel() },
        client,
        async () => 'unused',
      ),
    /connected role does not match/,
  );
  assert.equal(client.state.endCalls, 1);
});

test('busy session advisory lock closes without transaction', async () => {
  const client = createSessionClient({ lockAcquired: false });
  await assert.rejects(
    () =>
      withMutationSession(
        target(),
        { targetId: TARGET_ID, confirmTarget: confirmLabel() },
        client,
        async () => 'unused',
      ),
    (error: unknown) => {
      assert.ok(error instanceof SessionError);
      assert.match((error as Error).message, /advisory lock busy/);
      return true;
    },
  );
  assert.equal(
    client.state.queries.some((entry) => entry.sql === 'BEGIN'),
    false,
  );
  assert.equal(client.state.endCalls, 1);
});

test('insertExecutionClaim rejects duplicate claim', async () => {
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'actor',
      state: 'running',
      checkpoint: '0',
      processed: '0',
    },
  });

  await assert.rejects(
    () =>
      runInTransaction(client, () =>
        insertExecutionClaim(client, {
          operationKey: OPERATION_KEY,
          artifactSha: ARTIFACT_SHA,
          runId: RUN_ID,
          actor: 'actor',
          checkpoint: 0n,
          processed: 0n,
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof LedgerError);
      assert.match((error as Error).message, /already exists/);
      return true;
    },
  );
});

test('updateExecutionCheckpoint refuses rowcount mismatch', async () => {
  const client = createSessionClient({ updateRowCount: 0 });

  await assert.rejects(
    () =>
      runInTransaction(client, () =>
        updateExecutionCheckpoint(client, {
          operationKey: OPERATION_KEY,
          runId: RUN_ID,
          artifactSha: ARTIFACT_SHA,
          expectedState: 'running',
          expectedCheckpoint: '0',
          expectedProcessed: '0',
          newState: 'paused',
          newCheckpoint: '10',
          newProcessed: '5',
          event: 'paused',
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof LedgerError);
      assert.match((error as Error).message, /predicate mismatch/);
      return true;
    },
  );
  assert.equal(
    client.state.queries.filter(
      (entry) => entry.sql === SQL_INSERT_EXECUTION_EVENT,
    ).length,
    0,
  );
});

test('precommit failure rolls back and closes', async () => {
  const client = createSessionClient();

  await assert.rejects(
    () =>
      withMutationSession(
        target(),
        { targetId: TARGET_ID, confirmTarget: confirmLabel() },
        client,
        async (ctx) =>
          ctx.runTransaction(async () => {
            throw new Error(`boom ${SECRET}`);
          }),
      ),
    /boom/,
  );
  assert.equal(
    client.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    1,
  );
  assert.equal(
    client.state.queries.some((entry) => entry.sql === 'COMMIT'),
    false,
  );
  assert.equal(client.state.endCalls, 1);
  const message = redactSessionError(new Error(`boom ${SECRET}`));
  assertNoSecrets(message);
});

test('ambiguous commit never replays and redacts', async () => {
  const client = createSessionClient({ commitThrows: true });

  await assert.rejects(
    () =>
      withMutationSession(
        target(),
        { targetId: TARGET_ID, confirmTarget: confirmLabel() },
        client,
        async (ctx) =>
          ctx.runTransaction(async (tx) => {
            await insertExecutionClaim(tx, {
              operationKey: OPERATION_KEY,
              artifactSha: ARTIFACT_SHA,
              runId: RUN_ID,
              actor: 'actor',
              checkpoint: '0',
              processed: '0',
            });
          }),
      ),
    LedgerOutcomeUnknownError,
  );

  assert.equal(client.state.commitCallCount, 1);
  assert.equal(
    client.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    0,
  );
  assert.equal(client.state.endCalls, 1);

  const message = redactSessionError(new LedgerOutcomeUnknownError());
  assert.match(message, /inspect ledger manually/);
  assertNoSecrets(message);
  const ledgerMessage = redactLedgerError(new LedgerOutcomeUnknownError());
  assert.match(ledgerMessage, /inspect execution state manually/);
});

test('withReadOnlySession matches marker without session lock', async () => {
  const client = createSessionClient();
  const marker = await withReadOnlySession(
    target(),
    { targetId: TARGET_ID },
    client,
    async (ctx) => ctx.marker,
  );
  assert.deepEqual(marker, { targetId: TARGET_ID, schemaVersion: 1 });
  assert.equal(
    client.state.queries.some(
      (entry) => entry.sql === SQL_TRY_ADVISORY_SESSION_LOCK,
    ),
    false,
  );
  assert.equal(
    client.state.queries.some((entry) => entry.sql === 'BEGIN READ ONLY'),
    true,
  );
  assert.equal(client.state.queries.at(-1)?.sql, 'ROLLBACK');
});

test('readExecutionByKey returns parsed bigint decimal strings', async () => {
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'actor',
      state: 'running',
      checkpoint: '99',
      processed: '12',
    },
  });
  const row = await readExecutionByKey(client, OPERATION_KEY);
  assert.ok(row);
  assert.equal(row?.checkpoint, '99');
  assert.equal(row?.processed, '12');
  assert.equal(formatNonNegativeBigInt(99n), '99');
});

test('assertMarkerTargetId validates syntax and equality', () => {
  const marker = Object.freeze({
    targetId: TARGET_ID,
    schemaVersion: 1 as const,
  });
  assert.throws(() => assertMarkerTargetId(marker, 'bad-id'), /UUID syntax/);
  assert.throws(
    () => assertMarkerTargetId(marker, '33333333-3333-4333-8333-333333333333'),
    /does not match/,
  );
});
