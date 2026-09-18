import { randomUUID } from 'node:crypto';
import {
  immediateActionContentSchema,
  type ImmediateActionPlan,
} from '@offscreen/game/immediate-actions';
import type { CheckPlan } from '@offscreen/game/checks';
import type { OutcomeEffect } from '@offscreen/game/effects';
import { composeOpportunities } from '@offscreen/game/opportunities';
import { characterSchema } from '@offscreen/game/state';

const fact = (id: string, value: string | boolean): OutcomeEffect => ({
  kind: 'fact.set.v1',
  fact: { id, value },
});
const outcome = (text: string, effects: OutcomeEffect[] = []) => ({ text, effects });
function check(
  purpose: string,
  skill: string,
  ability: CheckPlan['ability'],
  dc = 12,
): CheckPlan {
  return {
    rule: 'srd-5.2.1-subset.v1',
    purpose,
    skill,
    ability,
    dc,
    advantage: false,
    disadvantage: false,
    modifiers: [],
  };
}

// This is selected content, not a rules-engine default. No profile changes its mechanics.
export const pineappleCharacter = characterSchema.parse({
  name: 'SpongeBob',
  scores: {
    strength: 10,
    dexterity: 12,
    constitution: 12,
    intelligence: 10,
    wisdom: 14,
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
  skills: [
    { id: 'persuasion', label: 'Persuasion' },
    { id: 'perception', label: 'Perception' },
  ],
  proficientSkills: ['persuasion', 'perception'],
  proficiencyBonus: 2,
  hp: 10,
  maxHp: 10,
  facts: [
    { id: 'gary-alert', value: true },
    { id: 'under-cover', value: false },
    { id: 'location', value: 'pineapple' },
  ],
});
const calmGary: ImmediateActionPlan = {
  version: 1,
  key: 'talk-gary',
  label: 'Ask Gary to lower the weapon',
  intention: 'Try to calm Gary and learn why he is armed.',
  risk: 'Gary may remain distrustful.',
  evidence: [],
  requires: [{ id: 'gary-alert', value: true }],
  resolution: {
    kind: 'check',
    check: check('Calm Gary', 'persuasion', 'charisma'),
    difficultyBasis: 'Gary is alarmed but recognizes SpongeBob.',
    success: outcome('Gary lowers the weapon.', [fact('gary-alert', false)]),
    failure: outcome('Gary remains on alert. He has not agreed to lower the weapon.'),
  },
};
export const pineappleContent = immediateActionContentSchema.parse({
  version: 1,
  id: 'pineapple-mechanics.v4',
  plans: [
    calmGary,
    {
      version: 1,
      key: 'cover',
      label: 'Duck behind the furniture',
      intention: 'Seek cover immediately.',
      risk: null,
      evidence: [],
      requires: [
        { id: 'gary-alert', value: true },
        { id: 'under-cover', value: false },
      ],
      resolution: {
        kind: 'automatic',
        outcome: outcome('You take cover behind the furniture.', [
          fact('under-cover', true),
        ]),
      },
    },
    {
      version: 1,
      key: 'observe',
      label: 'Watch Gary from cover',
      intention: 'Look for what has alarmed Gary without leaving cover.',
      risk: 'You may fail to identify the threat.',
      evidence: [],
      requires: [{ id: 'under-cover', value: true }],
      resolution: {
        kind: 'check',
        check: check('Read Gary’s warning', 'perception', 'wisdom'),
        difficultyBasis: 'The room offers cover but Gary is behaving erratically.',
        success: outcome('Gary is watching the window, not you.'),
        failure: outcome('You cannot tell what Gary is watching.'),
      },
    },
  ],
});

// Contrasting fixtures use the exact same action/fact/clock contract, without wallets or places.
export const microbeCharacter = characterSchema.parse({
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
  skills: [{ id: 'environment-sensing', label: 'Environmental sensing' }],
  proficientSkills: ['environment-sensing'],
  proficiencyBonus: 2,
  hp: 5,
  maxHp: 5,
  facts: [
    { id: 'exposed', value: true },
    { id: 'gradient-disrupted', value: false },
  ],
});
export const microbeContent = immediateActionContentSchema.parse({
  version: 1,
  id: 'microbe.v3',
  plans: [
    {
      version: 1,
      key: 'respond',
      label: 'Respond to the chemical gradient',
      intention: 'Sense the gradient and move toward the sheltered pocket.',
      risk: 'The changing gradient may keep the microbe exposed.',
      evidence: [],
      requires: [
        { id: 'exposed', value: true },
        { id: 'gradient-disrupted', value: false },
      ],
      resolution: {
        kind: 'check',
        check: check('Sense the gradient', 'environment-sensing', 'wisdom'),
        difficultyBasis: 'The gradient is changing but a sheltered pocket is detectable.',
        success: outcome('The microbe reaches a sheltered pocket.', [
          fact('exposed', false),
        ]),
        failure: outcome('The microbe remains exposed.'),
      },
    },
    {
      version: 1,
      key: 'contract',
      label: 'Contract away from the disturbance',
      intention: 'Make an immediate protective response without trying to reach shelter.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      resolution: {
        kind: 'automatic',
        outcome: outcome('The microbe contracts away from the strongest disturbance.'),
      },
    },
  ],
});

export function mechanicalOpening(id: string) {
  const seeds = {
    'pineapple-mechanics.v4': {
      character: pineappleCharacter,
      content: pineappleContent,
      opening: {
        version: 1 as const,
        title: 'An alarming morning',
        paragraphs: [
          'You wake in the pineapple. Gary is alert beside the window, with a machine gun balanced on his shell. There is furniture nearby that could provide cover.',
        ],
      },
    },
    'microbe.v3': {
      character: microbeCharacter,
      content: microbeContent,
      opening: {
        version: 1 as const,
        title: 'A changing environment',
        paragraphs: [
          'You are a microbe exposed to a changing chemical gradient. A sheltered pocket may be within reach.',
        ],
      },
    },
  };
  const seed = Object.entries(seeds).find(([key]) => key === id)?.[1];
  if (!seed) {
    throw new Error('Unknown mechanical content');
  }
  const opportunities = composeOpportunities({
    id: randomUUID(),
    content: seed.content,
    character: seed.character,
    busy: false,
  });
  return {
    ...seed,
    offer: opportunities.offer,
  };
}
