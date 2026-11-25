import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DEV_CLUSTER_CLI,
  dispatchInfraCli,
  parseInfraCliArgs,
  runInfraCliArgv,
  runInfraUp,
} from './infra-cli.mjs';
import { runTrackedEntrypoint } from '../monitoring/operation-entrypoint.mjs';
import { DEV_API_PORT_RANGE } from '../clusters/kind/manager/config.mjs';
import { DEV_CLUSTER_OWNER } from '../clusters/kind/manager/dev-bootstrap.mjs';

function devWarmRun() {
  const port = DEV_API_PORT_RANGE.start;
  return (command, args) => {
    if (command === 'kind' && args[0] === 'get') {
      return { ok: true, stdout: 'offscreen-dev\n' };
    }
    if (command === 'kubectl' && args.includes('config')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          clusters: [
            {
              name: 'kind-offscreen-dev',
              cluster: { server: `https://127.0.0.1:${port}` },
            },
          ],
          contexts: [
            {
              name: 'kind-offscreen-dev',
              context: { cluster: 'kind-offscreen-dev' },
            },
          ],
          'current-context': 'kind-offscreen-dev',
        }),
      };
    }
    if (command === 'kubectl' && args.includes('offscreen-dev-system')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          metadata: {
            name: 'offscreen-dev-system',
            uid: 'ns-uid',
            labels: { 'offscreen.dev/owner': DEV_CLUSTER_OWNER },
          },
        }),
      };
    }
    if (command === 'kubectl' && args.includes('nodes')) {
      return {
        ok: true,
        stdout: JSON.stringify({
          items: [
            { status: { conditions: [{ type: 'Ready', status: 'True' }] } },
          ],
        }),
      };
    }
    return { ok: true, stdout: '', stderr: '' };
  };
}

function tempStateRoot() {
  return mkdtempSync(join(tmpdir(), 'offscreen-monitor-'));
}

function readOperationRecords(stateRoot) {
  return readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) =>
      JSON.parse(readFileSync(join(stateRoot, entry.name), 'utf8')),
    );
}

test('infra up records success terminal operation', () => {
  const stateRoot = tempStateRoot();
  runTrackedEntrypoint(
    'infra.up.dev',
    () => ({
      exitCode: 0,
      refused: false,
    }),
    { stateRoot, skipGit: true },
  );
  const records = readOperationRecords(stateRoot);
  const opId = records.find((record) => record.operation.event === 'start')
    ?.operation.operationId;
  assert.ok(opId);
  const terminal = records.find(
    (record) =>
      record.operation.operationId === opId &&
      (record.operation.event === 'end' ||
        record.operation.event === 'failure'),
  );
  assert.equal(terminal.operation.event, 'end');
  assert.equal(terminal.operation.result, 'success');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('infra up refusal records refused failure event', () => {
  const stateRoot = tempStateRoot();
  runTrackedEntrypoint(
    'infra.up.release',
    () => ({ exitCode: 2, refused: true }),
    { stateRoot, skipGit: true },
  );
  const records = readOperationRecords(stateRoot);
  const failure = records.find(
    (record) => record.operation.event === 'failure',
  );
  assert.equal(failure.operation.result, 'refused');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('infra up failure records failure terminal operation', () => {
  const stateRoot = tempStateRoot();
  runTrackedEntrypoint(
    'infra.up.dev',
    () => ({ exitCode: 1, refused: false }),
    { stateRoot, skipGit: true },
  );
  const records = readOperationRecords(stateRoot);
  const failure = records.find(
    (record) => record.operation.event === 'failure',
  );
  assert.equal(failure.operation.result, 'failure');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('infra up child operation inherits parent operation id', () => {
  const stateRoot = tempStateRoot();
  const parentId = '33333333-3333-4333-8333-333333333333';
  const previous = process.env.OFFSCREEN_MONITOR_OPERATION_ID;
  process.env.OFFSCREEN_MONITOR_OPERATION_ID = parentId;
  try {
    runTrackedEntrypoint('infra.up.dev', () => ({ exitCode: 0 }), {
      stateRoot,
      skipGit: true,
    });
    const start = readOperationRecords(stateRoot).find(
      (record) => record.operation.event === 'start',
    );
    assert.equal(start.operation.parentOperationId, parentId);
  } finally {
    if (previous === undefined)
      delete process.env.OFFSCREEN_MONITOR_OPERATION_ID;
    else process.env.OFFSCREEN_MONITOR_OPERATION_ID = previous;
  }
  rmSync(stateRoot, { recursive: true, force: true });
});

test('disabled monitor leaves infra cli dispatch unchanged', () => {
  const previousDisabled = process.env.OFFSCREEN_MONITOR_DISABLED;
  process.env.OFFSCREEN_MONITOR_DISABLED = '1';
  const missingRoot = join(tmpdir(), `offscreen-monitor-missing-${Date.now()}`);
  try {
    const parsed = parseInfraCliArgs([
      'plan',
      '--env',
      'dev',
      '--services',
      'none',
    ]);
    const baseline = dispatchInfraCli(parsed);
    const tracked = runTrackedEntrypoint(
      'infra.up.dev',
      () => ({ exitCode: baseline.exitCode }),
      { stateRoot: missingRoot, disabled: true, skipGit: true },
    );
    assert.equal(tracked.exitCode, baseline.exitCode);
  } finally {
    if (previousDisabled === undefined)
      delete process.env.OFFSCREEN_MONITOR_DISABLED;
    else process.env.OFFSCREEN_MONITOR_DISABLED = previousDisabled;
  }
});

test('read-only plan path is not wrapped by runInfraCliArgv tracking hook', async () => {
  const stateRoot = tempStateRoot();
  const previousRoot = process.env.OFFSCREEN_MONITOR_STATE_ROOT;
  process.env.OFFSCREEN_MONITOR_STATE_ROOT = stateRoot;
  try {
    const result = runInfraCliArgv(
      ['plan', '--env', 'dev', '--services', 'none'],
      {
        operationDeps: { skipGit: true },
      },
    );
    assert.equal(result.exitCode, 0);
    assert.equal(readOperationRecords(stateRoot).length, 0);
  } finally {
    if (previousRoot === undefined)
      delete process.env.OFFSCREEN_MONITOR_STATE_ROOT;
    else process.env.OFFSCREEN_MONITOR_STATE_ROOT = previousRoot;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('infra up human and json share runner sequence and exit for warm none', () => {
  const runnerCalls = [];
  const runner = (argv) => {
    runnerCalls.push(argv);
    return { ok: true, status: 0 };
  };
  const parsed = parseInfraCliArgs([
    'up',
    '--env',
    'dev',
    '--services',
    'none',
  ]);
  const jsonTracked = dispatchInfraCli(parsed, {
    run: devWarmRun(),
    runner,
  });
  const jsonExit = jsonTracked.exitCode;
  runnerCalls.length = 0;
  const human = runInfraCliArgv(
    ['up', '--env', 'dev', '--services', 'none', '--human'],
    {
      run: devWarmRun(),
      runner,
      io: { write: () => {}, writeError: () => {} },
    },
  );
  assert.equal(human.exitCode, jsonExit);
  assert.deepEqual(runnerCalls, []);
});

test('infra up human progress lines go to stderr only', () => {
  /** @type {string[]} */
  const stdout = [];
  /** @type {string[]} */
  const stderr = [];
  const result = runInfraCliArgv(
    ['up', '--env', 'dev', '--services', 'none', '--human'],
    {
      run: devWarmRun(),
      runner: () => ({ ok: true, status: 0 }),
      io: {
        write: (chunk) => stdout.push(chunk),
        writeError: (chunk) => stderr.push(chunk),
      },
    },
  );
  assert.equal(result.exitCode, 0);
  assert.match(stdout.join(''), /^OFFSCREEN\nPLATFORM/m);
  assert.equal(
    stderr.some((line) => /cluster-verify START \d+ms/.test(line)),
    true,
  );
  assert.equal(
    stdout.some((line) => / START /.test(line)),
    false,
  );
});

test('infra up cluster ensure failure emits no later phase START events', () => {
  /** @type {import('./infra-progress.mjs').InfraProgressEvent[]} */
  const events = [];
  const result = runInfraUp({
    profileId: 'dev',
    services: 'core',
    memoryMiB: 8192,
    run: () => ({ ok: true, stdout: '' }),
    onProgress: (event) => events.push(event),
    runner: (argv) => {
      if (argv.includes(DEV_CLUSTER_CLI)) {
        return { ok: false, status: 1, stderr: 'injected cluster failure' };
      }
      return { ok: true, status: 0 };
    },
  });
  assert.equal(result.ok, false);
  const kindsAfterFail = [];
  let seenFail = false;
  for (const event of events) {
    if (seenFail && event.kind === 'START') {
      kindsAfterFail.push(event.phaseId);
    }
    if (event.kind === 'FAIL') {
      seenFail = true;
    }
  }
  assert.deepEqual(kindsAfterFail, []);
  assert.equal(
    events.some(
      (event) => event.phaseId === 'preflight:target' && event.kind === 'START',
    ),
    false,
  );
});

test('infra up progress callback exceptions do not change exit code', () => {
  const result = runInfraUp({
    profileId: 'dev',
    services: 'none',
    run: devWarmRun(),
    runner: () => ({ ok: true, status: 0 }),
    onProgress: () => {
      throw new Error('injected progress failure');
    },
  });
  assert.equal(result.ok, true);
});

test('infra up tracking unchanged under --human stdout routing', () => {
  const stateRoot = tempStateRoot();
  const previousRoot = process.env.OFFSCREEN_MONITOR_STATE_ROOT;
  process.env.OFFSCREEN_MONITOR_STATE_ROOT = stateRoot;
  /** @type {string[]} */
  const stdout = [];
  try {
    const result = runInfraCliArgv(
      ['up', '--env', 'dev', '--services', 'none', '--human'],
      {
        operationDeps: { skipGit: true },
        run: devWarmRun(),
        runner: () => ({ ok: true, status: 0 }),
        io: {
          write: (chunk) => stdout.push(chunk),
          writeError: () => {},
        },
      },
    );
    assert.equal(result.exitCode, 0);
    const records = readOperationRecords(stateRoot);
    assert.equal(records.length > 0, true);
    assert.match(stdout.join(''), /^OFFSCREEN\nPLATFORM/m);
    const terminal = records.find(
      (record) =>
        record.operation.event === 'end' ||
        record.operation.event === 'failure',
    );
    assert.equal(terminal.operation.event, 'end');
  } finally {
    if (previousRoot === undefined)
      delete process.env.OFFSCREEN_MONITOR_STATE_ROOT;
    else process.env.OFFSCREEN_MONITOR_STATE_ROOT = previousRoot;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});
