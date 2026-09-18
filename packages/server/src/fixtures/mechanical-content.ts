import { characterSchema, type OutcomeEffect, type CheckPlan } from '@offscreen/contracts/campaign';
import { actionContentSchema, type ActionDefinition } from '../rules/action-content';
import { composeOpportunities } from '../rules/opportunities';

const fact = (id: string, value: string | boolean): OutcomeEffect => ({ kind: 'fact.set.v1', fact: { id, value } });
const completion = (text: string, effects: OutcomeEffect[] = []) => ({ text, effects });
const outcome = (text: string, effects: OutcomeEffect[] = [], interrupts = false) => ({ text, effects, interrupts });
function check(purpose: string, skill: string, ability: CheckPlan['ability'], dc = 12): CheckPlan {
  return { rule: 'srd-5.2.1-subset.v1', purpose, skill, ability, dc, advantage: false, disadvantage: false, modifiers: [] };
}

// This is selected content, not a rules-engine default. No profile changes its mechanics.
export const pineappleCharacter = characterSchema.parse({
  name: 'SpongeBob',
  scores: { strength: 10, dexterity: 12, constitution: 12, intelligence: 10, wisdom: 14, charisma: 14 },
  proficientSkills: ['persuasion', 'perception'], proficiencyBonus: 2, hp: 10, maxHp: 10,
  facts: [{ id: 'gary-alert', value: true }, { id: 'under-cover', value: false }, { id: 'location', value: 'pineapple' }],
});
const calmGary: ActionDefinition = {
  id: 'talk-gary', label: 'Ask Gary to lower the weapon',
  description: 'Try to calm him: Charisma (Persuasion), DC 12. An immediate exchange.',
  requires: [{ id: 'gary-alert', value: true }], durationMs: 0,
  checks: [{ id: 'persuasion', everyMs: 1, resolution: { kind: 'ability', plan: check('Calm Gary', 'persuasion', 'charisma') },
    success: outcome('Gary lowers the weapon.', [fact('gary-alert', false)]),
    failure: outcome('Gary remains on alert. He has not agreed to lower the weapon.') }],
  completion: completion('Your attempt to speak to Gary is resolved.'),
};
export const pineappleContent = actionContentSchema.parse({
  version: 1, id: 'pineapple-mechanics.v2', actions: [
    calmGary,
    { id: 'cover', label: 'Duck behind the furniture', description: 'Seek cover immediately.',
      requires: [{ id: 'gary-alert', value: true }, { id: 'under-cover', value: false }], durationMs: 0, checks: [],
      completion: completion('You take cover behind the furniture.', [fact('under-cover', true)]) },
    { id: 'observe', label: 'Watch Gary from cover', description: 'Wisdom (Perception), DC 12. Look for what has alarmed him.',
      requires: [{ id: 'under-cover', value: true }], durationMs: 0,
      checks: [{ id: 'notice', everyMs: 1, resolution: { kind: 'ability', plan: check('Read Gary’s warning', 'perception', 'wisdom') },
        success: outcome('Gary is watching the window, not you.'), failure: outcome('You cannot tell what Gary is watching.') }],
      completion: completion('You finish watching from cover.') },
    { id: 'quiet', label: 'Spend a quiet minute at home', description: 'Available once Gary is calm. Takes one game minute at the selected pace.',
      requires: [{ id: 'gary-alert', value: false }], durationMs: 60000, checks: [],
      completion: completion('A quiet minute passes at home.') },
  ],
});

// Contrasting fixtures use the exact same action/fact/clock contract, without wallets or places.
export const microbeCharacter = characterSchema.parse({
  name: 'A microbe', scores: { strength: 8, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 12, charisma: 8 },
  proficientSkills: ['environment-sensing'], proficiencyBonus: 2, hp: 5, maxHp: 5,
  facts: [{ id: 'exposed', value: true }, { id: 'gradient-disrupted', value: false }],
});
export const microbeContent = actionContentSchema.parse({
  version: 1, id: 'microbe.v1', actions: [{
    id: 'respond', label: 'Respond to the chemical gradient', description: 'Attempt an environmental response over ten game seconds.',
    requires: [{ id: 'exposed', value: true }, { id: 'gradient-disrupted', value: false }], durationMs: 10000,
    checks: [{
      id: 'environment', everyMs: 5000,
      resolution: { kind: 'event', purpose: 'Chemical gradient disruption', threshold: 3, modifiers: [] },
      success: outcome('The gradient changes abruptly, interrupting the response.', [fact('gradient-disrupted', true)], true),
      failure: outcome('The gradient remains stable.'),
    }, { id: 'response', everyMs: 10000, resolution: { kind: 'ability', plan: check('Sense the gradient', 'environment-sensing', 'wisdom') },
      success: outcome('The microbe reaches a sheltered pocket.', [fact('exposed', false)]),
      failure: outcome('The microbe remains exposed.') }],
    completion: completion('The response interval ends.'),
  }, {
    id: 'wait-for-gradient', label: 'Wait for the gradient to settle',
    description: 'Wait five game seconds before attempting a new response. The interrupted attempt is not completed.',
    requires: [{ id: 'gradient-disrupted', value: true }], durationMs: 5000, checks: [],
    completion: completion('The gradient settles.', [fact('gradient-disrupted', false)]),
  }],
});

export function mechanicalOpening(id: string) {
  const seeds = {
    'pineapple-mechanics.v2': {
      character: pineappleCharacter, content: pineappleContent,
      opening: { version: 1 as const, title: 'An alarming morning', paragraphs: ['You wake in the pineapple. Gary is alert beside the window, with a machine gun balanced on his shell. There is furniture nearby that could provide cover.'] },
    },
    'microbe.v1': {
      character: microbeCharacter, content: microbeContent,
      opening: { version: 1 as const, title: 'A changing environment', paragraphs: ['You are a microbe exposed to a changing chemical gradient. A sheltered pocket may be within reach.'] },
    },
  };
  const seed = Object.entries(seeds).find(([key]) => key === id)?.[1];
  if (!seed) {
    throw new Error('Unknown mechanical content');
  }
  return { ...seed, offer: composeOpportunities(seed.content, seed.character, false) };
}


