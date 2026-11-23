import assert from 'node:assert/strict';
import test from 'node:test';
import { exclusiveDurations, timePhase, beginStartupTiming, finishStartupTiming } from './dev-startup-timing.mjs';
import { mkdtempSync } from 'node:fs';
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
