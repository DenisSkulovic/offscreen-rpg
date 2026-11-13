import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actorFromLegacyCharacter,
  actorHasHealth,
  checkSubjectFromActor,
  legacyCharacterFromActor,
  parseActorState,
} from '../dist/src/actor.js';
import { resolveCheck } from '../dist/src/checks.js';
import { characterSchema } from '../dist/src/state.js';

const human = characterSchema.parse({
  name: 'Mara',
  scores: {
    strength: 10,
    dexterity: 12,
    constitution: 12,
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
  hp: 10,
  maxHp: 10,
  facts: [],
  quantities: [],
});

const microbe = characterSchema.parse({
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
  skills: [
    { id: 'environment-sensing', label: 'Environmental sensing' },
  ],
  proficientSkills: ['environment-sensing'],
  proficiencyBonus: 2,
  facts: [{ id: 'exposed', value: true }],
  quantities: [],
});

test('legacy humans keep health through the actor envelope round trip', () => {
  const actor = actorFromLegacyCharacter(human);
  assert.equal(actorHasHealth(actor), true);
  assert.deepEqual(legacyCharacterFromActor(actor), human);
});

test('a microbe without health remains healthless and can still check', () => {
  assert.equal(microbe.hp, undefined);
  assert.equal(microbe.maxHp, undefined);
  const actor = actorFromLegacyCharacter(microbe);
  assert.equal(actorHasHealth(actor), false);
  assert.deepEqual(legacyCharacterFromActor(actor), microbe);
  const subject = checkSubjectFromActor(actor);
  const roll = resolveCheck(
    subject,
    {
      rule: 'srd-5.2.1-subset.v1',
      purpose: 'Sense a gradient',
      skill: 'environment-sensing',
      ability: 'wisdom',
      dc: 12,
      advantage: false,
      disadvantage: false,
      modifiers: [],
    },
    () => 15,
  );
  assert.equal(roll.success, true);
  assert.throws(
    () =>
      resolveCheck(
        subject,
        {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Lift a rock',
          skill: null,
          ability: 'strength',
          dc: 10,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        () => 20,
      ),
    /not applicable/,
  );
});

test('parseActorState accepts legacy JSON and versioned envelopes', () => {
  assert.deepEqual(parseActorState(human), actorFromLegacyCharacter(human));
  const envelope = actorFromLegacyCharacter(microbe);
  assert.deepEqual(parseActorState(envelope), envelope);
  assert.equal(
    characterSchema.safeParse({
      ...human,
      hp: 3,
      maxHp: undefined,
    }).success,
    false,
  );
});
