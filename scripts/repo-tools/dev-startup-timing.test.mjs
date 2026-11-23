import assert from 'node:assert/strict';
import test from 'node:test';
import { exclusiveDurations, timePhase, beginStartupTiming, finishStartupTiming } from './dev-startup-timing.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  beginStartupTiming(path);
  await assert.rejects(timePhase('sql', 'reconcile', async () => {
    throw new Error('migration refused');
  }));
  const failed = finishStartupTiming('refused:slot-sql');
  assert.deepEqual(failed.phases.map((phase) => phase.name), ['sql']);
  beginStartupTiming(path);
  await timePhase('preflight', null, async () => {});
  const next = finishStartupTiming('ok');
  assert.deepEqual(next.phases.map((phase) => phase.name), ['preflight']);
});

test('a thrown phase is still recorded and a later finish writes the receipt', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-fail-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path);
  await assert.rejects(timePhase('sql', 'reconcile', async () => {
    throw new Error('migration refused');
  }));
  const receipt = finishStartupTiming('refused:slot-sql');
  assert.equal(receipt.outcome, 'refused:slot-sql');
  assert.equal(receipt.phases[0].name, 'sql');
  assert.ok(receipt.phases[0].ms >= 0);
});

test('receipt omits credentials and writes under the requested path', async () => {
  const root = mkdtempSync(join(tmpdir(), 'startup-timing-'));
  const path = join(root, '.offscreen', 'dev-startup-timing.json');
  beginStartupTiming(path);
  await timePhase('preflight', null, async (note) => {
    note({ cache: 'hit', secret: 'do-not-store' });
  });
  const receipt = finishStartupTiming('test');
  assert.equal(receipt.phases[0].redacted, true);
  assert.equal(receipt.phases[0].name, 'preflight');
});
