import assert from 'node:assert/strict';
import test from 'node:test';
import { decideActionExecutionTransition } from '../dist/campaign/action-execution-transition.js';
import {
  abstractSignalItems,
  abstractSignalTransferPlan,
  harborCompassItems,
  harborCompassTransferPlan,
} from '../dist/campaign/fixtures/item-transfer-plans.js';

const operationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function campaignState(overrides = {}) {
  return {
    storyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    settingsRevision: 1,
    locked: 0,
    character: {
      name: 'A quay runner',
      scores: {
        strength: 10,
        dexterity: 12,
        constitution: 12,
        intelligence: 10,
        wisdom: 12,
        charisma: 14,
      },
      applicableAbilities: [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
      ],
      skills: [{ id: 'persuasion', label: 'Persuasion' }],
      proficientSkills: ['persuasion'],
      proficiencyBonus: 2,
      hp: 10,
      maxHp: 10,
      facts: [],
      quantities: [],
    },
    storyFacts: [],
    activityOccurrences: [],
    acceptedActivityPlan: null,
    content: {},
    location: null,
    gameSecond: 0,
    clock: {
      elapsedGameSeconds: 0,
      remainder: { numerator: '0', denominator: '1' },
    },
    clockAnchorAt: new Date(0),
    clockPace: { kind: 'instant' },
    holds: [],
    offer: null,
    situationAuthorization: {},
    activeActivityId: null,
    activeActionOperationId: operationId,
    worldConditions: [],
    ...overrides,
  };
}

function executionFor(plan, items) {
  return {
    operationId,
    revision: 0,
    startGameSecond: 0,
    targetGameSecond: 10,
    plan,
    items,
  };
}

test('a due item transfer settles once and returns the world effect', () => {
  let rolls = 0;
  const transition = decideActionExecutionTransition({
    state: campaignState(),
    execution: executionFor(harborCompassTransferPlan, harborCompassItems),
    clockHeld: false,
    now: 0,
    rollDie: () => {
      rolls += 1;
      return 15;
    },
  });
  assert.equal(transition.state, 'settled');
  assert.equal(rolls, 1);
  assert.equal(transition.receipt.outcome, 'success');
  assert.deepEqual(transition.receipt.worldEffects, [
    {
      kind: 'item.transfer.v1',
      itemKey: 'brass-compass',
      fromHolder: 'player',
      toHolder: 'mara',
    },
  ]);
  assert.equal(transition.campaign.gameSecond, 10);
});

test('a failed check reaches due time without transferring the item', () => {
  const transition = decideActionExecutionTransition({
    state: campaignState(),
    execution: executionFor(harborCompassTransferPlan, harborCompassItems),
    clockHeld: false,
    now: 0,
    rollDie: () => 1,
  });
  assert.equal(transition.state, 'settled');
  assert.equal(transition.receipt.outcome, 'failure');
  assert.deepEqual(transition.receipt.worldEffects, []);
});

test('a wrong holder interrupts after the wait without rolling', () => {
  const transition = decideActionExecutionTransition({
    state: campaignState(),
    execution: executionFor(harborCompassTransferPlan, [
      { key: 'brass-compass', label: 'Brass compass', holderKey: 'mara' },
    ]),
    clockHeld: false,
    now: 0,
    rollDie: () => {
      throw new Error('A wrong-holder interrupt must not roll');
    },
  });
  assert.equal(transition.state, 'interrupted');
  assert.equal(transition.campaign.gameSecond, 10);
  assert.match(transition.fact.label, /no longer held/);
});

test('an abstract process token uses the same settlement rule', () => {
  const transition = decideActionExecutionTransition({
    state: campaignState({
      character: {
        name: 'A process',
        scores: {
          strength: 8,
          dexterity: 8,
          constitution: 8,
          intelligence: 8,
          wisdom: 8,
          charisma: 8,
        },
        applicableAbilities: ['wisdom'],
        skills: [],
        proficientSkills: [],
        proficiencyBonus: 2,
        hp: 1,
        maxHp: 1,
        facts: [],
        quantities: [],
      },
    }),
    execution: executionFor(abstractSignalTransferPlan, abstractSignalItems),
    clockHeld: false,
    now: 0,
    rollDie: () => {
      throw new Error('An automatic transfer must not roll');
    },
  });
  assert.equal(transition.state, 'settled');
  assert.equal(transition.receipt.outcome, 'automatic');
  assert.deepEqual(transition.receipt.worldEffects, [
    {
      kind: 'item.transfer.v1',
      itemKey: 'signal-token',
      fromHolder: 'process-source',
      toHolder: 'process-sink',
    },
  ]);
});
