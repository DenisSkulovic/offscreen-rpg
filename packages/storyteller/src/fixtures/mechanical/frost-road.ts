import type { StorytellerTask } from '../../tasks';
import { factValue, outcome, type MechanicalCharacter } from './shared';

export function frostRoadOpeningPlans(character: MechanicalCharacter) {
  if (
    factValue(character.facts, 'location') !== 'frost-road' ||
    factValue(character.facts, 'winter-shelter') !== false
  ) {
    return null;
  }
  return [
    {
      version: 1,
      key: 'cross-frost-road',
      label: 'Cross the Frost Road',
      intention:
        'Commit to the sixty-day crossing before winter closes the exposed pass.',
      risk: 'Winter may close the pass before the crossing is complete.',
      evidence: [],
      requires: [
        { id: 'location', value: 'frost-road' },
        { id: 'winter-shelter', value: false },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'cross-frost-road',
          label: 'Cross the Frost Road',
          description: 'Travel the exposed road for sixty eligible world days.',
          requires: [
            { id: 'location', value: 'frost-road' },
            { id: 'winter-shelter', value: false },
          ],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Road crossed',
            requiredFictionalSeconds: 60,
          },
          conditionPolicy: { kind: 'admission-only' },
          occurrence: { kind: 'unbounded' },
          completionFollowUp: 'scene',
          checks: [],
          completion: {
            text: 'The crossing reaches the far side of the Frost Road.',
            effects: [
              {
                kind: 'fact.set.v1',
                fact: { id: 'location', value: 'far-valley' },
              },
            ],
          },
        },
      },
    },
  ];
}

export function frostRoadConsequence(
  resolution: NonNullable<StorytellerTask['context']['resolution']>,
  evidence: string,
  worldConditions: StorytellerTask['context']['worldConditions'],
) {
  if (factValue(resolution.character.facts, 'location') !== 'frost-road') {
    return null;
  }
  const winterClosed = worldConditions?.some(
    (condition) =>
      condition.id === 'frost-pass' && condition.value === 'closed',
  );
  if (!winterClosed) {
    return [];
  }
  return [
    {
      version: 1,
      key: 'make-winter-camp',
      label: 'Make winter camp',
      intention:
        'Stop the interrupted crossing and shelter below the closed pass.',
      risk: null,
      evidence: [evidence],
      requires: [
        { id: 'location', value: 'frost-road' },
        { id: 'winter-shelter', value: false },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 1,
        outcome: outcome('You make a defensible camp below the winter pass.', [
          {
            kind: 'fact.set.v1',
            fact: { id: 'winter-shelter', value: true },
          },
        ]),
      },
    },
  ];
}
