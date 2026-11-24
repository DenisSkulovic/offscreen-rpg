import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exclusiveDurations,
  timePhase,
  beginStartupTiming,
  finishStartupTiming,
  recordPhase,
  resetStartupTimingForTests,
  withStartupTimingScope,
  startupTimingChildEnv,
} from '../src/application/dev-startup-timing.mjs';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.afterEach(() => {
  resetStartupTimingForTests();
});

test('exclusive time subtracts a nested phase once', () => {
  const phases = exclusiveDurations([
    { name: 'docker-build', parent: 'images', ms: 700 },
    { name: 'kind-load', parent: 'images', ms: 200 },
    { name: 'images', parent: 'reconcile', ms: 1000 },
    { name: 'reconcile', parent: null, ms: 1100 },
  ]);
  assert.equal(phases[2].exclusiveMs, 100);
  assert.equal(phases[3].exclusiveMs, 100);
  assert.equal(phases.reduce((sum, phase) => sum + phase.exclusiveMs, 0), 1100);
});

test('overlapping sibling children keep approximate exclusive time', () => {
  const phases = exclusiveDurations([
    {
      name: 'child-a',
      parent: 'images',
      ms: 500,
      startedAt: '2026-01-01T00:00:00.000Z',
      finishedAt: '2026-01-01T00:00:05.000Z',
    },
    {
      name: 'child-b',
      parent: 'images',
      ms: 400,
      startedAt: '2026-01-01T00:00:02.000Z',
      finishedAt: '2026-01-01T00:00:06.000Z',
    },
    { name: 'images', parent: null, ms: 600 },
  ]);
  const parent = phases.find((phase) => phase.name === 'images');
  assert.equal(parent.exclusiveMs, 600);
  assert.equal(parent.exclusiveApproximate, true);
});

test('exclusive roots account for the total without adding nested tilt time twice', () => {
  const phases = exclusiveDurations([
    { name: 'reconcile', parent: null, ms: 92_000 },
    { name: 'images', parent: 'reconcile', ms: 4_000 },
    { name: 'readiness', parent: null, ms: 24_000 },
    { name: 'tilt-image', parent: 'readiness', ms: 18_000 },
  ]);
  const total = phases.reduce((sum, phase) => sum + phase.exclusiveMs, 0);
  assert.equal(total, 116_000);
  assert.equal(phases.find((phase) => phase.name === 'readiness').exclusiveMs, 6_000);
});

test('a previous run cannot contaminate the next receipt, including after a failure', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-isolate-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(join(root, '.offscreen'), { recursive: true });
  writeFileSync(`${path}.phases.jsonl`, `${JSON.stringify({ name: 'kind-load-content-worker', parent: 'images', ms: 87000, cache: 'miss' })}\n`);
  beginStartupTiming(path, { skipGit: true });
  await assert.rejects(timePhase('sql', 'reconcile', async () => {
    throw new Error('migration refused');
  }));
  const failed = finishStartupTiming('refused:slot-sql');
  assert.deepEqual(failed.phases.map((phase) => phase.name), ['sql']);
  beginStartupTiming(path, { skipGit: true });
  await timePhase('preflight', null, async () => {});
  const next = finishStartupTiming('ok');
  assert.deepEqual(next.phases.map((phase) => phase.name), ['preflight']);
});

test('a thrown phase is still recorded and a later finish writes the receipt', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-fail-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path, { skipGit: true });
  await assert.rejects(timePhase('sql', 'reconcile', async () => {
    throw new Error('migration refused');
  }));
  const receipt = finishStartupTiming('refused:slot-sql');
  assert.equal(receipt.outcome, 'refused:slot-sql');
  assert.equal(receipt.phases[0].name, 'sql');
  assert.ok(receipt.phases[0].ms >= 0);
  assert.match(receipt.phases[0].phaseId, /^[0-9a-f-]{36}$/i);
  assert.ok(receipt.phases[0].finishedAt);
  assert.equal(receipt.phases[0].measuredStart, true);
});

test('receipt omits credentials and writes under the requested path', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path, { skipGit: true });
  await timePhase('preflight', null, async (note) => {
    note({ cache: 'hit', secret: 'do-not-store' });
  });
  const receipt = finishStartupTiming('test');
  assert.equal(receipt.phases[0].redacted, true);
  assert.equal(receipt.phases[0].name, 'preflight');
  const raw = readFileSync(path, 'utf8');
  assert.match(raw, /"redacted":\s*true/);
  assert.doesNotMatch(raw, /do-not-store/);
});

test('recordPhase marks estimated starts without presenting them as measured', () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-estimate-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path, { skipGit: true });
  recordPhase('fingerprint', null, 120, { cache: 'miss' });
  const receipt = finishStartupTiming('test');
  const phase = receipt.phases[0];
  assert.equal(phase.startEstimated, true);
  assert.ok(phase.startedAtEstimated);
  assert.equal(phase.startedAt, undefined);
  assert.equal(phase.measuredStart, undefined);
});

test('child jsonl tolerates malformed lines and dedupes concurrent same-name phases', () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-child-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  mkdirSync(join(root, '.offscreen'), { recursive: true });
  const childPath = `${path}.phases.jsonl`;
  const sharedId = '11111111-1111-4111-8111-111111111111';
  beginStartupTiming(path, { skipGit: true });
  writeFileSync(
    childPath,
    [
      '{"name":"docker-build","parent":"images","ms":10,"cache":"hit","phaseId":"' + sharedId + '"}',
      '{invalid',
      '{"name":"docker-build","parent":"images","ms":10,"cache":"hit","phaseId":"' + sharedId + '"}',
      '{"name":"docker-build","parent":"images","ms":20,"cache":"miss","phaseId":"22222222-2222-4222-8222-222222222222"}',
    ].join('\n') + '\n',
    'utf8',
  );
  const receipt = finishStartupTiming('test');
  const childPhases = receipt.phases.filter((phase) => phase.name === 'docker-build');
  assert.equal(childPhases.length, 2);
  assert.deepEqual(
    childPhases.map((phase) => phase.ms).sort((a, b) => a - b),
    [10, 20],
  );
});

test('historical child lines without timeline fields remain readable', () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-historical-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  mkdirSync(join(root, '.offscreen'), { recursive: true });
  beginStartupTiming(path, { skipGit: true });
  writeFileSync(
    `${path}.phases.jsonl`,
    `${JSON.stringify({ name: 'kind-load', parent: 'images', ms: 42, cache: 'hit' })}\n`,
    'utf8',
  );
  const receipt = finishStartupTiming('test');
  assert.equal(receipt.phases[0].name, 'kind-load');
  assert.equal(receipt.phases[0].ms, 42);
  assert.equal(receipt.phases[0].cache, 'hit');
});

test('missing child file does not fail finish', () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-missing-child-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path, { skipGit: true });
  const receipt = finishStartupTiming('test');
  assert.deepEqual(receipt.phases, []);
});

test('unfinished startup leaves measured starts without a finish receipt', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-crash-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path, { skipGit: true });
  const pending = timePhase('preflight', null, async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  assert.throws(() => readFileSync(path), /ENOENT/);
  await pending;
  assert.throws(() => readFileSync(path), /ENOENT/);
});

test('overlapping launches own separate timing state and child receipts', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-parallel-'));
  const path = join(root, 'receipt.json');
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let envA;
  const a = withStartupTimingScope(async () => {
    beginStartupTiming(path, { skipGit: true });
    envA = startupTimingChildEnv();
    await timePhase('reconcile', null, () => gate);
    assert.deepEqual(startupTimingChildEnv(), envA);
    return finishStartupTiming('ok');
  });
  const b = await withStartupTimingScope(async () => {
    beginStartupTiming(path, { skipGit: true });
    const envB = startupTimingChildEnv();
    assert.notEqual(envB.OFFSCREEN_STARTUP_TIMING, envA.OFFSCREEN_STARTUP_TIMING);
    assert.notEqual(envB.OFFSCREEN_MONITOR_OPERATION_ID, envA.OFFSCREEN_MONITOR_OPERATION_ID);
    await timePhase('preflight', null, async () => {});
    return finishStartupTiming('refused:slot-operation-busy');
  });
  release();
  const first = await a;
  assert.deepEqual(first.phases.map((phase) => phase.name), ['reconcile']);
  assert.deepEqual(b.phases.map((phase) => phase.name), ['preflight']);
  assert.notEqual(first.operationId, b.operationId);
  assert.deepEqual(startupTimingChildEnv(), {});
});

test('a phase completing after its receipt was finished does not throw or reopen it', async () => {
  await withStartupTimingScope(async () => {
    const root = mkdtempSync(join(tmpdir(), 'startup-timing-cancel-'));
    beginStartupTiming(join(root, 'receipt.json'), { skipGit: true });
    let release;
    const pending = timePhase('reconcile', null, () => new Promise((resolve) => { release = resolve; }));
    const receipt = finishStartupTiming('signal:SIGTERM');
    release();
    await pending;
    assert.equal(receipt.outcome, 'signal:SIGTERM');
    assert.deepEqual(startupTimingChildEnv(), {});
  });
});
