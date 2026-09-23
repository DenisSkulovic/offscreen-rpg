import type { StorytellerTask } from '../../tasks';
import { factValue, outcome, type MechanicalCharacter } from './shared';

export function microbeOpeningPlans(character: MechanicalCharacter) {
  if (
    factValue(character.facts, 'exposed') !== true ||
    factValue(character.facts, 'gradient-disrupted') !== false
  ) {
    return null;
  }
  return [
    {
      version: 1,
      key: 'follow-gradient',
      label: 'Follow the weaker gradient',
      intention:
        'Sense the chemical gradient and move toward the sheltered pocket.',
      risk: 'The disruption may keep the organism exposed.',
      evidence: [],
      requires: [
        { id: 'exposed', value: true },
        { id: 'gradient-disrupted', value: false },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'check',
        fictionalDurationSeconds: 5,
        check: {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Sense the gradient',
          skill: 'environment-sensing',
          ability: 'wisdom',
          dc: 12,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        difficultyBasis:
          'The gradient is changing, but a sheltered pocket remains detectable.',
        success: outcome('The organism reaches the sheltered pocket.', [
          { kind: 'fact.set.v1', fact: { id: 'exposed', value: false } },
        ]),
        failure: outcome(
          'The organism follows a fading signal and remains exposed.',
        ),
      },
    },
    {
      version: 1,
      key: 'contract',
      label: 'Contract away from the disturbance',
      intention:
        'Make an immediate protective response without trying to reach shelter.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 5,
        outcome: outcome(
          'The organism contracts away from the strongest disturbance.',
        ),
      },
    },
    {
      version: 1,
      key: 'wait-contracted',
      label: 'Remain contracted',
      intention:
        'Remain contracted for ten eligible fictional seconds while the disturbance passes.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'wait-contracted',
          label: 'Remain contracted',
          description:
            'Hold the protective contraction until the disturbance passes.',
          requires: [{ id: 'exposed', value: true }],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Protective interval',
            requiredFictionalSeconds: 10,
          },
          conditionPolicy: {
            kind: 'boundary',
            blockedText:
              'The organism can no longer remain contracted under the admitted conditions.',
          },
          occurrence: { kind: 'unbounded' },
          completionFollowUp: 'report',
          checks: [],
          completion: {
            text: 'The disturbance passes while the organism remains contracted.',
            effects: [
              {
                kind: 'fact.set.v1',
                fact: { id: 'exposed', value: false },
              },
            ],
          },
        },
      },
    },
    {
      version: 1,
      key: 'sample-gradient-cycle',
      label: 'Sample the gradient briefly',
      intention:
        'Hold position for a two-fictional-second sampling interval without committing to movement.',
      risk: null,
      evidence: [],
      requires: [],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'repeatable',
        action: {
          id: 'sample-gradient-cycle',
          label: 'Sample the gradient briefly',
          description:
            'Hold position through one bounded environmental sampling interval.',
          requires: [],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Sampling interval',
            requiredFictionalSeconds: 2,
          },
          conditionPolicy: { kind: 'admission-only' },
          occurrence: {
            kind: 'limited',
            scopeKey: 'microbe-gradient-samples',
            limit: 2,
          },
          completionFollowUp: 'quiet',
          checks: [],
          completion: {
            text: 'One sampling interval passes without changing position.',
            effects: [],
          },
        },
      },
    },
    {
      version: 1,
      key: 'hold-temperature-cycle',
      label: 'Hold through a temperature cycle',
      intention:
        'Remain in place through one two-fictional-second temperature cycle without changing course.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'hold-temperature-cycle',
          label: 'Hold through a temperature cycle',
          description:
            'Remain in place through one bounded environmental temperature cycle.',
          requires: [{ id: 'exposed', value: true }],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Temperature cycle',
            requiredFictionalSeconds: 2,
          },
          conditionPolicy: { kind: 'admission-only' },
          occurrence: {
            kind: 'limited',
            scopeKey: 'microbe-temperature-cycle',
            limit: 1,
          },
          completionFollowUp: 'quiet',
          checks: [],
          completion: {
            text: 'The temperature cycle passes without dislodging the organism.',
            effects: [],
          },
        },
      },
    },
    {
      version: 1,
      key: 'hold-pressure-cycle',
      label: 'Hold through a pressure cycle',
      intention:
        'Remain in place through one two-fictional-second pressure cycle without changing course.',
      risk: null,
      evidence: [],
      requires: [{ id: 'exposed', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'hold-pressure-cycle',
          label: 'Hold through a pressure cycle',
          description:
            'Remain in place through one bounded environmental pressure cycle.',
          requires: [{ id: 'exposed', value: true }],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Pressure cycle',
            requiredFictionalSeconds: 2,
          },
          conditionPolicy: { kind: 'admission-only' },
          occurrence: {
            kind: 'limited',
            scopeKey: 'microbe-pressure-cycle',
            limit: 1,
          },
          completionFollowUp: 'quiet',
          checks: [],
          completion: {
            text: 'The pressure cycle passes without dislodging the organism.',
            effects: [],
          },
        },
      },
    },
  ];
}

export function microbeConsequence(
  resolution: NonNullable<StorytellerTask['context']['resolution']>,
  evidence: string,
) {
  const character = resolution.character;
  const exposed = factValue(character.facts, 'exposed');
  if (typeof exposed !== 'boolean') {
    return null;
  }
  if (!exposed) {
    return [
      {
        version: 1,
        key: 'remain-sheltered',
        label: 'Remain in the sheltered pocket',
        intention: 'Hold position while the disrupted chemistry passes.',
        risk: null,
        evidence: [evidence],
        requires: [{ id: 'exposed', value: false }],
        requiresStory: [],
        requiresQuantities: [],
        resolution: {
          kind: 'automatic',
          fictionalDurationSeconds: 5,
          outcome: outcome(
            'The organism remains sheltered while the surrounding gradient shifts.',
          ),
        },
      },
    ];
  }
  return [
    {
      version: 1,
      key: 'follow-gradient-again',
      label: 'Follow the surviving gradient',
      intention: 'Try another route toward the sheltered pocket.',
      risk: 'The remaining signal is weaker than before.',
      evidence: [evidence],
      requires: [{ id: 'exposed', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'check',
        fictionalDurationSeconds: 5,
        check: {
          rule: 'srd-5.2.1-subset.v1',
          purpose: 'Sense the surviving gradient',
          skill: 'environment-sensing',
          ability: 'wisdom',
          dc: 13,
          advantage: false,
          disadvantage: false,
          modifiers: [],
        },
        difficultyBasis:
          'The earlier response consumed time while the signal weakened.',
        success: outcome('The organism reaches the sheltered pocket.', [
          { kind: 'fact.set.v1', fact: { id: 'exposed', value: false } },
        ]),
        failure: outcome(
          'The organism remains exposed as the usable gradient thins.',
        ),
      },
    },
    {
      version: 1,
      key: 'contract-again',
      label: 'Contract and conserve',
      intention:
        'Stop pursuing the gradient and reduce exposure as much as possible.',
      risk: null,
      evidence: [evidence],
      requires: [{ id: 'exposed', value: true }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'automatic',
        fictionalDurationSeconds: 5,
        outcome: outcome(
          'The organism contracts, conserving itself without reaching shelter.',
        ),
      },
    },
  ];
}
