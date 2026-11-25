import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCliArguments } from '../src/arguments.js';
import type { GitProvenance } from '../src/execution/atomic.js';
import {
  BatchedOperationError,
  freezeRegisteredBatchedOperation,
  freezeRegisteredOperation,
  MAX_BATCH_SIZE,
  type RegisteredAtomicOperation,
  type RegisteredBatchedOperation,
} from '../src/execution/operation.js';
import { redactCliError, runCli, type RunCliDeps } from '../src/cli.js';
import {
  SESSION_CHECK_SQL,
  type SessionClient,
} from '../src/execution/session.js';
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
import { validateManifest } from '../src/contract.js';
import { parseTarget, targetLabel, toTargetDisplay } from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';
const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ARTIFACT_SHA = 'a'.repeat(40);
const BATCH_KEY = 'fixture-batch@1';
const ATOMIC_KEY = 'fixture-atomic@1';

function validEnv(): Record<string, string | undefined> {
  return {
    DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/${DATABASE}`,
  };
}

function target() {
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

function atomicManifest() {
  return validateManifest({
    id: 'fixture-atomic',
    version: 1,
    title: 'Fixture atomic',
    owner: 'ops',
    kind: 'repair',
    risk: 'low',
    mode: 'atomic',
    recovery: 'reversible',
    recoveryNotes: 'fixture only',
    affectedTables: ['public.demo'],
  });
}

function createBatchedOperation(
  batches: Array<
    Readonly<{ lastId: bigint; affectedRows: bigint; done: boolean }>
  > = [
    { lastId: 5n, affectedRows: 5n, done: false },
    { lastId: 10n, affectedRows: 5n, done: true },
  ],
): RegisteredBatchedOperation {
  let batchIndex = 0;
  return freezeRegisteredBatchedOperation({
    manifest: batchedManifest(),
    async plan(query) {
      await query('SELECT 1', []);
      return { eligibleRows: '10' };
    },
    async nextBatch(query, afterId) {
      await query('SELECT 1', []);
      const entry = batches[batchIndex];
      batchIndex += 1;
      if (entry === undefined) {
        throw new Error('unexpected batch');
      }
      void afterId;
      return entry;
    },
    async verify(query) {
      await query('SELECT 1', []);
      return true;
    },
  });
}

function createAtomicOperation(): RegisteredAtomicOperation {
  return freezeRegisteredOperation({
    manifest: atomicManifest(),
    async plan(query) {
      await query('SELECT 1', []);
      return { eligibleRows: '1' };
    },
    async execute(query) {
      await query('SELECT 1', []);
      return { affectedRows: '1' };
    },
    async verify(query) {
      await query('SELECT 1', []);
      return true;
    },
  });
}

type FakeQueryState = {
  executionRow: Record<string, unknown> | undefined;
  updateRowCount: number;
};

function createSessionClient(
  overrides: Partial<FakeQueryState> = {},
): SessionClient {
  const state: FakeQueryState = {
    executionRow:
      overrides.executionRow === undefined ? undefined : overrides.executionRow,
    updateRowCount: overrides.updateRowCount ?? 1,
  };

  return {
    async connect() {},
    async end() {},
    async query(sql, values) {
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
      return { rows: [], rowCount: null };
    },
  };
}

function assertNoSecrets(text: string): void {
  assert.equal(text.includes(SECRET), false);
  assert.equal(/postgres(?:ql)?:\/\//i.test(text), false);
}

function registryFor(
  batched?: RegisteredBatchedOperation,
  atomic?: RegisteredAtomicOperation,
): NonNullable<RunCliDeps['registry']> {
  const batchedManifest = batched?.manifest;
  const atomicManifestValue = atomic?.manifest;
  return {
    lookupManifest: (key) => {
      if (batchedManifest !== undefined && key === BATCH_KEY) {
        return batchedManifest;
      }
      if (atomicManifestValue !== undefined && key === ATOMIC_KEY) {
        return atomicManifestValue;
      }
      return undefined;
    },
    lookupAtomic: (key) =>
      key === ATOMIC_KEY && atomic !== undefined ? atomic : undefined,
    lookupBatched: (key) =>
      key === BATCH_KEY && batched !== undefined ? batched : undefined,
  };
}

function captureDeps(
  batched?: RegisteredBatchedOperation,
  atomic?: RegisteredAtomicOperation,
  client?: SessionClient,
): RunCliDeps & { stdoutText: () => string; stderrText: () => string } {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  return {
    stdout: { write: (chunk) => stdoutChunks.push(chunk) },
    stderr: { write: (chunk) => stderrChunks.push(chunk) },
    stdoutText: () => stdoutChunks.join(''),
    stderrText: () => stderrChunks.join(''),
    gitProvenance: cleanGit(),
    createClient: () => client ?? createSessionClient(),
    registry: registryFor(batched, atomic),
  };
}

test('parseCliArguments validates batch flags and resume', () => {
  const resume = parseCliArguments([
    'resume',
    BATCH_KEY,
    '--target-id',
    TARGET_ID,
    '--confirm-target',
    confirmLabel(),
    '--actor',
    'dev@local',
    '--batch-size',
    '50',
    '--max-batches',
    '3',
  ]);
  assert.equal(resume.ok, true);
  if (resume.ok) {
    assert.equal(resume.command.kind, 'resume');
    assert.equal(resume.command.batchSize, 50);
    assert.equal(resume.command.maxBatches, 3);
  }

  const duplicate = parseCliArguments([
    'run',
    BATCH_KEY,
    '--target-id',
    TARGET_ID,
    '--confirm-target',
    confirmLabel(),
    '--actor',
    'dev@local',
    '--batch-size',
    '10',
    '--batch-size',
    '20',
  ]);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.match(duplicate.message, /duplicate option: --batch-size/);
  }

  const planRejectsBatch = parseCliArguments([
    'plan',
    BATCH_KEY,
    '--target-id',
    TARGET_ID,
    '--batch-size',
    '10',
  ]);
  assert.equal(planRejectsBatch.ok, false);
  if (!planRejectsBatch.ok) {
    assert.match(planRejectsBatch.message, /unknown option/);
  }

  const nonInteger = parseCliArguments([
    'run',
    BATCH_KEY,
    '--target-id',
    TARGET_ID,
    '--confirm-target',
    confirmLabel(),
    '--actor',
    'dev@local',
    '--batch-size',
    '10x',
  ]);
  assert.equal(nonInteger.ok, false);
});

test('run refuses dispatch bounds on atomic operations before connect', async () => {
  const atomic = createAtomicOperation();
  const deps = captureDeps(undefined, atomic);
  const code = await runCli(
    [
      'run',
      ATOMIC_KEY,
      '--target-id',
      TARGET_ID,
      '--confirm-target',
      confirmLabel(),
      '--actor',
      'dev@local',
      '--batch-size',
      '10',
    ],
    validEnv(),
    deps,
  );
  assert.equal(code, 1);
  assert.match(
    deps.stderrText(),
    /dispatch bounds apply only to batched operations/,
  );
});

test('resume refuses atomic mode before connect', async () => {
  const atomic = createAtomicOperation();
  const deps = captureDeps(undefined, atomic);
  const code = await runCli(
    [
      'resume',
      ATOMIC_KEY,
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
  assert.match(deps.stderrText(), /resume applies only to batched operations/);
});

test('resume refuses when no execution exists', async () => {
  const batched = createBatchedOperation();
  const deps = captureDeps(batched);
  const code = await runCli(
    [
      'resume',
      BATCH_KEY,
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
  assert.match(deps.stderrText(), /batched operation refused/);
  assertNoSecrets(deps.stderrText());
});

test('run refuses out-of-range batch-size with redacted stderr', async () => {
  const batched = createBatchedOperation();
  const deps = captureDeps(batched);
  const code = await runCli(
    [
      'run',
      BATCH_KEY,
      '--target-id',
      TARGET_ID,
      '--confirm-target',
      confirmLabel(),
      '--actor',
      'dev@local',
      '--batch-size',
      String(MAX_BATCH_SIZE + 1),
    ],
    validEnv(),
    deps,
  );
  assert.equal(code, 1);
  assert.match(deps.stderrText(), /batched operation refused/);
  assertNoSecrets(deps.stderrText());
  assertNoSecrets(
    redactCliError(new BatchedOperationError('verify returned false')),
  );
});

test('batched run pause and resume print human and JSON receipts', async () => {
  const batched = createBatchedOperation();
  const client = createSessionClient();
  const deps = captureDeps(batched, undefined, client);

  const pausedCode = await runCli(
    [
      'run',
      BATCH_KEY,
      '--target-id',
      TARGET_ID,
      '--confirm-target',
      confirmLabel(),
      '--actor',
      'dev@local',
      '--max-batches',
      '1',
    ],
    validEnv(),
    deps,
  );
  assert.equal(pausedCode, 0);
  assert.match(deps.stdoutText(), /paused checkpoint=5 processed=5/);
  assertNoSecrets(deps.stdoutText());

  const pausedRow = {
    operation_key: BATCH_KEY,
    artifact_sha: ARTIFACT_SHA,
    run_id: RUN_ID,
    actor: 'dev@local',
    state: 'paused',
    checkpoint: '5',
    processed: '5',
  };
  const resumeOperation = createBatchedOperation([
    { lastId: 10n, affectedRows: 5n, done: true },
  ]);
  const resumeClient = createSessionClient({ executionRow: pausedRow });
  const resumeDeps = captureDeps(resumeOperation, undefined, resumeClient);

  const resumeHuman = await runCli(
    [
      'resume',
      BATCH_KEY,
      '--target-id',
      TARGET_ID,
      '--confirm-target',
      confirmLabel(),
      '--actor',
      'dev@local',
    ],
    validEnv(),
    resumeDeps,
  );
  assert.equal(resumeHuman, 0);
  assert.match(resumeDeps.stdoutText(), /succeeded checkpoint=10 processed=10/);

  const jsonDeps = captureDeps(
    createBatchedOperation([{ lastId: 10n, affectedRows: 5n, done: true }]),
    undefined,
    createSessionClient({ executionRow: { ...pausedRow, state: 'paused' } }),
  );
  const jsonCode = await runCli(
    [
      'resume',
      BATCH_KEY,
      '--target-id',
      TARGET_ID,
      '--confirm-target',
      confirmLabel(),
      '--actor',
      'dev@local',
      '--json',
    ],
    validEnv(),
    jsonDeps,
  );
  assert.equal(jsonCode, 0);
  const payload = JSON.parse(jsonDeps.stdoutText().trim()) as {
    outcome: string;
    checkpoint: string;
    processed: string;
  };
  assert.equal(payload.outcome, 'succeeded');
  assert.equal(payload.checkpoint, '10');
  assert.equal(payload.processed, '10');
  assertNoSecrets(jsonDeps.stdoutText());
});

test('batched status prints decimal checkpoint and processed', async () => {
  const batched = createBatchedOperation();
  const client = createSessionClient({
    executionRow: {
      operation_key: BATCH_KEY,
      artifact_sha: ARTIFACT_SHA,
      run_id: RUN_ID,
      actor: 'dev@local',
      state: 'paused',
      checkpoint: '42',
      processed: '99',
    },
  });
  const deps = captureDeps(batched, undefined, client);
  const code = await runCli(
    ['status', BATCH_KEY, '--target-id', TARGET_ID],
    validEnv(),
    deps,
  );
  assert.equal(code, 0);
  assert.match(deps.stdoutText(), /state=paused checkpoint=42 processed=99/);
});
