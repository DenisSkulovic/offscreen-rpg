import type { StorytellerTask } from '../../tasks';
import { factValue, outcome, type MechanicalCharacter } from './shared';

export function pineappleOpeningPlans(character: MechanicalCharacter) {
  if (
    factValue(character.facts, 'location') !== 'pineapple' ||
    factValue(character.facts, 'gary-alert') !== true ||
    factValue(character.facts, 'under-cover') !== false
  ) {
    return null;
  }
  return [
    {
      version: 1,
      key: 'take-cover',
      label: 'Slip behind the sofa',
      intention: 'Put solid furniture between you and the rattling delivery.',
      risk: null,
      evidence: [],
      requires: [
        { id: 'gary-alert', value: true },
        { id: 'under-cover', value: false },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 5,
        outcome: outcome(
          'You slip behind the sofa without approaching the window.',
          [{ kind: 'fact.set.v1', fact: { id: 'under-cover', value: true } }],
        ),
      },
    },
    {
      version: 1,
      key: 'calm-gary',
      label: 'Talk Gary down',
      intention: 'Reassure Gary and ask what made the delivery seem dangerous.',
      risk: 'A clumsy reassurance may deepen his alarm.',
      evidence: [],
      requires: [{ id: 'gary-alert', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'check',
        fictionalDurationSeconds: 5,
        check: {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Calm Gary',
          skill: 'persuasion',
          ability: 'charisma',
          dc: 12,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        difficultyBasis:
          'Gary recognizes you, but the delivery is still moving on its own.',
        success: outcome(
          'Gary steadies himself and stops bristling at every sound.',
          [{ kind: 'fact.set.v1', fact: { id: 'gary-alert', value: false } }],
        ),
        failure: outcome(
          'Gary remains tense and turns one wary eyestalk toward you.',
        ),
      },
    },
    {
      version: 1,
      key: 'keep-distance',
      label: 'Call from the doorway',
      intention: 'Keep your distance and ask Gary to signal what he noticed.',
      risk: 'Distance is safer, but his answer may be hard to interpret.',
      evidence: [],
      requires: [{ id: 'gary-alert', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 5,
        outcome: outcome(
          'You stay by the doorway while Gary points both eyestalks toward the window.',
        ),
      },
    },
  ];
}

export function pineappleConsequence(
  resolution: NonNullable<StorytellerTask['context']['resolution']>,
  evidence: string,
) {
  const { character, storyFacts } = resolution;
  if (factValue(character.facts, 'location') !== 'pineapple') {
    return null;
  }
  const garyAlert = factValue(character.facts, 'gary-alert') === true;
  const underCover = factValue(character.facts, 'under-cover') === true;
  const deliverySeen =
    factValue(storyFacts, 'delivery-at-window') === 'rattling-parcel';
  const parcelResolved =
    factValue(storyFacts, 'parcel-secured') === true ||
    factValue(storyFacts, 'parcel-left-outside') === true;

  if (parcelResolved) {
    return [];
  }
  if (deliverySeen) {
    return [
      {
        version: 1,
        key: 'draw-parcel-closer',
        label: 'Hook the parcel closer',
        intention:
          'Use kitchen tongs to pull the parcel within reach without touching it directly.',
        risk: 'The rattling may intensify when the parcel moves.',
        evidence: [evidence],
        requires: [],
        requiresStory: [{ id: 'delivery-at-window', value: 'rattling-parcel' }],
        requiresQuantities: [],
        resolution: {
          kind: 'check',
          fictionalDurationSeconds: 5,
          check: {
            rule: 'srd-5.2.1-subset.v1',
            purpose: 'Draw the parcel closer safely',
            skill: null,
            ability: 'dexterity',
            dc: 12,
            advantage: false,
            disadvantage: false,
            modifiers: [],
          },
          difficultyBasis:
            'The parcel is within reach, but it moves unpredictably.',
          success: outcome(
            'The tongs drag the parcel into a clear patch of floor.',
            [],
            [
              {
                fact: { id: 'parcel-secured', value: true },
                evidence: [evidence],
              },
            ],
          ),
          failure: outcome(
            'The parcel jerks away from the tongs and keeps rattling by the window.',
          ),
        },
      },
      {
        version: 1,
        key: 'leave-parcel-outside',
        label: 'Leave it outside',
        intention:
          'Close the curtain, keep clear, and refuse the delivery for now.',
        risk: 'Whatever sent it may not simply go away.',
        evidence: [evidence],
        requires: [],
        requiresStory: [{ id: 'delivery-at-window', value: 'rattling-parcel' }],
        requiresQuantities: [],
        resolution: {
          kind: 'automatic',
          fictionalDurationSeconds: 5,
          outcome: outcome(
            'You leave the parcel outside and keep the window closed.',
            [],
            [
              {
                fact: { id: 'parcel-left-outside', value: true },
                evidence: [evidence],
              },
            ],
          ),
        },
      },
    ];
  }
  if (underCover) {
    return [
      {
        version: 1,
        key: 'inspect-from-cover',
        label: 'Watch the window from cover',
        intention: 'Identify what has Gary alarmed without leaving the sofa.',
        risk: 'The angle is poor and the movement may be misleading.',
        evidence: [evidence],
        requires: [{ id: 'under-cover', value: true }],
        requiresStory: [],
        requiresQuantities: [],
        resolution: {
          kind: 'check',
          fictionalDurationSeconds: 5,
          check: {
            rule: 'srd-5.2.1-subset.v1',
            purpose: 'Identify the disturbance',
            skill: 'perception',
            ability: 'wisdom',
            dc: 12,
            advantage: false,
            disadvantage: false,
            modifiers: [],
          },
          difficultyBasis:
            'The sofa provides safety but obscures part of the window.',
          success: outcome(
            'You spot a damp parcel rattling against the outside sill.',
            [],
            [
              {
                fact: { id: 'delivery-at-window', value: 'rattling-parcel' },
                evidence: [evidence],
              },
            ],
          ),
          failure: outcome(
            'From this angle, you can only confirm that something keeps striking the sill.',
          ),
        },
      },
      {
        version: 1,
        key: 'leave-cover',
        label: 'Come out beside Gary',
        intention: 'Give up the safer angle and face the window beside Gary.',
        risk: 'You will be exposed to whatever is outside.',
        evidence: [evidence],
        requires: [{ id: 'under-cover', value: true }],
        requiresStory: [],
        requiresQuantities: [],
        resolution: {
          kind: 'automatic',
          fictionalDurationSeconds: 5,
          outcome: outcome(
            'You leave the sofa and join Gary beside the window.',
            [
              {
                kind: 'fact.set.v1',
                fact: { id: 'under-cover', value: false },
              },
            ],
          ),
        },
      },
    ];
  }
  if (garyAlert) {
    return pineappleOpeningPlans(character);
  }
  return [
    {
      version: 1,
      key: 'inspect-with-gary',
      label: 'Inspect the window together',
      intention: 'Approach with Gary and identify the source of the rattling.',
      risk: 'Calm helps, but the source is still unknown.',
      evidence: [evidence],
      requires: [{ id: 'gary-alert', value: false }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'check',
        fictionalDurationSeconds: 5,
        check: {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Identify the disturbance',
          skill: 'perception',
          ability: 'wisdom',
          dc: 10,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        difficultyBasis:
          'Gary is calm enough to point out the movement at the window.',
        success: outcome(
          'Together you identify a damp parcel rattling on the outside sill.',
          [],
          [
            {
              fact: { id: 'delivery-at-window', value: 'rattling-parcel' },
              evidence: [evidence],
            },
          ],
        ),
        failure: outcome(
          'The movement stops whenever either of you looks directly at it.',
        ),
      },
    },
  ];
}
