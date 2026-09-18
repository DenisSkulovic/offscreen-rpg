import assert from 'node:assert/strict';
import test from 'node:test';
import { immediateActionContentSchema } from '../dist/src/immediate-actions.js';
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
