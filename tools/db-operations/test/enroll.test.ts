import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCliArguments } from '../src/arguments.js';
import { runCli, type ClientLike, type RunCliDeps } from '../src/cli.js';
import {
  ENROLLMENT_DDL_STATEMENTS,
  SQL_INSERT_IDENTITY,
  SQL_NAMESPACE_ABSENT_CHECK,
  SQL_READ_MARKER,
  SQL_TRY_ADVISORY_XACT_LOCK,
} from '../src/ledger/schema.js';
import {
  EnrollError,
  EnrollOutcomeUnknownError,
  SESSION_CHECK_SQL,
  executeEnroll,
  redactEnrollError,
} from '../src/ledger/enroll.js';
import { parseTarget, targetLabel, toTargetDisplay } from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';
const FIXED_UUID = '11111111-1111-4111-8111-111111111111';

function validEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/${DATABASE}`,
    ...overrides,
  };
}

function targetConfirmLabel(): string {
  const target = parseTarget(validEnv());
  return targetLabel(toTargetDisplay(target));
}

type FakeClientState = {
  connectCalls: number;
  endCalls: number;
  queries: Array<{ sql: string; values?: readonly unknown[] }>;
  ddlExecuted: boolean;
  replayBlocked: boolean;
};

function createFakeEnrollClient(
  options: Readonly<{
    lockAcquired?: boolean;
    namespaceAbsent?: boolean;
    failOnDdlIndex?: number;
    commitThrows?: boolean;
    markerAfterCommit?: boolean;
    onQuery?: (sql: string, values?: readonly unknown[]) => void;
  }> = {},
): ClientLike & { state: FakeClientState } {
  const lockAcquired = options.lockAcquired ?? true;
  const namespaceAbsent = options.namespaceAbsent ?? true;
  const markerAfterCommit = options.markerAfterCommit ?? true;
  const state: FakeClientState = {
    connectCalls: 0,
    endCalls: 0,
    queries: [],
    ddlExecuted: false,
    replayBlocked: false,
  };
  let ddlIndex = 0;

  const client: ClientLike & { state: FakeClientState } = {
    state,
    async connect() {
      state.connectCalls += 1;
    },
    async query(sql, values) {
      state.queries.push(values === undefined ? { sql } : { sql, values });
      options.onQuery?.(sql, values);

      if (sql === SESSION_CHECK_SQL) {
        return {
          rows: [{ database: DATABASE, role: ROLE, recovery: false }],
        };
      }
      if (sql === SQL_TRY_ADVISORY_XACT_LOCK) {
        return { rows: [{ acquired: lockAcquired }] };
      }
      if (sql === SQL_NAMESPACE_ABSENT_CHECK) {
        return { rows: [{ absent: namespaceAbsent }] };
      }
      if (sql === 'COMMIT' && options.commitThrows === true) {
        state.replayBlocked = true;
        throw new Error(`commit transport failed ${SECRET}`);
      }
      if (
        ENROLLMENT_DDL_STATEMENTS.includes(
          sql as (typeof ENROLLMENT_DDL_STATEMENTS)[number],
        )
      ) {
        state.ddlExecuted = true;
        if (options.failOnDdlIndex === ddlIndex) {
          ddlIndex += 1;
          throw new Error(`ddl failed ${SECRET}`);
        }
        ddlIndex += 1;
      }
      if (sql === SQL_INSERT_IDENTITY) {
        state.ddlExecuted = true;
      }
      if (sql === SQL_READ_MARKER && markerAfterCommit) {
        return {
          rows: [
            {
              target_id: FIXED_UUID,
              schema_version: 1,
            },
          ],
        };
      }
      return { rows: [] };
    },
    async end() {
      state.endCalls += 1;
    },
  };

  return client;
}

function createCaptureDeps(
  createClient: NonNullable<RunCliDeps['createClient']>,
): RunCliDeps & {
  stdoutText: () => string;
  stderrText: () => string;
} {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  return {
    stdout: { write: (chunk) => stdoutChunks.push(chunk) },
    stderr: { write: (chunk) => stderrChunks.push(chunk) },
    createClient,
    stdoutText: () => stdoutChunks.join(''),
    stderrText: () => stderrChunks.join(''),
  };
}

function assertNoSecrets(text: string, secret = SECRET): void {
  assert.equal(text.includes(secret), false);
  assert.equal(/postgres(?:ql)?:\/\//i.test(text), false);
}

function sqlSequence(
  queries: Array<{ sql: string; values?: readonly unknown[] }>,
): string[] {
  return queries.map((entry) => entry.sql);
}

test('parseCliArguments accepts enroll --confirm-target label and --json', () => {
  const label = targetConfirmLabel();
  const parsed = parseCliArguments([
    'enroll',
    '--confirm-target',
    label,
    '--json',
  ]);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.command.kind, 'enroll');
    if (parsed.command.kind === 'enroll') {
      assert.equal(parsed.command.confirmTarget, label);
      assert.equal(parsed.command.json, true);
    }
  }
});

test('executeEnroll runs exact SQL ordering on success', async () => {
  const target = parseTarget(validEnv());
  const fake = createFakeEnrollClient();
  const result = await executeEnroll(target, targetConfirmLabel(), fake, {
    randomUuid: () => FIXED_UUID,
  });

  assert.equal(result.targetId, FIXED_UUID);
  assert.equal(result.schemaVersion, 1);
  assert.equal(fake.state.ddlExecuted, true);
  assert.equal(fake.state.endCalls, 1);
  assert.deepEqual(sqlSequence(fake.state.queries), [
    SESSION_CHECK_SQL,
    'BEGIN',
    SQL_TRY_ADVISORY_XACT_LOCK,
    SESSION_CHECK_SQL,
    SQL_NAMESPACE_ABSENT_CHECK,
    ...ENROLLMENT_DDL_STATEMENTS,
    SQL_INSERT_IDENTITY,
    'COMMIT',
    'BEGIN READ ONLY',
    SQL_READ_MARKER,
    'ROLLBACK',
  ]);
  const insertQuery = fake.state.queries.find(
    (entry) => entry.sql === SQL_INSERT_IDENTITY,
  );
  assert.deepEqual(insertQuery?.values, [FIXED_UUID]);
});

test('wrong confirm-target refuses with zero DDL', async () => {
  const target = parseTarget(validEnv());
  const fake = createFakeEnrollClient();

  await assert.rejects(
    () => executeEnroll(target, '127.0.0.1:5433/wrong-db@ops_admin', fake),
    (error: unknown) => {
      assert.ok(error instanceof EnrollError);
      assert.match((error as Error).message, /confirm-target/);
      return true;
    },
  );

  assert.equal(fake.state.connectCalls, 0);
  assert.equal(fake.state.ddlExecuted, false);
  assert.equal(fake.state.queries.length, 0);
});

test('busy advisory lock rolls back without DDL', async () => {
  const target = parseTarget(validEnv());
  const fake = createFakeEnrollClient({ lockAcquired: false });

  await assert.rejects(
    () => executeEnroll(target, targetConfirmLabel(), fake),
    (error: unknown) => {
      assert.ok(error instanceof EnrollError);
      assert.match((error as Error).message, /advisory lock busy/);
      return true;
    },
  );

  assert.equal(fake.state.ddlExecuted, false);
  assert.equal(
    fake.state.queries.some(
      (entry) => entry.sql === ENROLLMENT_DDL_STATEMENTS[0],
    ),
    false,
  );
  assert.equal(fake.state.queries.at(-1)?.sql, 'ROLLBACK');
});

test('existing offscreen_ops namespace refuses without schema DDL', async () => {
  const target = parseTarget(validEnv());
  const fake = createFakeEnrollClient({ namespaceAbsent: false });

  await assert.rejects(
    () => executeEnroll(target, targetConfirmLabel(), fake),
    (error: unknown) => {
      assert.ok(error instanceof EnrollError);
      assert.match((error as Error).message, /already enrolled/);
      return true;
    },
  );

  assert.equal(fake.state.ddlExecuted, false);
  assert.equal(
    fake.state.queries.some(
      (entry) => entry.sql === ENROLLMENT_DDL_STATEMENTS[0],
    ),
    false,
  );
  assert.equal(fake.state.queries.at(-1)?.sql, 'ROLLBACK');
});

test('DDL failure rolls back and closes once', async () => {
  const target = parseTarget(validEnv());
  const fake = createFakeEnrollClient({ failOnDdlIndex: 1 });

  await assert.rejects(
    () => executeEnroll(target, targetConfirmLabel(), fake),
    /ddl failed/,
  );

  assert.equal(fake.state.endCalls, 1);
  assert.equal(
    fake.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    1,
  );
  assert.equal(
    fake.state.queries.some((entry) => entry.sql === 'COMMIT'),
    false,
  );
});

test('commit response loss blocks replay and reports unknown outcome', async () => {
  const target = parseTarget(validEnv());
  const fake = createFakeEnrollClient({ commitThrows: true });

  await assert.rejects(
    () => executeEnroll(target, targetConfirmLabel(), fake),
    EnrollOutcomeUnknownError,
  );

  assert.equal(fake.state.replayBlocked, true);
  assert.equal(fake.state.endCalls, 1);
  assert.equal(
    fake.state.queries.filter((entry) => entry.sql === 'COMMIT').length,
    1,
  );
  assert.equal(
    fake.state.queries.some((entry) => entry.sql === SQL_READ_MARKER),
    false,
  );
  assert.equal(
    fake.state.queries.filter((entry) => entry.sql === 'ROLLBACK').length,
    0,
  );

  const message = redactEnrollError(new EnrollOutcomeUnknownError());
  assert.match(message, /inspect target marker manually/);
  assertNoSecrets(message);
});

test('runCli enroll success emits json without secrets', async () => {
  const fake = createFakeEnrollClient();
  const deps = createCaptureDeps(() => fake);
  const label = targetConfirmLabel();

  const code = await runCli(
    ['enroll', '--confirm-target', label, '--json'],
    validEnv(),
    deps,
  );
  assert.equal(code, 0);
  const payload = JSON.parse(deps.stdoutText()) as {
    targetId: string;
    schemaVersion: number;
    label: string;
  };
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.label, label);
  assert.equal(payload.targetId, FIXED_UUID);
  assertNoSecrets(deps.stdoutText());
  assertNoSecrets(deps.stderrText());
});
