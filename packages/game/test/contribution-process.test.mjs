import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contributeAtBoundary,
  estimatedCompletionBoundaryTick,
  nextBoundaryTick,
  processBoundaryDue,
  processProgressAtEffortTick,
  resolvedActivityPlanSchema,
  settleProcessBoundary,
  worldTickForEffortBoundary,
} from '../dist/src/activities.js';

const character = {
  name: 'Mara',
  scores: {
    strength: 10,
    dexterity: 12,
    constitution: 10,
    intelligence: 14,
    wisdom: 12,
    charisma: 10,
  },
  applicableAbilities: [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ],
  skills: [{ id: 'repair', label: 'Repair' }],
  proficientSkills: ['repair'],
  proficiencyBonus: 2,
  hp: 8,
  maxHp: 8,
  quantities: [],
  facts: [],
};

const plan = resolvedActivityPlanSchema.parse({
  version: 6,
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
      everyTicks: 5,
      attempt: {
        check: {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Repair the beacon',
          skill: 'repair',
          ability: 'intelligence',
          dc: 13,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        successContribution: 3,
        failureContribution: 0,
        successText: 'The repair advances.',
        failureText: 'The attempt consumes time without a sound repair.',
      },
    },
    completionFollowUp: 'scene',
    checks: [],
    completion: { text: 'The beacon works again.', effects: [] },
  },
  settingsRevision: 1,
  resolvedThroughTick: 0,
});

test('ability checks determine contribution while time only schedules attempts', () => {
  let progress = { kind: 'contribution.v1', earned: 0 };
  assert.equal(nextBoundaryTick(plan, 0), 5);
  assert.equal(estimatedCompletionBoundaryTick(plan, progress, character), 30);

  const first = contributeAtBoundary(plan, progress, character, () => 20);
  progress = first.progress;
  assert.deepEqual(progress, { kind: 'contribution.v1', earned: 3 });
  assert.equal(first.contribution, 3);
  assert.equal(first.complete, false);

  const failed = contributeAtBoundary(plan, progress, character, () => 1);
  assert.equal(failed.contribution, 0);
  assert.deepEqual(failed.progress, progress);

  progress = contributeAtBoundary(plan, progress, character, () => 20).progress;
  progress = contributeAtBoundary(plan, progress, character, () => 20).progress;
  const final = contributeAtBoundary(plan, progress, character, () => 20);
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
          success: {
            text: 'A stranger approaches.',
            effects: [],
            interrupts: true,
          },
          failure: {
            text: 'The watch remains quiet.',
            effects: [],
            interrupts: false,
          },
        },
      ],
    },
  });
  assert.equal(nextBoundaryTick(withCheck, 0), 2);
  assert.equal(nextBoundaryTick(withCheck, 2), 4);
  assert.equal(nextBoundaryTick(withCheck, 4), 5);
});

test('retained effort maps to the current campaign clock after other work', () => {
  assert.equal(
    worldTickForEffortBoundary({
      campaignTick: 15,
      retainedEffortTicks: 10,
      boundaryEffortTick: 15,
    }),
    20,
  );
  assert.equal(
    worldTickForEffortBoundary({
      campaignTick: 20,
      retainedEffortTicks: 15,
      boundaryEffortTick: 20,
    }),
    25,
  );
  assert.equal(
    worldTickForEffortBoundary({
      campaignTick: 200,
      retainedEffortTicks: 200,
      boundaryEffortTick: 125,
    }),
    125,
  );
});

test('clock wait completes at its eligible tick target without a roll or work points', () => {
  const wait = resolvedActivityPlanSchema.parse({
    version: 6,
    action: {
      id: 'remain-contracted',
      label: 'Remain contracted',
      description: 'Wait for the disturbance to pass.',
      requires: [],
      capacity: 'primary',
      process: {
        kind: 'clock-wait.v1',
        progressLabel: 'Protective interval',
        requiredTicks: 10,
      },
      completionFollowUp: 'quiet',
      checks: [],
      completion: { text: 'The disturbance passes.', effects: [] },
    },
    settingsRevision: 1,
    resolvedThroughTick: 0,
  });
  const progress = { kind: 'clock-wait.v1', elapsedTicks: 0 };
  assert.equal(nextBoundaryTick(wait, 0), 10);
  assert.equal(estimatedCompletionBoundaryTick(wait, progress, character), 10);
  assert.equal(processBoundaryDue(wait, 9), false);
  assert.equal(processBoundaryDue(wait, 10), true);
  assert.deepEqual(processProgressAtEffortTick(wait, progress, 6), {
    kind: 'clock-wait.v1',
    elapsedTicks: 6,
  });
  const result = settleProcessBoundary(wait, progress, character, () => {
    throw new Error('A wait must not draw a d20');
  });
  assert.deepEqual(result.progress, {
    kind: 'clock-wait.v1',
    elapsedTicks: 10,
  });
  assert.equal(result.complete, true);
  assert.equal(result.roll, null);
  assert.equal(result.contribution, null);
});
