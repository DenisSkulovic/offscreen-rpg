import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  OPERATION_EVENT_KINDS,
  OPERATION_RECORD_KIND,
  RECORD_LINE_STATE,
  SCHEMA_VERSION,
  buildScopeId,
  childOperationEnv,
  createInjectableClock,
  createOperationEventWriter,
  looksLikeSecret,
  operationSpanIsComplete,
  parseOperationRecordLine,
  rejectSecretFields,
  resolveChangeId,
  stableRepoRef,
} from '../operation-event.mjs';

function tempStateRoot() {
  return mkdtempSync(join(tmpdir(), 'offscreen-monitor-'));
}

test('injected clock and identity emit schema v1 operation records', () => {
  const stateRoot = tempStateRoot();
  let wall = 1_700_000_000;
  let mono = 42_000_000_000n;
  const clock = createInjectableClock(
    () => {
      wall += 1;
      return wall;
    },
    () => {
      mono += 5n;
      return mono;
    },
  );
  const scopeId = buildScopeId('install-test', 'boot-abc', 'host');
  const writer = createOperationEventWriter({
    stateRoot,
    clock,
    scopeId,
    installationId: 'install-test',
    bootId: 'boot-abc',
    pid: 4242,
    starttimeTicks: '999',
    repoRoot: '/home/dskul/projects/offscreen-rpg-inf46',
    runGit: () => ({ status: 0, stdout: 'abc1234|HEAD -> change/inf46-resource-operation-correlation' }),
  });
  const op = writer.beginOperation({ name: 'dev.startup' });
  assert.ok(op);
  op.startPhase('compile');
  op.endPhase('success');
  op.finish('success');

  const paths = readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) => join(stateRoot, entry.name));
  assert.ok(paths.length >= 4);
  const records = paths.map((path) => JSON.parse(readFileSync(path, 'utf8')));
  for (const record of records) {
    assert.equal(record.schemaVersion, SCHEMA_VERSION);
    assert.equal(record.kind, OPERATION_RECORD_KIND);
    assert.equal(record.scopeId, scopeId);
    assert.match(record.monotonicNs, /^\d+$/);
    assert.ok(OPERATION_EVENT_KINDS.includes(record.operation.event));
  }
  const startRecord = records.find((record) => record.operation.event === 'start');
  assert.equal(startRecord.operation.changeId, 'inf46');
  assert.deepEqual(startRecord.operation.repoRef, stableRepoRef('/home/dskul/projects/offscreen-rpg-inf46'));
  rmSync(stateRoot, { recursive: true, force: true });
});

test('overlapping same phase name receives distinct phase ids', () => {
  const stateRoot = tempStateRoot();
  const writer = createOperationEventWriter({
    stateRoot,
    clock: createInjectableClock(() => 1_700_000_010, () => 50n),
    skipGit: true,
  });
  const op = writer.beginOperation({ name: 'build' });
  const first = op.startPhase('images');
  const second = op.startPhase('images');
  assert.notEqual(first, second);
  op.endPhase('success');
  op.endPhase('success');
  op.finish('success');

  const phaseStarts = readDirRecords(stateRoot).filter(
    (record) => record.operation.event === 'phase-start',
  );
  assert.equal(phaseStarts.length, 2);
  const ids = new Set(phaseStarts.map((record) => record.operation.phaseId));
  assert.equal(ids.size, 2);
  rmSync(stateRoot, { recursive: true, force: true });
});

test('missing state directory is a no-op and does not throw', () => {
  const missingRoot = join(tmpdir(), `offscreen-monitor-missing-${Date.now()}`);
  const writer = createOperationEventWriter({
    stateRoot: missingRoot,
    existsSync: () => false,
  });
  assert.doesNotThrow(() => {
    const op = writer.beginOperation({ name: 'noop.test', skipGit: true });
    assert.ok(op);
    op.finish('success');
  });
  assert.equal(writer.lastDiagnostic, 'monitor_state_unavailable');
});

test('secret input is rejected and not written', () => {
  const stateRoot = tempStateRoot();
  const writer = createOperationEventWriter({
    stateRoot,
    clock: createInjectableClock(() => 1_700_000_020, () => 60n),
    runGit: () => ({ status: 1, stdout: '' }),
  });
  const blocked = writer.beginOperation({ name: 'Bearer super-secret-token-value' });
  assert.equal(blocked, null);
  assert.equal(readDirRecords(stateRoot).length, 0);
  assert.match(writer.lastDiagnostic, /secret_like/);

  const op = writer.beginOperation({ name: 'safe.op', skipGit: true });
  assert.ok(op);
  const phase = op.startPhase('deploy-with-api_key=deadbeef');
  assert.equal(phase, null);
  assert.equal(readDirRecords(stateRoot).length, 1);
  assert.ok(rejectSecretFields({ phaseName: 'password=abc' }).ok === false);
  assert.ok(looksLikeSecret('aws_secret_access_key'));
  rmSync(stateRoot, { recursive: true, force: true });
});

test('write failure does not fail the caller', () => {
  const stateRoot = tempStateRoot();
  const writer = createOperationEventWriter({
    stateRoot,
    clock: createInjectableClock(() => 1_700_000_030, () => 70n),
    skipGit: true,
    openSync: () => {
      const error = new Error('EACCES');
      error.code = 'EACCES';
      throw error;
    },
  });
  assert.doesNotThrow(() => {
    const op = writer.beginOperation({ name: 'safe.op', skipGit: true });
    op.finish('success');
  });
  assert.equal(writer.lastDiagnostic, 'monitor_write_failed');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('partial line is detectable and incomplete spans do not invent end', () => {
  const partial = parseOperationRecordLine('{"schemaVersion":1,"kind":"operation"', {
    partialAtEof: true,
  });
  assert.equal(partial.state, RECORD_LINE_STATE.PARTIAL);
  assert.equal(partial.record, null);

  const corrupt = parseOperationRecordLine('{"schemaVersion":1,"kind":"operation"');
  assert.equal(corrupt.state, RECORD_LINE_STATE.CORRUPT);

  const startOnly = [
    {
      operation: { operationId: '11111111-1111-4111-8111-111111111111', event: 'start' },
    },
  ];
  assert.equal(operationSpanIsComplete(startOnly, '11111111-1111-4111-8111-111111111111'), false);

  const completed = [
    ...startOnly,
    {
      operation: { operationId: '11111111-1111-4111-8111-111111111111', event: 'end' },
    },
  ];
  assert.equal(operationSpanIsComplete(completed, '11111111-1111-4111-8111-111111111111'), true);
});

test('resolveChangeId prefers approved env over branch pattern', () => {
  assert.equal(resolveChangeId({ approvedChangeId: 'INF46', branch: 'main' }), 'inf46');
  assert.equal(resolveChangeId({ branch: 'change/dxk09-isolated-parallel-development-stacks' }), 'dxk09');
});

test('child operation env exports bounded parent operation id', () => {
  const id = '22222222-2222-4222-8222-222222222222';
  assert.deepEqual(childOperationEnv(id), { OFFSCREEN_MONITOR_OPERATION_ID: id });
  assert.deepEqual(childOperationEnv('not-a-uuid'), {});
});

/**
 * @param {string} stateRoot
 */
function readDirRecords(stateRoot) {
  return readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) => JSON.parse(readFileSync(join(stateRoot, entry.name), 'utf8')));
}