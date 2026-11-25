import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildVerificationPlan,
  resolveSubject,
  REPO_ROOT,
} from './catalog.mjs';
import { materializeExecutionPlan, peakResourceBudget } from './plan.mjs';

test('materializeExecutionPlan rejects duplicate and unknown section ids', () => {
  const duplicate = materializeExecutionPlan({
    subject: { kind: 'package', manifestName: '@offscreen/db' },
    profile: 'standard',
    live: false,
    mode: 'source',
    sections: [
      { id: 'source', tier: 'SOURCE', scenarioIds: ['DB-S01'] },
      { id: 'source', tier: 'SOURCE', scenarioIds: ['DB-S01'] },
    ],
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.message, /duplicate section IDs/);
});

test('materializeExecutionPlan wires source prerequisite and resource validation', () => {
  const subject = resolveSubject('package', '@offscreen/db', REPO_ROOT);
  const planned = buildVerificationPlan({
    subject: subject.subject,
    profile: 'standard',
    live: false,
  });
  assert.equal(planned.ok, true);
  const materialized = materializeExecutionPlan(planned.plan);
  assert.equal(materialized.ok, true);
  const admission = materialized.plan.sections.find(
    (row) => row.id === 'admission',
  );
  assert.deepEqual(admission.requires, ['source']);
  assert.ok(admission.scenarioIds.includes('DB-A01'));
  assert.equal(peakResourceBudget(materialized.plan.sections), 1);
});

test('materializeExecutionPlan rejects sections without scenario ids', () => {
  const materialized = materializeExecutionPlan({
    subject: { kind: 'infra', id: 'infra' },
    profile: 'diagnostic',
    live: false,
    mode: 'source',
    sections: [{ id: 'diagnostic-suite', tier: 'FIXTURE', scenarioIds: [] }],
  });
  assert.equal(materialized.ok, false);
  assert.match(materialized.message, /no scenario IDs/);
});
