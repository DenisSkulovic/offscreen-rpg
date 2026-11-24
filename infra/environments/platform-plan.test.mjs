import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  OPTIONAL_EXCLUDED_SERVICES,
  REPO_ROOT,
  buildPlatformPlan,
  runPlatformPlan,
} from './platform-plan.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('dev and release plans keep the core service order with absolute entrypoints', () => {
  const dev = buildPlatformPlan({ profileId: 'dev', command: 'plan' });
  assert.equal(dev.ok, true);
  assert.deepEqual(
    dev.phases.map((phase) => phase.id),
    ['cnpg', 'object-storage', 'temporal'],
  );
  for (const phase of dev.phases) {
    assert.equal(phase.argv[1]?.startsWith('/'), true);
    assert.equal(phase.argv[2], 'plan');
  }
  assert.deepEqual(dev.excludedOptional, [...OPTIONAL_EXCLUDED_SERVICES]);

  const release = buildPlatformPlan({ profileId: 'release', command: 'plan' });
  assert.equal(release.ok, true);
  assert.deepEqual(
    release.phases.map((phase) => phase.id),
    ['postgres', 'object-storage', 'temporal', 'gateway'],
  );
  for (const phase of release.phases) {
    assert.equal(phase.argv[0], 'bash');
    assert.equal(phase.argv[1]?.startsWith(join(REPO_ROOT, 'infra/platform')), true);
  }
});

test('dev ensure carries the existing authorization env flags on bootstrap CLIs', () => {
  const plan = buildPlatformPlan({
    profileId: 'dev',
    command: 'ensure',
    confirmation: 'kind-offscreen-dev',
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.phases[0].env?.OFFSCREEN_DEV_CNPG_ENSURE, 'authorized');
  assert.equal(plan.phases[1].env?.OFFSCREEN_DEV_S3_ENSURE, 'authorized');
  assert.equal(plan.phases[2].env?.OFFSCREEN_DEV_TEMPORAL_ENSURE, 'authorized');
  assert.deepEqual(plan.phases.map((p) => p.argv[2]), [
    'ensure',
    'ensure',
    'ensure',
  ]);
});

test('unknown profile refuses before planning phases', () => {
  const plan = buildPlatformPlan({ profileId: 'staging', command: 'plan' });
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'unknown-profile');
  assert.equal(plan.phases.length, 0);
});

test('ensure without exact context confirmation refuses', () => {
  const plan = buildPlatformPlan({
    profileId: 'release',
    command: 'ensure',
    confirmation: 'kind-offscreen-dev',
  });
  assert.equal(plan.ok, false);
  assert.equal(plan.refusals[0]?.id, 'context-confirmation');
});

test('a second phase failure skips the remaining phases without rollback', () => {
  const plan = buildPlatformPlan({ profileId: 'dev', command: 'plan' });
  /** @type {string[]} */
  const seen = [];
  const receipt = runPlatformPlan(plan, (argv, options) => {
    const id = options?.phaseId ?? 'unknown';
    seen.push(id);
    if (id === 'object-storage') {
      return { ok: false, status: 1, stderr: 'injected object-store failure' };
    }
    return { ok: true, status: 0 };
  });
  assert.equal(receipt.ok, false);
  assert.deepEqual(seen, ['cnpg', 'object-storage']);
  assert.equal(receipt.ran.length, 2);
  assert.equal(receipt.skipped.length, 1);
  assert.equal(receipt.skipped[0]?.id, 'temporal');
  assert.equal(receipt.rollback, false);
});

test('core plans never include fixture, tenant, or optional service phases', () => {
  const forbidden = /fixture|tenant|redis|rabbitmq|observabilit|content-bootstrap|cluster-up/i;
  for (const profileId of ['dev', 'release']) {
    const plan = buildPlatformPlan({ profileId, command: 'plan' });
    for (const phase of plan.phases) {
      assert.equal(forbidden.test(phase.id), false);
      assert.equal(forbidden.test(phase.argv.join(' ')), false);
    }
    assert.equal(
      plan.phases.some((phase) => phase.argv.join(' ').includes('up.sh')),
      false,
    );
  }
});

test('release plan mode leaves install scripts preview-only', () => {
  const plan = buildPlatformPlan({ profileId: 'release', command: 'plan' });
  let calls = 0;
  const receipt = runPlatformPlan(plan, () => {
    calls += 1;
    return { ok: true };
  });
  assert.equal(receipt.ok, true);
  assert.equal(calls, 0);
  assert.equal(receipt.skipped.length, 4);
  assert.deepEqual(
    receipt.phases.map((phase) => phase.detail),
    ['preview-only', 'preview-only', 'preview-only', 'preview-only'],
  );
});