import type { StorytellerTask } from '../../tasks';
import { factValue, outcome, type MechanicalCharacter } from './shared';

export function beaconOpeningPlans(character: MechanicalCharacter) {
  if (
    factValue(character.facts, 'location') !== 'harbor-beacon' ||
    factValue(character.facts, 'beacon-damaged') !== true ||
    factValue(character.facts, 'repair-tools') !== true
  ) {
    return null;
  }
  return [
    {
      version: 1,
      key: 'observe-harbor-shift',
      label: 'Observe the harbor shift',
      intention:
        'Watch the harbor for two ticks before deciding how to use the rest of the watch.',
      risk: null,
      evidence: [],
      requires: [{ id: 'location', value: 'harbor-beacon' }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'observe-harbor-shift',
          label: 'Observe the harbor shift',
          description:
            'Watch the harbor through one bounded change of conditions.',
          requires: [{ id: 'location', value: 'harbor-beacon' }],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Harbor observation',
            requiredFictionalSeconds: 2,
          },
          conditionPolicy: { kind: 'admission-only' },
          occurrence: {
            kind: 'limited',
            scopeKey: 'beacon-harbor-observations',
            limit: 1,
          },
          completionFollowUp: 'scene',
          checks: [],
          completion: {
            text: 'The harbor shift passes under careful observation.',
            effects: [],
          },
        },
      },
    },
    {
      version: 1,
      key: 'keep-harbor-watch',
      label: 'Keep the harbor watch',
      intention:
        'Continue watching the landing for two more ticks without beginning repairs.',
      risk: null,
      evidence: [],
      requires: [{ id: 'location', value: 'harbor-beacon' }],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'keep-harbor-watch',
          label: 'Keep the harbor watch',
          description: 'Maintain a bounded watch over the harbor landing.',
          requires: [{ id: 'location', value: 'harbor-beacon' }],
          capacity: 'primary',
          process: {
            kind: 'clock-wait.v1',
            progressLabel: 'Harbor watch',
            requiredFictionalSeconds: 2,
          },
          conditionPolicy: { kind: 'admission-only' },
          occurrence: {
            kind: 'limited',
            scopeKey: 'beacon-harbor-watches',
            limit: 1,
          },
          completionFollowUp: 'quiet',
          checks: [],
          completion: {
            text: 'The additional harbor watch ends without incident.',
            effects: [],
          },
        },
      },
    },
    {
      version: 1,
      key: 'restore-beacon',
      label: 'Begin restoring the beacon',
      intention:
        'Commit to repairing the storm-damaged signal while keeping watch.',
      risk: 'Failed attempts consume time, and trouble may interrupt the work.',
      evidence: [],
      requires: [
        { id: 'beacon-damaged', value: true },
        { id: 'repair-tools', value: true },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'restore-beacon',
          label: 'Restore the signal beacon',
          description: 'Repair the storm-damaged beacon while keeping watch.',
          requires: [
            { id: 'beacon-damaged', value: true },
            { id: 'repair-tools', value: true },
          ],
          capacity: 'primary',
          process: {
            kind: 'contribution.v1',
            progressLabel: 'Beacon repair',
            requiredContribution: 9,
            everyFictionalSeconds: 5,
            attempt: {
              check: {
                rule: 'srd-5.2.1-subset.v1',
                purpose: 'Repair the beacon',
                skill: 'repair',
                ability: 'intelligence',
                dc: 13,
                advantage: false,
                disadvantage: false,
                modifiers: [{ source: 'repair tools', value: 2 }],
              },
              successContribution: 3,
              failureContribution: 0,
              successText: 'A sound repair advances the beacon restoration.',
              failureText:
                'The attempt consumes time without producing a sound repair.',
            },
          },
          conditionPolicy: {
            kind: 'boundary',
            blockedText:
              'The beacon repair cannot continue without the admitted damage and repair tools.',
          },
          occurrence: { kind: 'unbounded' },
          completionFollowUp: 'scene',
          checks: [
            {
              id: 'stranger-approaches',
              everyFictionalSeconds: 10,
              resolution: {
                kind: 'event',
                purpose: 'An unknown boat approaches the dark beacon',
                threshold: 8,
                modifiers: [],
              },
              success: {
                text: 'An unknown boat noses against the landing, and a stranger climbs toward the dark beacon.',
                effects: [
                  {
                    kind: 'fact.set.v1',
                    fact: { id: 'stranger-at-beacon', value: true },
                  },
                ],
                interrupts: true,
              },
              failure: {
                text: 'The water below remains empty while the repair continues.',
                effects: [],
                interrupts: false,
              },
            },
          ],
          completion: {
            text: 'The beacon shines again, and the harbor records the completed watch.',
            effects: [
              {
                kind: 'fact.set.v1',
                fact: { id: 'beacon-damaged', value: false },
              },
              {
                kind: 'quantity.change.v1',
                quantityId: 'harbor-credit',
                delta: 4,
              },
            ],
          },
        },
      },
    },
  ];
}

export function beaconConsequence(
  resolution: NonNullable<StorytellerTask['context']['resolution']>,
  evidence: string,
  activitySituation: StorytellerTask['context']['activitySituation'],
) {
  const character = resolution.character;
  if (factValue(character.facts, 'location') !== 'harbor-beacon') {
    return null;
  }
  // A scene can explicitly hand the next accepted commitment back to the
  // player. Returning the exact private plan is deliberate: publication only
  // authorizes the choice; the application still requires a player command
  // before it rebinds and resumes the accepted itinerary.
  const acceptedSuccessor = activitySituation?.acceptedPlan?.nextEntry.plan;
  if (acceptedSuccessor) {
    return [acceptedSuccessor];
  }
  if (factValue(character.facts, 'beacon-damaged') !== true) {
    return [];
  }
  if (factValue(character.facts, 'stranger-at-beacon') === true) {
    return [
      {
        version: 1,
        key: 'read-the-stranger',
        label: 'Challenge the stranger',
        intention:
          'Hold the beacon threshold and determine whether the arrival is a threat.',
        risk: 'A mistaken read leaves the repair suspended and the stranger at the door.',
        evidence: [evidence],
        requires: [{ id: 'stranger-at-beacon', value: true }],
        requiresStory: [],
        requiresQuantities: [],
        resolution: {
          kind: 'check',
          fictionalDurationSeconds: 5,
          check: {
            rule: 'srd-5.2.1-subset.v1',
            purpose: 'Read and challenge the approaching stranger',
            skill: null,
            ability: 'wisdom',
            dc: 11,
            advantage: false,
            disadvantage: false,
            modifiers: [],
          },
          difficultyBasis:
            'The stranger is visible at close range but has not declared an intention.',
          success: outcome(
            'The stranger accepts the warning and returns to the boat.',
            [
              {
                kind: 'fact.set.v1',
                fact: { id: 'stranger-at-beacon', value: false },
              },
            ],
          ),
          failure: outcome(
            'The stranger refuses to leave, keeping you away from the exposed mechanism.',
          ),
        },
      },
      {
        version: 1,
        key: 'bar-the-door',
        label: 'Bar the beacon door',
        intention:
          'Secure the entrance and wait until the stranger gives up the approach.',
        risk: 'This is safer, but it consumes more of the watch before work can resume.',
        evidence: [evidence],
        requires: [{ id: 'stranger-at-beacon', value: true }],
        requiresStory: [],
        requiresQuantities: [],
        resolution: {
          kind: 'automatic',
          fictionalDurationSeconds: 5,
          outcome: outcome(
            'You bar the door until the stranger returns to the boat.',
            [
              {
                kind: 'fact.set.v1',
                fact: { id: 'stranger-at-beacon', value: false },
              },
            ],
          ),
        },
      },
    ];
  }
  const retainedRepair = activitySituation?.commitments.find(
    (commitment) =>
      commitment.actionId === 'restore-beacon' &&
      ['encounter', 'suspended', 'blocked'].includes(commitment.state),
  );
  return [
    ...(retainedRepair
      ? [
          {
            version: 1,
            key: 'resume-beacon-repair',
            label: 'Return to the beacon repair',
            intention:
              'Resume the suspended repair from its last sound contribution.',
            risk: 'Further failed attempts still consume time, and another interruption remains possible.',
            evidence: [evidence],
            requires: [
              { id: 'beacon-damaged', value: true },
              { id: 'repair-tools', value: true },
              { id: 'stranger-at-beacon', value: false },
            ],
            requiresStory: [],
            requiresQuantities: [],
            resolution: {
              kind: 'resume',
              activityActionId: 'restore-beacon',
              activityId: retainedRepair.activityId,
              activityRevision: retainedRepair.revision,
            },
          } as const,
        ]
      : []),
    {
      version: 1,
      key: 'secure-repair-tools',
      label: 'Secure the repair tools',
      intention:
        'Leave the interrupted mechanism long enough to move and secure the exposed tools.',
      risk: 'The beacon repair remains suspended until you deliberately return to it.',
      evidence: [evidence],
      requires: [
        { id: 'beacon-damaged', value: true },
        { id: 'repair-tools', value: true },
        { id: 'stranger-at-beacon', value: false },
      ],
      requiresStory: [],
      requiresQuantities: [],
      resolution: {
        kind: 'process',
        reuse: 'once',
        action: {
          id: 'secure-repair-tools',
          label: 'Secure the repair tools',
          description:
            'Move and secure the tools before returning to the interrupted beacon repair.',
          requires: [
            { id: 'beacon-damaged', value: true },
            { id: 'repair-tools', value: true },
            { id: 'stranger-at-beacon', value: false },
          ],
          capacity: 'primary',
          process: {
            kind: 'contribution.v1',
            progressLabel: 'Tools secured',
            requiredContribution: 3,
            everyFictionalSeconds: 5,
            attempt: {
              check: {
                rule: 'srd-5.2.1-subset.v1',
                purpose: 'Secure the exposed repair tools',
                skill: null,
                ability: 'intelligence',
                dc: 5,
                advantage: false,
                disadvantage: false,
                modifiers: [{ source: 'repair tools', value: 2 }],
              },
              successContribution: 3,
              failureContribution: 0,
              successText:
                'The tools are moved, checked and secured against the weather.',
              failureText:
                'The hurried attempt consumes time, but the exposed tools are not yet secure.',
            },
          },
          conditionPolicy: {
            kind: 'boundary',
            blockedText:
              'Securing the tools cannot continue under the changed work-area conditions.',
          },
          occurrence: { kind: 'unbounded' },
          completionFollowUp: 'quiet',
          checks: [],
          completion: {
            text: 'The repair tools are secured and ready for the beacon work to continue.',
            effects: [],
          },
        },
      },
    },
  ];
}
