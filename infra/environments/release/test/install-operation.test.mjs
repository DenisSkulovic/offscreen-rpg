import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, readdirSync, readFileSync as readBytes, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  beginShellOperation,
  emitTerminalOperation,
} from '../../../monitoring/operation-entrypoint.mjs';

const RELEASE_DIR = dirname(fileURLToPath(import.meta.url));

function tempStateRoot() {
  return mkdtempSync(join(tmpdir(), 'offscreen-monitor-'));
}

function readOperationRecords(stateRoot) {
  return readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) => JSON.parse(readBytes(join(stateRoot, entry.name), 'utf8')));
}

test('install.sh wires operation begin/end bridge without raw args', () => {
  const source = readFileSync(join(RELEASE_DIR, '../install.sh'), 'utf8');
  assert.match(source, /OPERATION_ENTRYPOINT.*begin release\.install/);
  assert.match(source, /OPERATION_ENTRYPOINT.*end/);
  assert.doesNotMatch(source, /persist.*\$[@*]/);
});

test('release install resolves object storage binding before render', () => {
  const source = readFileSync(join(RELEASE_DIR, '../install.sh'), 'utf8');
  assert.ok(
    source.indexOf('resolve_release_object_storage_binding') <
      source.indexOf('render_release_section migration'),
  );
  assert.match(source, /OFFSCREEN_RELEASE_OBJECT_STORAGE_BINDING/);
  assert.match(source, /chmod 0600 "\$\{OBJECT_STORAGE_BINDING\}"/);
  assert.ok(source.includes('binding.mjs" render'));
});

test('release install shell bridge records success span', () => {
  const stateRoot = tempStateRoot();
  const repoRoot = join(RELEASE_DIR, '../../..');
  const started = beginShellOperation('release.install', { repoRoot }, { stateRoot, skipGit: true });
  assert.ok(started);
  emitTerminalOperation(started.name, started.operationId, 0, { repoRoot }, { stateRoot });
  const records = readOperationRecords(stateRoot);
  assert.ok(records.some((record) => record.operation.event === 'start'));
  assert.ok(records.some((record) => record.operation.event === 'end'));
  rmSync(stateRoot, { recursive: true, force: true });
});

test('release install refusal records refused failure', () => {
  const stateRoot = tempStateRoot();
  const repoRoot = join(RELEASE_DIR, '../../..');
  const started = beginShellOperation('release.install', { repoRoot }, { stateRoot, skipGit: true });
  assert.ok(started);
  emitTerminalOperation(
    started.name,
    started.operationId,
    2,
    { refused: true, repoRoot },
    { stateRoot },
  );
  const failure = readOperationRecords(stateRoot).find(
    (record) => record.operation.event === 'failure',
  );
  assert.equal(failure.operation.result, 'refused');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('release install child inherits parent operation id', () => {
  const stateRoot = tempStateRoot();
  const parentId = '55555555-5555-4555-8555-555555555555';
  const previous = process.env.OFFSCREEN_MONITOR_OPERATION_ID;
  process.env.OFFSCREEN_MONITOR_OPERATION_ID = parentId;
  try {
    const started = beginShellOperation(
      'release.install',
      { repoRoot: join(RELEASE_DIR, '../../..') },
      { stateRoot, skipGit: true },
    );
    assert.ok(started);
    const start = readOperationRecords(stateRoot).find(
      (record) => record.operation.operationId === started.operationId,
    );
    assert.equal(start.operation.parentOperationId, parentId);
  } finally {
    if (previous === undefined) delete process.env.OFFSCREEN_MONITOR_OPERATION_ID;
    else process.env.OFFSCREEN_MONITOR_OPERATION_ID = previous;
  }
  rmSync(stateRoot, { recursive: true, force: true });
});