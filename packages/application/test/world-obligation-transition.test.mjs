import assert from 'node:assert/strict';
import test from 'node:test';
import { decideActionExecutionTransition } from '../dist/campaign/action-execution-transition.js';

const operationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const state = {
  storyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  settingsRevision: 1,
  locked: 0,
  character: {
    name: 'A microbe',
    scores: {
      strength: 8,
      dexterity: 12,
      constitution: 14,
      intelligence: 8,
      wisdom: 12,
      charisma: 8,
    },
    applicableAbilities: ['constitution', 'wisdom'],
    skills: [],
    proficientSkills: [],
    proficiencyBonus: 2,
    hp: 5,
    maxHp: 5,
    facts: [{ id: 'exposed', value: true }],
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
};
const execution = {
  operationId,
  revision: 0,
  targetGameSecond: 10,
  controllingGameSecond: 5,
  plan: {
    version: 1,
    key: 'sense',
    label: 'Sense the current',
    intention: 'Sense the current before it changes.',
    risk: null,
    evidence: [],
    requires: [],
    resolution: {
      kind: 'automatic',
      fictionalDurationSeconds: 10,
      outcome: {
        text: 'The current is sensed.',
        effects: [],
        declarations: [],
      },
    },
  },
};

test('a hard cutoff owns equality before finite action effects', () => {
  const transition = decideActionExecutionTransition({
    state,
    execution,
    clockHeld: false,
    now: 0,
    rollDie: () => {
      throw new Error('An interrupted action must not resolve or roll');
    },
  });
  assert.equal(transition.state, 'interrupted');
  assert.equal(transition.campaign.gameSecond, 5);
  assert.equal(transition.campaign.activeActionOperationId, null);
  assert.equal(transition.fact.gameSecond, 5);
  assert.deepEqual(transition.campaign.character, state.character);
});
