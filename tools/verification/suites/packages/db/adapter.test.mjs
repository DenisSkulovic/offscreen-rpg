import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVerificationPlan,
  resolveSubject,
  REPO_ROOT,
} from '../../../runner/catalog.mjs';
import { buildDbVerificationDeps } from './adapter.mjs';

test('buildDbVerificationDeps wires postgres adapter and scenario runner', () => {
  const subject = resolveSubject('package', '@offscreen/db', REPO_ROOT);
  assert.equal(subject.ok, true);
  const planBuilt = buildVerificationPlan({
    subject: subject.subject,
    profile: 'source',
  });
  assert.equal(planBuilt.ok, true);
  const deps = buildDbVerificationDeps(planBuilt.plan, { repoRoot: REPO_ROOT });
  assert.equal(typeof deps.runScenario, 'function');
  assert.equal(typeof deps.adapters?.postgres?.acquire, 'function');
});

test('buildDbVerificationDeps leaves unrelated subjects untouched', () => {
  const deps = buildDbVerificationDeps(
    { subject: { kind: 'infra', id: 'infra' } },
    { repoRoot: REPO_ROOT, runScenario: null },
  );
  assert.equal(deps.runScenario, null);
});