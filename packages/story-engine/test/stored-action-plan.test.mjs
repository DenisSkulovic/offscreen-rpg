import assert from 'node:assert/strict';
import test from 'node:test';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { narrativeIntentPlanSchema } from '@offscreen/game/narrative-intent';
import {
  isImmediateActionPlan,
  isNarrativeIntentPlan,
  parseStoredActionPlan,
} from '../dist/campaign/stored-action-plan.js';

const narrativePlan = narrativeIntentPlanSchema.parse({
  kind: 'narrative-intent.v1',
  key: 'linger',
  label: 'Linger by the brazier',
  intention: 'Watch the embers and listen.',
  risk: 'Someone may notice your delay.',
  fictionalDurationSeconds: 60,
  effects: [],
});

const immediatePlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'strike',
  label: 'Strike',
  intention: 'Swing the blade.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'automatic',
    fictionalDurationSeconds: 5,
    outcome: {
      text: 'Done.',
      effects: [],
      declarations: [],
    },
  },
});

test('parseStoredActionPlan reads narrative-intent.v1', () => {
  const parsed = parseStoredActionPlan(narrativePlan);
  assert.equal(isNarrativeIntentPlan(parsed), true);
  assert.equal(isImmediateActionPlan(parsed), false);
});

test('parseStoredActionPlan reads legacy immediate plans without kind', () => {
  const parsed = parseStoredActionPlan(immediatePlan);
  assert.equal(isImmediateActionPlan(parsed), true);
  assert.equal(isNarrativeIntentPlan(parsed), false);
});