import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completionBoundaryTick,
  contributeAtBoundary,
  nextBoundaryTick,
  resolvedActivityPlanSchema,
} from '../dist/src/activities.js';

const plan = resolvedActivityPlanSchema.parse({
  version: 4,
  action: {
    id: 'restore-beacon',
    label: 'Restore the signal beacon',
    description: 'Repair the storm-damaged beacon while keeping watch.',
    requires: [],
    capacity: 'primary',
    process: {
      kind: 'contribution.v1',
      progressLabel: 'Beacon repair',
      requiredContribution: 10,
      contributionPerBoundary: 3,
      everyTicks: 5,
    },
    checks: [],
    completion: { text: 'The beacon works again.', effects: [] },
  },
  startTick: 0,
  settingsRevision: 1,
  resolvedThroughTick: 0,
});

test('elapsed boundaries and earned contribution remain separate', () => {
  let progress = { kind: 'contribution.v1', earned: 0 };
  assert.equal(nextBoundaryTick(plan, 0), 5);
  assert.equal(completionBoundaryTick(plan, progress), 20);

  const first = contributeAtBoundary(plan, progress);
  progress = first.progress;
  assert.deepEqual(progress, { kind: 'contribution.v1', earned: 3 });
  assert.equal(first.complete, false);
  assert.equal(completionBoundaryTick({ ...plan, resolvedThroughTick: 5 }, progress), 20);

  progress = contributeAtBoundary(plan, progress).progress;
  progress = contributeAtBoundary(plan, progress).progress;
  const final = contributeAtBoundary(plan, progress);
  assert.deepEqual(final.progress, { kind: 'contribution.v1', earned: 10 });
  assert.equal(final.complete, true);
});

test('a check cadence can wake earlier without becoming productive progress', () => {
  const withCheck = resolvedActivityPlanSchema.parse({
    ...plan,
    action: {
      ...plan.action,
      checks: [
        {
          id: 'approaching-stranger',
          everyTicks: 2,
          resolution: {
            kind: 'event',
            purpose: 'Approaching stranger',
            threshold: 1,
            modifiers: [],
          },
          success: { text: 'A stranger approaches.', effects: [], interrupts: true },
          failure: { text: 'The watch remains quiet.', effects: [], interrupts: false },
        },
      ],
    },
  });
  assert.equal(nextBoundaryTick(withCheck, 0), 2);
  assert.equal(nextBoundaryTick(withCheck, 2), 4);
  assert.equal(nextBoundaryTick(withCheck, 4), 5);
});
