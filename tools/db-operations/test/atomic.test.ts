import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCliArguments } from '../src/arguments.js';
import {
  assertCleanGitProvenance,
  executeAtomicPlan,
  executeAtomicRun,
  redactAtomicError,
  type GitProvenance,
} from '../src/execution/atomic.js';
import {
  AtomicOperationError,
  freezeRegisteredOperation,
  type RegisteredAtomicOperation,
} from '../src/execution/operation.js';
import {
  LedgerOutcomeUnknownError,
  SQL_INSERT_EXECUTION,
  SQL_READ_EXECUTION_BY_KEY,
  SQL_UPDATE_EXECUTION_CHECKPOINT,
} from '../src/ledger/repository.js';
import {
  SQL_READ_MARKER,
  SQL_TRY_ADVISORY_SESSION_LOCK,
} from '../src/ledger/schema.js';
import {
  SESSION_CHECK_SQL,
  SessionError,
  type SessionClient,
} from '../src/execution/session.js';
import { runCli, type RunCliDeps } from '../src/cli.js';
import { validateManifest } from '../src/contract.js';
import { parseTarget, targetLabel, toTargetDisplay } from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';
const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);
const OPERATION_KEY = 'fixture-op@1';

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

function dirtyGit(sha = ARTIFACT_SHA): () => Promise<GitProvenance> {
  return async () => Object.freeze({ sha, clean: false });
}

function sampleManifest() {
  return validateManifest({
    id: 'fixture-op',
    version: 1,
    title: 'Fixture',
    owner: 'ops',
    kind: 'repair',
    risk: 'low',
    mode: 'atomic',
    recovery: 'reversible',
    recoveryNotes: 'fixture only',
    affectedTables: ['public.demo'],
  });
}

type HandlerState = {
  planCalls: number;
  executeCalls: number;
  verifyCalls: number;
  externalCalls: number;
  eligibleRows: string;
  affectedRows: string;
  verifyResult: boolean;
};

function createFixtureOperation(
  overrides: Partial<HandlerState> = {},
): RegisteredAtomicOperation {
  const state: HandlerState = {
    planCalls: 0,
    executeCalls: 0,
    verifyCalls: 0,
    externalCalls: 0,
    eligibleRows: '1',
    affectedRows: '1',
    verifyResult: true,
    ...overrides,
  };

  return freezeRegisteredOperation({
    manifest: sampleManifest(),
    async plan(query) {
      state.planCalls += 1;
      await query('SELECT 1', []);
      return { eligibleRows: state.eligibleRows };
    },
    async execute(query) {
      state.executeCalls += 1;
      await query('SELECT 1', []);
      return { affectedRows: state.affectedRows };
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
  commitCallCount: number;
  insertAllowed: boolean;
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
    connectCalls: number;
    endCalls: number;
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
    commitCallCount: 0,
    insertAllowed: overrides.insertAllowed ?? true,
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
      if (sql === SQL_INSERT_EXECUTION && !state.insertAllowed) {
        throw new Error(`insert denied ${SECRET}`);
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
      if (sql === SQL_UPDATE_EXECUTION_CHECKPOINT) {
        if (state.updateRowCount === 1 && state.executionRow !== undefined) {
          state.executionRow = {
            ...state.executionRow,
            state: values?.[6],
            processed: values?.[8],
          };
        }
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

test('same key and SHA returns noop without re-executing', async () => {
  const operation = createFixtureOperation();
  const client = createSessionClient({
    executionRow: {
      operation_key: OPERATION_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'dev@local',
      state: 'succeeded',
      checkpoint: '0',
      processed: '1',
    },
  });

  const receipt = await executeAtomicRun(
    operation,
    {
      targetId: TARGET_ID,
      confirmTarget: confirmLabel(),
      actor: 'dev@local',
    },
    client,
    target(),
    { gitProvenance: cleanGit() },
  );

  assert.equal(receipt.outcome, 'noop');
  assert.equal(
    client.state.queries.some((entry) => entry.sql === SQL_INSERT_EXECUTION),
    false,
  );
});

test('changed SHA refuses even when version unchanged', async () => {
  const operation = createFixtureOperation();
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
      executeAtomicRun(
        operation,
        {
          targetId: TARGET_ID,
          confirmTarget: confirmLabel(),
          actor: 'dev@local',
        },
        client,
        target(),
        { gitProvenance: cleanGit() },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AtomicOperationError);
      assert.match((error as Error).message, /artifact SHA/);
      return true;
    },
  );
});

test('false verify rolls back without durable success row', async () => {
  const operation = createFixtureOperation({ verifyResult: false });
  const client = createSessionClient();

  await assert.rejects(
    () =>
      executeAtomicRun(
        operation,
        {
          targetId: TARGET_ID,
          confirmTarget: confirmLabel(),
          actor: 'dev@local',
        },
        client,
        target(),
        { gitProvenance: cleanGit() },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AtomicOperationError);
      assert.match((error as Error).message, /verify/);
      return true;
    },
  );

  assert.equal(
    client.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    1,
  );
  assert.equal(
    client.state.queries.some(
      (entry) => entry.sql === SQL_UPDATE_EXECUTION_CHECKPOINT,
    ),
    false,
  );
  const message = redactAtomicError(new AtomicOperationError('verify failed'));
  assert.match(message, /verification failed/);
  assertNoSecrets(message);
});

test('count limits refuse oversized plan and execute', async () => {
  const operation = createFixtureOperation({ eligibleRows: '1001' });
  const client = createSessionClient();

  await assert.rejects(
    () =>
      executeAtomicRun(
        operation,
        {
          targetId: TARGET_ID,
          confirmTarget: confirmLabel(),
          actor: 'dev@local',
        },
        client,
        target(),
        { gitProvenance: cleanGit() },
      ),
    /exceeds maximum/,
  );

  const overExecute = createFixtureOperation({
    eligibleRows: '2',
    affectedRows: '3',
  });
  await assert.rejects(
    () =>
      executeAtomicRun(
        overExecute,
        {
          targetId: TARGET_ID,
          confirmTarget: confirmLabel(),
          actor: 'dev@local',
        },
        createSessionClient(),
        target(),
        { gitProvenance: cleanGit() },
      ),
    /exceeds planned/,
  );
});

test('dirty git tree refuses before session connect', async () => {
  const operation = createFixtureOperation();
  const client = createSessionClient();

  await assert.rejects(
    () =>
      executeAtomicRun(
        operation,
        {
          targetId: TARGET_ID,
          confirmTarget: confirmLabel(),
          actor: 'dev@local',
        },
        client,
        target(),
        { gitProvenance: dirtyGit() },
      ),
    (error: unknown) => {
      assert.ok(error instanceof AtomicOperationError);
      assert.match((error as Error).message, /clean/);
      return true;
    },
  );

  assert.equal(client.state.connectCalls, 0);
  await assert.rejects(() => assertCleanGitProvenance(dirtyGit()), /clean/);
});

test('wrong target refuses after marker check', async () => {
  const operation = createFixtureOperation();
  const client = createSessionClient({
    markerTargetId: '33333333-3333-4333-8333-333333333333',
  });

  await assert.rejects(
    () => executeAtomicPlan(operation, TARGET_ID, client, target()),
    (error: unknown) => {
      assert.ok(error instanceof SessionError || error instanceof Error);
      return true;
    },
  );
  assert.equal(client.state.endCalls, 1);
});

test('operation handlers only use injected query function', async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    fetchCalls += 1;
    return Promise.resolve(new Response());
  }) as typeof fetch;

  try {
    const operation = createFixtureOperation();
    const client = createSessionClient();
    await executeAtomicPlan(operation, TARGET_ID, client, target());
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unknown commit never replays automatically', async () => {
  const operation = createFixtureOperation();
  const client = createSessionClient({ commitThrows: true });

  await assert.rejects(
    () =>
      executeAtomicRun(
        operation,
        {
          targetId: TARGET_ID,
          confirmTarget: confirmLabel(),
          actor: 'dev@local',
        },
        client,
        target(),
        { gitProvenance: cleanGit() },
      ),
    LedgerOutcomeUnknownError,
  );

  assert.equal(client.state.commitCallCount, 1);
  assert.equal(
    client.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    0,
  );
  const message = redactAtomicError(new LedgerOutcomeUnknownError());
  assert.match(message, /inspect/);
});

test('run CLI refuses unregistered operation before connect', async () => {
  let factoryCalls = 0;
  const deps: RunCliDeps & { stderrText: () => string } = {
    stdout: { write: () => undefined },
    stderr: { write: () => undefined },
    stderrText: () => '',
    gitProvenance: cleanGit(),
    createClient: () => {
      factoryCalls += 1;
      return createSessionClient();
    },
  };
  const stderrChunks: string[] = [];
  deps.stderr = { write: (chunk) => stderrChunks.push(chunk) };
  deps.stderrText = () => stderrChunks.join('');

  const code = await runCli(
    [
      'run',
      OPERATION_KEY,
      '--target-id',
      TARGET_ID,
      '--confirm-target',
      confirmLabel(),
      '--actor',
      'dev@local',
    ],
    validEnv(),
    deps,
  );

  assert.equal(code, 1);
  assert.match(deps.stderrText(), /unknown operation|unregistered/);
  assert.equal(factoryCalls, 0);
});

test('parseCliArguments accepts plan and run options', () => {
  const plan = parseCliArguments([
    'plan',
    OPERATION_KEY,
    '--target-id',
    TARGET_ID,
    '--json',
  ]);
  assert.equal(plan.ok, true);

  const run = parseCliArguments([
    'run',
    OPERATION_KEY,
    '--target-id',
    TARGET_ID,
    '--confirm-target',
    confirmLabel(),
    '--actor',
    'dev',
  ]);
  assert.equal(run.ok, true);
});
