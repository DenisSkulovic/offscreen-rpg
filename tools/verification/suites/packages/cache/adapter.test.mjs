import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildVerificationPlan,
  resolveSubject,
  REPO_ROOT,
} from '../../../runner/catalog.mjs';
import { runVerification } from '../../../runner/execute.mjs';
import {
  buildCacheVerificationDeps,
  createCacheScenarioRunner,
} from './adapter.mjs';
import { CACHE_PROFILE_SECTIONS } from './manifest.mjs';

test('buildCacheVerificationDeps leaves unrelated subjects untouched', () => {
  const deps = { repoRoot: REPO_ROOT, adapters: {} };
  const wrapped = buildCacheVerificationDeps(
    { subject: { manifestName: '@offscreen/db' } },
    deps,
  );
  assert.equal(wrapped.runScenario, undefined);
  assert.equal(wrapped.adapters, deps.adapters);
});

test('cache scenario runner maps unimplemented ids to NOT-RUN', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-cache-adapter-'));
  const runner = createCacheScenarioRunner(
    { subject: { manifestName: '@offscreen/cache' } },
    { repoRoot },
  );
  const outcome = await runner({
    section: { id: 'redis', tier: 'LIVE' },
    scenarioId: 'CA-R01',
    runContext: { run: async () => ({ code: 0 }) },
  });
  assert.equal(outcome.status, 'NOT-RUN');
  assert.equal(outcome.reasonCode, 'scenario-not-implemented');
});

test('source-only cache verify never acquires live redis', async () => {
  let acquireCalls = 0;
  const subject = resolveSubject('package', '@offscreen/cache', REPO_ROOT);
  assert.equal(subject.ok, true);
  const built = buildVerificationPlan({
    subject: subject.subject,
    profile: 'standard',
    live: false,
    section: 'redis',
  });
  assert.equal(built.ok, true);
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-cache-standard-'));
  const result = await runVerification(
    built.plan,
    buildCacheVerificationDeps(built.plan, {
      repoRoot,
      adapters: {
        redis: {
          acquire: async () => {
            acquireCalls += 1;
            return {
              publicFacts: {},
              privateHandle: {},
              release: async () => {},
            };
          },
        },
      },
    }),
  );
  assert.equal(result.ok, true);
  assert.equal(acquireCalls, 0);
  const redisScenarios = result.report.scenarios.filter((row) =>
    row.scenarioId.startsWith('CA-R'),
  );
  assert.ok(redisScenarios.every((row) => row.status === 'NOT-RUN'));
});

test('buildVerificationPlan honors cache profile section order', () => {
  const subject = resolveSubject('package', '@offscreen/cache', REPO_ROOT);
  assert.equal(subject.ok, true);
  const plan = buildVerificationPlan({
    subject: subject.subject,
    profile: 'stress',
    live: false,
  });
  assert.equal(plan.ok, true);
  assert.deepEqual(
    plan.plan.sections.map((row) => row.id),
    [...CACHE_PROFILE_SECTIONS.stress],
  );
});
