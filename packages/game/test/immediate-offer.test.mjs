import assert from 'node:assert/strict';
import test from 'node:test';
import {
  immediateActionContentSchema,
  validateImmediateActionProposal,
} from '../dist/src/immediate-actions.js';
import { composeOpportunities } from '../dist/src/opportunities.js';
import { selectOfferAction } from '../dist/src/offers.js';

const character = {
  name: 'A microbe',
  scores: {
    strength: 8,
    dexterity: 12,
    constitution: 14,
    intelligence: 8,
    wisdom: 12,
    charisma: 8,
  },
  proficientSkills: [],
  proficiencyBonus: 2,
  hp: 5,
  maxHp: 5,
  facts: [{ id: 'exposed', value: true }],
  quantities: [],
};

const content = immediateActionContentSchema.parse({
  version: 1,
  id: 'test',
  plans: [
    {
      version: 1,
      key: 'contract',
      label: 'Contract',
      intention: 'Contract away from the disturbance.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      resolution: {
        kind: 'automatic',
        outcome: { text: 'The microbe contracts.', effects: [] },
      },
    },
  ],
});

test('public offer contains no private resolution mechanics', () => {
  const { offer, plans } = composeOpportunities({
    id: '52a3f0b0-5405-4d58-a58e-a96759371852',
    content,
    character,
    busy: false,
  });
  assert.deepEqual(offer.nodes[0]?.action, { kind: 'attempt' });
  assert.equal(JSON.stringify(offer).includes('resolution'), false);
  assert.equal(plans[0]?.resolution.kind, 'automatic');
  assert.deepEqual(selectOfferAction(offer, ['contract']), {
    state: 'selected',
    actionKey: 'contract',
  });
});

test('unmet prerequisites and busy state publish no private or public action', () => {
  const unavailable = composeOpportunities({
    id: 'ce3d19da-7d24-436c-80b9-20a96517333f',
    content,
    character: { ...character, facts: [{ id: 'exposed', value: false }] },
    busy: false,
  });
  const busy = composeOpportunities({
    id: 'cf9bbb0b-c084-4580-aa5f-ee683b150c51',
    content,
    character,
    busy: true,
  });
  assert.deepEqual(unavailable, { offer: { id: unavailable.offer.id, nodes: [] }, plans: [] });
  assert.deepEqual(busy, { offer: { id: busy.offer.id, nodes: [] }, plans: [] });
});

test('proposal validation returns bounded diagnostics without applying mechanics', () => {
  const proposal = structuredClone(content.plans[0]);
  proposal.evidence = ['p1', 'p1', 'other-story'];
  proposal.resolution.outcome.effects = [
    { kind: 'fact.set.v1', fact: { id: 'invented', value: true } },
  ];
  const result = validateImmediateActionProposal({
    proposal,
    character,
    evidenceHandles: new Set(['p1']),
  });
  assert.equal(result.kind, 'rejected');
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ['duplicate-evidence', 'unknown-evidence', 'unknown-fact'],
  );
  assert.deepEqual(character.facts, [{ id: 'exposed', value: true }]);
});

test('proposal validation rejects ungrounded situational modifiers', () => {
  const proposal = {
    ...structuredClone(content.plans[0]),
    resolution: {
      kind: 'check',
      check: {
        rule: 'srd-5.2.1-subset.v1',
        purpose: 'Sense a gradient',
        skill: 'environment-sensing',
        ability: 'wisdom',
        dc: 12,
        advantage: true,
        disadvantage: false,
        modifiers: [],
      },
      difficultyBasis: 'The signal is weak.',
      success: { text: 'Detected.', effects: [] },
      failure: { text: 'Not detected.', effects: [] },
    },
  };
  const result = validateImmediateActionProposal({
    proposal,
    character,
    evidenceHandles: new Set(),
  });
  assert.equal(result.kind, 'rejected');
  assert.equal(result.issues[0]?.code, 'unsupported-modifier');
});
