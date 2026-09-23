import type { StorytellerTask } from '../../tasks';
import { factValue, outcome, type MechanicalCharacter } from './shared';

export function seydaNeenOpeningPlans(character: MechanicalCharacter) {
  if (factValue(character.facts, 'location') !== 'seyda-neen') {
    return null;
  }
  const routeKnown = factValue(character.facts, 'balmora-route-known') === true;
  const shiftAvailable =
    factValue(character.facts, 'warehouse-shift-available') === true;
  return [
    {
      version: 1,
      key: 'ask-about-the-road',
      label: 'Ask about the road to Balmora',
      intention:
        'Speak with a local and sort reliable directions from casual advice.',
      risk: 'A poor read may leave the route uncertain.',
      evidence: [],
      requires: [{ id: 'balmora-route-known', value: false }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'check',
        fictionalDurationSeconds: 5,
        check: {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Learn the safe road to Balmora',
          skill: 'persuasion',
          ability: 'charisma',
          dc: 10,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        difficultyBasis:
          'The road is commonly travelled, but the stranger must make sense of local directions.',
        success: outcome(
          'A local marks the north road and its safer crossings.',
          [
            {
              kind: 'fact.set.v1',
              fact: { id: 'balmora-route-known', value: true },
            },
          ],
        ),
        failure: outcome(
          'The directions dissolve into contradictory landmarks and marsh paths.',
        ),
      },
    },
    {
      version: 1,
      key: 'work-warehouse-shift',
      label: 'Work the warehouse shift',
      intention:
        'Spend a bounded shift moving and recording cargo for modest pay.',
      risk: 'The work is tiring, and careless handling can slow the shift.',
      evidence: [],
      requires: [
        { id: 'location', value: 'seyda-neen' },
        { id: 'warehouse-shift-available', value: true },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'work-warehouse-shift',
          label: 'Work the warehouse shift',
          description:
            'Move and record cargo until the admitted warehouse shift ends.',
          requires: [
            { id: 'location', value: 'seyda-neen' },
            { id: 'warehouse-shift-available', value: true },
          ],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Warehouse work completed',
            requiredFictionalSeconds: 1_800,
          },
          conditionPolicy: {
            kind: 'boundary',
            blockedText:
              'The warehouse shift cannot continue after its admitted conditions change.',
          },
          occurrence: {
            kind: 'limited',
            scopeKey: 'seyda-neen-warehouse-shifts',
            limit: 1,
          },
          completionFollowUp: 'scene',
          checks: [],
          completion: {
            text: 'After thirty minutes, the warehouse shift ends and the clerk counts out the agreed six septims.',
            effects: [
              {
                kind: 'quantity.change.v1',
                quantityId: 'septims',
                delta: 6,
              },
              {
                kind: 'fact.set.v1',
                fact: { id: 'warehouse-shift-available', value: false },
              },
            ],
          },
        },
      },
    },
    {
      version: 1,
      key: 'travel-toward-balmora',
      label: 'Set out toward Balmora',
      intention: 'Leave Seyda Neen and follow the known road north.',
      risk: 'The marsh road consumes time and leaves the settlement behind.',
      evidence: [],
      requires: [
        { id: 'location', value: 'seyda-neen' },
        { id: 'balmora-route-known', value: true },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'travel-toward-balmora',
          label: 'Travel toward Balmora',
          description:
            'Follow the north road through the first marsh crossing.',
          requires: [
            { id: 'location', value: 'seyda-neen' },
            { id: 'balmora-route-known', value: true },
          ],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Road travelled',
            requiredFictionalSeconds: 8,
          },
          conditionPolicy: {
            kind: 'boundary',
            blockedText: 'The admitted route is no longer available.',
          },
          occurrence: { kind: 'unbounded' },
          completionFollowUp: 'scene',
          checks: [],
          completion: {
            text: 'The first marsh crossing falls behind as the road bends north.',
            effects: [
              {
                kind: 'fact.set.v1',
                fact: { id: 'location', value: 'balmora-road' },
              },
            ],
          },
        },
      },
    },
  ].filter(
    (plan) =>
      (plan.key !== 'ask-about-the-road' || !routeKnown) &&
      (plan.key !== 'work-warehouse-shift' || shiftAvailable) &&
      (plan.key !== 'travel-toward-balmora' || routeKnown),
  );
}

export function seydaNeenConsequence(
  resolution: NonNullable<StorytellerTask['context']['resolution']>,
  evidence: string,
) {
  const character = resolution.character;
  const location = factValue(character.facts, 'location');
  if (location !== 'seyda-neen' && location !== 'balmora-road') {
    return null;
  }
  if (location === 'balmora-road') {
    return [
      {
        version: 1,
        key: 'continue-north',
        label: 'Continue north',
        intention: 'Keep following the road toward Balmora.',
        risk: null,
        evidence: [evidence],
        requires: [{ id: 'location', value: 'balmora-road' }],
        requiresStory: [],
        requiresQuantities: [],
        resolution: {
          kind: 'automatic',
          fictionalDurationSeconds: 5,
          outcome: outcome('You continue north along the raised road.'),
        },
      },
    ];
  }
  return (seydaNeenOpeningPlans(character) ?? []).map((plan) => ({
    ...plan,
    evidence: [evidence],
  }));
}
