import { storytellerCatalogue } from '../profiles';
import { prepareStorytellerTask } from '../tasks';

export const requestAuditCaseIds = [
  'opening-narrative',
  'opening-mechanical',
  'scene-continuation',
  'activity-consequence',
  'history-report',
  'continuity-human-turn-13',
  'continuity-human-turn-14',
  'continuity-fifteen-turn',
  'continuity-nonhuman',
] as const;
export type RequestAuditCaseId = (typeof requestAuditCaseIds)[number];

function humanSequencePosition(id: RequestAuditCaseId) {
  switch (id) {
    case 'continuity-human-turn-13':
      return 13;
    case 'continuity-human-turn-14':
      return 14;
    case 'continuity-fifteen-turn':
      return 15;
    default:
      return null;
  }
}

const execution = {
  mode: 'provider' as const,
  accountId: '00000000-0000-4000-8000-000000000001',
  runId: '00000000-0000-4000-8000-000000000002',
  dispatchReview: { mode: 'hold' as const },
  policy: {
    version: 'structural-audit.v1',
    route: 'audit:offline',
    model: 'audit/model-not-selected',
    provider: 'Audit',
    priceVersion: 'not-priced',
    inputMicrousdPerMillion: '0',
    outputMicrousdPerMillion: '0',
    maxInputTokens: 100000,
    maxOutputTokens: 2000,
    timeoutMs: 1000,
  },
};
const limitSource = [{ source: 'structural-audit', value: 100000 }];
const resources = {
  version: 'storyteller-resources.v2' as const,
  recipe: {
    version: 'single-turn.v1' as const,
    maxModelRounds: 1 as const,
    maxReads: 0 as const,
    tools: 'disabled' as const,
    automaticEscalation: false as const,
  },
  envelope: {
    maxSerializedRequestBytes: 48000,
    maxInputTokens: 100000,
    maxGeneratedTokens: 2000,
    maxReasoningTokens: 0,
    maxMicrousd: '1',
    deadlineMs: 1000,
  },
  authority: {
    kind: 'effective-usage-policy' as const,
    policy: {
      schemaVersion: 1 as const,
      platform: { id: 'structural-audit', revision: 1 },
      profile: { id: 'structural-audit', revision: 1 },
      route: execution.policy.route,
      fundingMode: 'prepaid' as const,
      recovery: 'explicit-resume' as const,
      limits: {
        maxInputTokensPerRequest: 100000,
        maxSerializedBytesPerRequest: 48000,
        maxGeneratedTokensPerRequest: 2000,
        maxReasoningTokensPerRequest: 0,
        maxInputTokensPerOperation: 100000,
        maxGeneratedTokensPerOperation: 2000,
        maxModelRoundsPerOperation: 1,
        maxReadsPerOperation: 0,
        maxRetainedReadBytes: 0,
        maxMicrousdPerOperation: '1',
        maxInFlightDispatches: 1,
        maxBackgroundJobsPerWindow: 0,
      },
      limitSources: {
        maxInputTokensPerRequest: limitSource,
        maxSerializedBytesPerRequest: limitSource,
        maxGeneratedTokensPerRequest: limitSource,
        maxReasoningTokensPerRequest: [
          { source: 'structural-audit', value: 0 },
        ],
        maxInputTokensPerOperation: limitSource,
        maxGeneratedTokensPerOperation: limitSource,
        maxModelRoundsPerOperation: limitSource,
        maxReadsPerOperation: [{ source: 'structural-audit', value: 0 }],
        maxRetainedReadBytes: [{ source: 'structural-audit', value: 0 }],
        maxMicrousdPerOperation: [{ source: 'structural-audit', value: '1' }],
        maxInFlightDispatches: limitSource,
        maxBackgroundJobsPerWindow: [{ source: 'structural-audit', value: 0 }],
      },
      windows: [],
      restrictions: [],
    },
  },
};

const current = {
  id: '00000000-0000-4000-8000-000000000010',
  sequence: 7,
  content: {
    version: 1 as const,
    title: 'The concealed blade',
    paragraphs: [
      'The stranger claims the beacon is abandoned while keeping one hand behind their coat.',
    ],
  },
  response: 'Keep distance and inspect the claim.',
};
const character = {
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
  ] as Array<
    | 'strength'
    | 'dexterity'
    | 'constitution'
    | 'intelligence'
    | 'wisdom'
    | 'charisma'
  >,
  skills: [{ id: 'perception', label: 'Perception' }],
  proficientSkills: ['perception'],
  proficiencyBonus: 2,
  hp: 8,
  maxHp: 8,
  facts: [
    { id: 'location', value: 'harbor-beacon' },
    { id: 'beacon-damaged', value: true },
    { id: 'repair-tools', value: true },
    { id: 'stranger-at-beacon', value: true },
  ],
  quantities: [],
};
const baseContext = {
  premise: {
    title: 'Beacon watch',
    premise: 'Mara protects a storm-damaged harbor beacon.',
    storytellingDirection: 'Tense, grounded mystery.',
  },
  current,
  selected: {
    id: 'inspect-claim',
    label: 'Inspect the claim',
    intention: 'Watch the concealed hand and test the stranger’s story.',
  },
  items: [],
  notes: [],
  evidence: [current],
};

export function createRequestAuditFixtureCases(input: {
  caseIds?: readonly RequestAuditCaseId[];
  profile?: { id: string; revision: number };
}) {
  const selected = input.caseIds ?? requestAuditCaseIds;
  const profile = storytellerCatalogue.resolve(
    input.profile ?? { id: 'quiet-eerie-mystery', revision: 1 },
  );
  const resolution = {
    character,
    storyFacts: [],
    tick: 25,
    offer: null,
    receipts: [
      {
        id: '00000000-0000-4000-8000-000000000011',
        outcome: 'success' as const,
        text: 'Mara notices the stranger tightening their grip on a concealed blade.',
        roll: {
          kind: 'ability' as const,
          purpose: 'Inspect the stranger’s claim',
          dice: [12],
          chosen: 12,
          modifiers: [
            { source: 'Wisdom', value: 1 },
            { source: 'Perception proficiency', value: 2 },
          ],
          total: 15,
          dc: 12,
          success: true,
        },
        effects: [],
        declarations: [],
      },
    ],
  };
  const tasks = {
    'opening-narrative': () =>
      prepareStorytellerTask({
        task: 'opening',
        source: {
          draftId: '00000000-0000-4000-8000-000000000020',
          draftRevision: 1,
        },
        profile,
        execution,
        resources,
        context: {
          ...baseContext,
          current: null,
          selected: null,
          evidence: [],
        },
      }),
    'opening-mechanical': () =>
      prepareStorytellerTask({
        task: 'opening',
        source: {
          draftId: '00000000-0000-4000-8000-000000000021',
          draftRevision: 1,
        },
        profile,
        execution,
        resources,
        context: {
          ...baseContext,
          current: null,
          selected: null,
          evidence: [],
          mechanicalOpening: {
            id: 'beacon-audit.v1',
            character,
            storyFacts: [],
            opening: {
              version: 1,
              title: 'The dark beacon',
              paragraphs: ['The damaged beacon waits above the harbor.'],
            },
          },
        },
      }),
    'scene-continuation': () =>
      prepareStorytellerTask({
        task: 'continuation',
        source: {
          storyId: '00000000-0000-4000-8000-000000000030',
          narrativeRevision: 7,
          passageId: current.id,
          interactionId: '00000000-0000-4000-8000-000000000031',
        },
        profile,
        execution,
        resources,
        context: baseContext,
      }),
    'activity-consequence': () =>
      prepareStorytellerTask({
        task: 'consequence',
        source: {
          storyId: '00000000-0000-4000-8000-000000000030',
          narrativeRevision: 7,
          passageId: current.id,
        },
        profile,
        execution,
        resources,
        context: { ...baseContext, resolution },
      }),
    'history-report': () =>
      prepareStorytellerTask({
        task: 'report',
        source: {
          storyId: '00000000-0000-4000-8000-000000000030',
          narrativeRevision: 7,
          passageId: current.id,
          hookId: '00000000-0000-4000-8000-000000000032',
        },
        profile,
        execution,
        resources,
        context: { ...baseContext, resolution },
      }),
    'continuity-human-turn-13': () => longContinuityCase(profile, false, 13),
    'continuity-human-turn-14': () => longContinuityCase(profile, false, 14),
    'continuity-fifteen-turn': () => longContinuityCase(profile, false, 15),
    'continuity-nonhuman': () => longContinuityCase(profile, true, 15),
  } satisfies Record<
    RequestAuditCaseId,
    () => ReturnType<typeof prepareStorytellerTask>
  >;
  return selected.map((id) => {
    const task = tasks[id]();
    if (!id.startsWith('continuity-')) return { id, task };
    const sequencePosition = humanSequencePosition(id);
    return {
      id,
      task,
      ...(sequencePosition
        ? {
            sequence: {
              id: 'human-active-scene',
              position: sequencePosition,
            },
          }
        : {}),
      evidenceExpectations: {
        // The first clue and holder change are independently required by the
        // fixture, not inferred from what the current selector retained.
        requiredHandles: [
          'p1',
          'p6',
          'p10',
          `p${sequencePosition ?? 15}`,
        ],
        forbiddenHandles: ['p16'],
      },
    };
  });
}

function longContinuityCase(
  profile: ReturnType<typeof storytellerCatalogue.resolve>,
  nonhuman: boolean,
  throughSequence: number,
) {
  const evidence = Array.from({ length: throughSequence }, (_, index) => {
    const sequence = index + 1;
    const humanMoments: Record<number, string> = {
      1: 'The stranger hides a blade and falsely claims the beacon is abandoned.',
      6: 'Mara drops the brass key; the stranger picks it up.',
      10: 'The stranger still holds the key while blocking the western stair.',
      15: 'Mara keeps her distance and looks for a route away from the unresolved threat.',
    };
    const microbeMoments: Record<number, string> = {
      1: 'A neighboring cell masks a toxin pulse beneath an ordinary nutrient signal.',
      6: 'The membrane releases its stored vesicle; the neighboring cell absorbs it.',
      10: 'The neighboring cell retains the vesicle while occluding the safer gradient.',
      15: 'The organism holds position and probes for escape from the unresolved chemical threat.',
    };
    return {
      id: `00000000-0000-4000-8000-${String(100 + sequence).padStart(12, '0')}`,
      sequence,
      content: {
        version: 1 as const,
        title: nonhuman ? `Signal ${sequence}` : `Exchange ${sequence}`,
        paragraphs: [
          (nonhuman ? microbeMoments : humanMoments)[sequence] ??
            (nonhuman
              ? `The cells exchange another bounded environmental signal ${sequence}.`
              : `Mara and the stranger reposition during exchange ${sequence}.`),
        ],
      },
      response: nonhuman
        ? `React to signal ${sequence}.`
        : `Respond during exchange ${sequence}.`,
    };
  });
  const latest = evidence.at(-1)!;
  return prepareStorytellerTask({
    task: 'continuation',
    source: {
      storyId: nonhuman
        ? '00000000-0000-4000-8000-000000000041'
        : '00000000-0000-4000-8000-000000000040',
      narrativeRevision: throughSequence,
      passageId: latest.id,
      interactionId: nonhuman
        ? '00000000-0000-4000-8000-000000000043'
        : '00000000-0000-4000-8000-000000000042',
    },
    profile,
    execution,
    resources,
    context: {
      ...baseContext,
      activeSceneScope: {
        version: 'active-scene.v1',
        fromSequence: 1,
        throughSequence,
        requiredPassageIds: [
          evidence[0]!.id,
          evidence[5]!.id,
          evidence[9]!.id,
          latest.id,
        ],
      },
      premise: nonhuman
        ? {
            title: 'Gradient colony',
            premise:
              'A microorganism navigates competing chemical signals in a hostile colony.',
            storytellingDirection:
              'Describe nonverbal cellular interaction without human dialogue assumptions.',
          }
        : baseContext.premise,
      current: latest,
      evidence,
      selected: {
        id: 'continue-under-threat',
        label: nonhuman ? 'Probe the gradient' : 'Find an exit',
        intention: nonhuman
          ? 'Probe for a safe chemical gradient without surrendering position.'
          : 'Find an exit while keeping distance from the concealed weapon.',
      },
    },
  });
}
