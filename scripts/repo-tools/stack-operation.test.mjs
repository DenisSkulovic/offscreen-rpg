import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runPlannedCommand } from './stack.mjs';
import { runTrackedEntrypoint } from '../../infra/monitoring/operation-entrypoint.mjs';
import { readInfraPinFiles } from './stack-preflight.mjs';

function tempStateRoot() {
  return mkdtempSync(join(tmpdir(), 'offscreen-monitor-'));
}

function readOperationRecords(stateRoot) {
  return readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) => JSON.parse(readFileSync(join(stateRoot, entry.name), 'utf8')));
}

function probesOk() {
  const pins = readInfraPinFiles();
  return {
    commandsPresent: { docker: true, kind: true, kubectl: true },
    dockerDaemonOk: true,
    currentContext: 'kind-offscreen-release',
    ownedClusterExists: false,
    memAvailableKib: 4_194_304,
    apiPort: { occupied: false, ownedByCluster: false },
    kindYamlText: pins.kindYamlText,
    libShText: pins.libShText,
  };
}

test('stack up success records operation end', () => {
  const stateRoot = tempStateRoot();
  runTrackedEntrypoint(
    'stack.up',
    () => {
      const planned = runPlannedCommand(
        'up',
        {
          probes: probesOk(),
          observation: { clusterPresent: false, migration: 'absent', importRoots: null },
        },
        () => ({ status: 0, stdout: '', stderr: '' }),
      );
      return {
        exitCode: planned.exitCode ?? 0,
        refused: planned.exitCode === 2,
      };
    },
    { stateRoot, skipGit: true },
  );
  const records = readOperationRecords(stateRoot);
  assert.ok(records.some((record) => record.operation.event === 'end'));
  rmSync(stateRoot, { recursive: true, force: true });
});

test('stack down refusal records refused terminal operation', () => {
  const stateRoot = tempStateRoot();
  runTrackedEntrypoint(
    'stack.down',
    () => ({ exitCode: 2, refused: true }),
    { stateRoot, skipGit: true },
  );
  const records = readOperationRecords(stateRoot);
  const failure = records.find((record) => record.operation.event === 'failure');
  assert.equal(failure.operation.result, 'refused');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('stack child operation inherits parent id', () => {
  const stateRoot = tempStateRoot();
  const parentId = '44444444-4444-4444-8444-444444444444';
  const previous = process.env.OFFSCREEN_MONITOR_OPERATION_ID;
  process.env.OFFSCREEN_MONITOR_OPERATION_ID = parentId;
  try {
    runTrackedEntrypoint('stack.down', () => ({ exitCode: 0 }), { stateRoot, skipGit: true });
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

test('disabled monitor leaves stack planned command outcome unchanged', () => {
  const planned = runPlannedCommand(
    'down',
    {
      probes: probesOk(),
      observation: { clusterPresent: false, migration: 'absent', importRoots: null },
      confirmation: 'kind-offscreen-release',
    },
    () => ({ status: 0, stdout: '', stderr: '' }),
  );
  const tracked = runTrackedEntrypoint(
    'stack.down',
    () => ({ exitCode: planned.exitCode ?? 0 }),
    { stateRoot: join(tmpdir(), `missing-${Date.now()}`), disabled: true, existsSync: () => false },
  );
  assert.equal(tracked.exitCode, planned.exitCode ?? 0);
});