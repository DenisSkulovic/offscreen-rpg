import type { StorytellerTask } from '../tasks';

type MechanicalCharacter = NonNullable<
  StorytellerTask['context']['mechanicalOpening']
>['character'];

function factValue(
  facts: readonly { id: string; value: boolean | string }[],
  id: string,
) {
  return facts.find((fact) => fact.id === id)?.value;
}

function outcome(
  text: string,
  effects: unknown[] = [],
  declarations: unknown[] = [],
) {
  return { text, effects, declarations };
}

function authoredActivityAccess(
  plans: readonly { key: string; resolution: { kind: string } }[],
) {
  const actionKeys = plans
    .filter(
      (plan) =>
        plan.resolution.kind === 'process' || plan.resolution.kind === 'resume',
    )
    .map((plan) => plan.key);
  return actionKeys.length
    ? ({ kind: 'selected', actionKeys } as const)
    : ({ kind: 'none' } as const);
}

function pineappleOpeningPlans(character: MechanicalCharacter) {
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
        outcome: outcome(
          'You stay by the doorway while Gary points both eyestalks toward the window.',
        ),
      },
    },
  ];
}

function microbeOpeningPlans(character: MechanicalCharacter) {
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
        'Remain contracted for ten eligible clock ticks while the disturbance passes.',
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
            requiredTicks: 10,
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
        'Hold position for a two-tick sampling interval without committing to movement.',
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
            requiredTicks: 2,
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
  ];
}

function beaconOpeningPlans(character: MechanicalCharacter) {
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
            everyTicks: 5,
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
              everyTicks: 10,
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

export function scriptedMechanicalOpening(task: StorytellerTask) {
  const opening = task.context.mechanicalOpening;
  if (task.task !== 'opening' || !opening) {
    throw new Error('Missing mechanical opening context');
  }
  const character = opening.character;
  const plans =
    pineappleOpeningPlans(character) ??
    beaconOpeningPlans(character) ??
    microbeOpeningPlans(character) ??
    [];
  return {
    version: 1,
    scene: {
      version: 1,
      content: opening.opening,
      next: {
        kind: 'action-plans',
        state: plans.length ? 'available' : 'held',
        plans,
        activityAccess: authoredActivityAccess(plans),
      },
    },
    currentNotes: [],
    arrivalNotes: [],
  };
}

function pineappleConsequence(
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

function beaconConsequence(
  resolution: NonNullable<StorytellerTask['context']['resolution']>,
  evidence: string,
  activitySituation: StorytellerTask['context']['activitySituation'],
) {
  const character = resolution.character;
  if (factValue(character.facts, 'location') !== 'harbor-beacon') {
    return null;
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
            everyTicks: 5,
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

function microbeConsequence(
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
        outcome: outcome(
          'The organism contracts, conserving itself without reaching shelter.',
        ),
      },
    },
  ];
}

export function scriptedMechanicalConsequence(task: StorytellerTask) {
  const { current, resolution } = task.context;
  if (task.task !== 'consequence' || !current || !resolution) {
    throw new Error('Missing committed consequence');
  }
  const evidence = `p${current.sequence}`;
  const plans =
    pineappleConsequence(resolution, evidence) ??
    beaconConsequence(resolution, evidence, task.context.activitySituation) ??
    microbeConsequence(resolution, evidence) ??
    [];
  const prior = resolution.receipts.at(-1);
  return {
    version: 1,
    scene: {
      version: 3,
      content: {
        version: 1,
        title: task.context.selected?.label ?? 'The consequence',
        paragraphs: [
          prior?.text ??
            'The committed action changes the immediate situation.',
        ],
      },
      next: {
        kind: 'action-plans',
        state: plans.length ? 'available' : 'held',
        plans,
        activityAccess: authoredActivityAccess(plans),
      },
    },
    currentNotes: [],
    arrivalNotes: [],
  };
}
