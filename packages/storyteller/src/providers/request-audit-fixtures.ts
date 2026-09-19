import { storytellerCatalogue } from '../profiles';
import { prepareStorytellerTask } from '../tasks';

export const requestAuditCaseIds = [
  'opening-narrative',
  'opening-mechanical',
  'scene-continuation',
  'activity-consequence',
  'history-report',
] as const;
export type RequestAuditCaseId = (typeof requestAuditCaseIds)[number];

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
    maxMicrousd: '0',
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
        maxMicrousdPerOperation: '0',
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
        maxMicrousdPerOperation: [{ source: 'structural-audit', value: '0' }],
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
  facts: [{ id: 'location', value: 'harbor-beacon' }],
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
    offer: {
      id: '00000000-0000-4000-8000-000000000011',
      nodes: [],
    },
    receipts: [],
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
  } satisfies Record<
    RequestAuditCaseId,
    () => ReturnType<typeof prepareStorytellerTask>
  >;
  return selected.map((id) => ({ id, task: tasks[id]() }));
}
