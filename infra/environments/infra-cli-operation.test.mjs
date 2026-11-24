import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { dispatchInfraCli, parseInfraCliArgs, runInfraCliArgv } from './infra-cli.mjs';
import { runTrackedEntrypoint } from '../monitoring/operation-entrypoint.mjs';

function tempStateRoot() {
  return mkdtempSync(join(tmpdir(), 'offscreen-monitor-'));
}

function readOperationRecords(stateRoot) {
  return readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) => JSON.parse(readFileSync(join(stateRoot, entry.name), 'utf8')));
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
  const opId = records.find((record) => record.operation.event === 'start')?.operation
    .operationId;
  assert.ok(opId);
  const terminal = records.find(
    (record) =>
      record.operation.operationId === opId &&
      (record.operation.event === 'end' || record.operation.event === 'failure'),
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
  const failure = records.find((record) => record.operation.event === 'failure');
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
  const failure = records.find((record) => record.operation.event === 'failure');
  assert.equal(failure.operation.result, 'failure');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('infra up child operation inherits parent operation id', () => {
  const stateRoot = tempStateRoot();
  const parentId = '33333333-3333-4333-8333-333333333333';
  const previous = process.env.OFFSCREEN_MONITOR_OPERATION_ID;
  process.env.OFFSCREEN_MONITOR_OPERATION_ID = parentId;
  try {
    runTrackedEntrypoint(
      'infra.up.dev',
      () => ({ exitCode: 0 }),
      { stateRoot, skipGit: true },
    );
    const start = readOperationRecords(stateRoot).find(
      (record) => record.operation.event === 'start',
    );
    assert.equal(start.operation.parentOperationId, parentId);
  } finally {
    if (previous === undefined) delete process.env.OFFSCREEN_MONITOR_OPERATION_ID;
    else process.env.OFFSCREEN_MONITOR_OPERATION_ID = previous;
  }
  rmSync(stateRoot, { recursive: true, force: true });
});

test('disabled monitor leaves infra cli dispatch unchanged', () => {
  const previousDisabled = process.env.OFFSCREEN_MONITOR_DISABLED;
  process.env.OFFSCREEN_MONITOR_DISABLED = '1';
  const missingRoot = join(tmpdir(), `offscreen-monitor-missing-${Date.now()}`);
  try {
    const parsed = parseInfraCliArgs(['plan', '--env', 'dev', '--services', 'none']);
    const baseline = dispatchInfraCli(parsed);
    const tracked = runTrackedEntrypoint(
      'infra.up.dev',
      () => ({ exitCode: baseline.exitCode }),
      { stateRoot: missingRoot, disabled: true, skipGit: true },
    );
    assert.equal(tracked.exitCode, baseline.exitCode);
  } finally {
    if (previousDisabled === undefined) delete process.env.OFFSCREEN_MONITOR_DISABLED;
    else process.env.OFFSCREEN_MONITOR_DISABLED = previousDisabled;
  }
});

test('read-only plan path is not wrapped by runInfraCliArgv tracking hook', async () => {
  const stateRoot = tempStateRoot();
  const previousRoot = process.env.OFFSCREEN_MONITOR_STATE_ROOT;
  process.env.OFFSCREEN_MONITOR_STATE_ROOT = stateRoot;
  try {
    const result = runInfraCliArgv(['plan', '--env', 'dev', '--services', 'none'], {
      operationDeps: { skipGit: true },
    });
    assert.equal(result.exitCode, 0);
    assert.equal(readOperationRecords(stateRoot).length, 0);
  } finally {
    if (previousRoot === undefined) delete process.env.OFFSCREEN_MONITOR_STATE_ROOT;
    else process.env.OFFSCREEN_MONITOR_STATE_ROOT = previousRoot;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});