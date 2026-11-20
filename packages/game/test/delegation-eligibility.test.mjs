import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DECLINE_HARMLESS_INVITATION_CLASS,
  isDeclineHarmlessInvitation,
} from '../dist/src/delegation-eligibility.js';
import { immediateActionPlanSchema } from '../dist/src/immediate-actions.js';

test('safe automatic marker passes; check and transfer fail', () => {
  const safe = immediateActionPlanSchema.parse({
    version: 1,
    key: 'decline',
    label: 'Decline',
    intention: 'Politely withdraw',
    risk: null,
    evidence: [],
    requires: [],
    delegationMarker: DECLINE_HARMLESS_INVITATION_CLASS,
    resolution: {
      kind: 'automatic',
      fictionalDurationSeconds: 5,
      outcome: {
        text: 'You decline.',
        effects: [],
        declarations: [],
        worldEffects: [],
      },
    },
  });
  assert.equal(isDeclineHarmlessInvitation(safe), true);

  const checkWithMarker = immediateActionPlanSchema.parse({
    version: 1,
    key: 'risky-check',
    label: 'Risky',
    intention: 'Try anyway',
    risk: 'Low',
    evidence: [],
    requires: [],
    delegationMarker: DECLINE_HARMLESS_INVITATION_CLASS,
    resolution: {
      kind: 'check',
      fictionalDurationSeconds: 10,
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Try',
        skill: 'persuasion',
        ability: 'charisma',
        dc: 10,
        advantage: false,
        disadvantage: false,
        modifiers: [],
      },
      difficultyBasis: 'Hard',
      success: { text: 'ok', effects: [], declarations: [] },
      failure: { text: 'no', effects: [], declarations: [] },
    },
  });
  assert.equal(isDeclineHarmlessInvitation(checkWithMarker), false);

  const transferWithMarker = immediateActionPlanSchema.parse({
    version: 1,
    key: 'masked-transfer',
    label: 'Masked transfer',
    intention: 'Move goods',
    risk: null,
    evidence: [],
    requires: [],
    delegationMarker: DECLINE_HARMLESS_INVITATION_CLASS,
    resolution: {
      kind: 'automatic',
      fictionalDurationSeconds: 5,
      outcome: {
        text: 'Moved',
        effects: [],
        declarations: [],
        worldEffects: [
          {
            kind: 'item.transfer.v1',
            itemKey: 'token',
            fromHolder: 'a',
            toHolder: 'b',
          },
        ],
      },
    },
  });
  assert.equal(isDeclineHarmlessInvitation(transferWithMarker), false);
});