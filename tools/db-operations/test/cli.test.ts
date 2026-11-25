import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCliArguments } from '../src/arguments.js';
import {
  CLI_HELP_TEXT,
  SESSION_CHECK_SQL,
  redactCliError,
  runCli,
  type ClientLike,
  type RunCliDeps,
} from '../src/cli.js';
import { TargetParseError, parseTarget } from '../src/target.js';

const SECRET = 'hunter2';
const ROLE = 'ops_admin';
const DATABASE = 'offscreen_dev';

function validEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@127.0.0.1:5433/${DATABASE}`,
    ...overrides,
  };
}

function createCaptureDeps(
  createClient?: RunCliDeps['createClient'],
): RunCliDeps & {
  stdoutText: () => string;
  stderrText: () => string;
} {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const deps: RunCliDeps & {
    stdoutText: () => string;
    stderrText: () => string;
  } = {
    stdout: { write: (chunk) => stdoutChunks.push(chunk) },
    stderr: { write: (chunk) => stderrChunks.push(chunk) },
    stdoutText: () => stdoutChunks.join(''),
    stderrText: () => stderrChunks.join(''),
  };
  if (createClient !== undefined) {
    deps.createClient = createClient;
  }
  return deps;
}

function assertNoSecrets(text: string, secret = SECRET): void {
  assert.equal(text.includes(secret), false);
  assert.equal(/postgres(?:ql)?:\/\//i.test(text), false);
}

function createFakeClient(
  options: Readonly<{
    onQuery?: (sql: string) => void;
    queryImpl?: ClientLike['query'];
    connectThrows?: Error;
    endThrows?: boolean;
  }> = {},
): ClientLike & {
  connectCalls: number;
  endCalls: number;
  queries: string[];
} {
  const state = {
    connectCalls: 0,
    endCalls: 0,
    queries: [] as string[],
  };

  return {
    get connectCalls() {
      return state.connectCalls;
    },
    get endCalls() {
      return state.endCalls;
    },
    get queries() {
      return state.queries;
    },
    async connect() {
      state.connectCalls += 1;
      if (options.connectThrows !== undefined) {
        throw options.connectThrows;
      }
    },
    async query(sql) {
      state.queries.push(sql);
      options.onQuery?.(sql);
      if (options.queryImpl !== undefined) {
        return options.queryImpl(sql);
      }
      if (sql === SESSION_CHECK_SQL) {
        return {
          rows: [
            {
              database: DATABASE,
              role: ROLE,
              recovery: false,
            },
          ],
        };
      }
      return { rows: [] };
    },
    async end() {
      state.endCalls += 1;
      if (options.endThrows === true) {
        throw new Error(`close failed ${SECRET}`);
      }
    },
  };
}

test('parseCliArguments rejects unknown, duplicate, and URL positionals', () => {
  const unknown = parseCliArguments(['wat']);
  assert.equal(unknown.ok, false);
  if (!unknown.ok) {
    assert.equal(unknown.exitCode, 2);
    assert.match(unknown.message, /unknown command/);
  }

  const duplicate = parseCliArguments(['list', '--json', '--json']);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.match(duplicate.message, /duplicate option/);
  }

  const urlPositional = parseCliArguments([
    'inspect',
    validEnv().DB_OPS_URL ?? '',
  ]);
  assert.equal(urlPositional.ok, false);
  if (!urlPositional.ok) {
    assert.match(urlPositional.message, /positional database URL refused/);
  }
});

test('help and list perform zero client connections', async () => {
  let factoryCalls = 0;
  const deps = createCaptureDeps(() => {
    factoryCalls += 1;
    return createFakeClient();
  });

  assert.equal(await runCli(['help'], {}, deps), 0);
  assert.match(deps.stdoutText(), /offscreen database operations/);

  const listDeps = createCaptureDeps(() => createFakeClient());
  assert.equal(await runCli(['list'], {}, listDeps), 0);
  assert.equal(listDeps.stdoutText(), '');

  const listJsonDeps = createCaptureDeps(() => createFakeClient());
  assert.equal(await runCli(['list', '--json'], {}, listJsonDeps), 0);
  assert.equal(listJsonDeps.stdoutText(), '[]\n');

  assert.equal(factoryCalls, 0);
});

test('inspect missing operation refuses before connection', async () => {
  let factoryCalls = 0;
  const deps = createCaptureDeps(() => {
    factoryCalls += 1;
    return createFakeClient();
  });

  const code = await runCli(['inspect', 'missing-op@1'], validEnv(), deps);
  assert.equal(code, 1);
  assert.match(deps.stderrText(), /unknown operation/);
  assertNoSecrets(deps.stderrText());
  assert.equal(factoryCalls, 0);
});

test('target runs BEGIN READ ONLY, session check, and ROLLBACK', async () => {
  const fake = createFakeClient();
  const deps = createCaptureDeps(() => fake);

  const code = await runCli(['target'], validEnv(), deps);
  assert.equal(code, 0);
  assert.equal(fake.connectCalls, 1);
  assert.equal(fake.endCalls, 1);
  assert.deepEqual(fake.queries, [
    'BEGIN READ ONLY',
    SESSION_CHECK_SQL,
    'ROLLBACK',
  ]);
  assert.match(deps.stdoutText(), new RegExp(`${DATABASE}@${ROLE}`));
  assertNoSecrets(deps.stdoutText());
  assertNoSecrets(deps.stderrText());
});

test('target failure still closes the client once', async () => {
  const fake = createFakeClient({
    queryImpl: async (sql) => {
      if (sql === 'BEGIN READ ONLY') {
        throw new Error(`query failed with password ${SECRET}`);
      }
      return { rows: [] };
    },
  });
  const deps = createCaptureDeps(() => fake);

  const code = await runCli(['target'], validEnv(), deps);
  assert.equal(code, 1);
  assert.equal(fake.connectCalls, 1);
  assert.equal(fake.endCalls, 1);
  assertNoSecrets(deps.stderrText());
  assert.equal(deps.stderrText().trim(), 'database operations failed');
});

test('invalid usage returns exit code 2 without connecting', async () => {
  let factoryCalls = 0;
  const deps = createCaptureDeps(() => {
    factoryCalls += 1;
    return createFakeClient();
  });

  assert.equal(await runCli(['inspect'], {}, deps), 2);
  assert.equal(factoryCalls, 0);
});

test('redactCliError never includes credentials from parse failures', async () => {
  assert.throws(
    () =>
      parseTarget({
        DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@example.com:1/${DATABASE}`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof TargetParseError);
      const message = redactCliError(error);
      assert.equal(message, 'invalid database operations target');
      assertNoSecrets(message);
      return true;
    },
  );

  const deps = createCaptureDeps(() => createFakeClient());
  const code = await runCli(
    ['target'],
    {
      DB_OPS_URL: `postgresql://${ROLE}:${SECRET}@example.com:1/${DATABASE}`,
    },
    deps,
  );
  assert.equal(code, 1);
  assertNoSecrets(deps.stderrText());
});

test('help text stays in sync with CLI_HELP_TEXT export', () => {
  assert.match(CLI_HELP_TEXT, /inspect <id@version>/);
});
