/**
 * SA11: provider-free Storyteller life/quality trajectory harness.
 * Scripted proposals never claim live model authorship. Human taste stays
 * unobserved until a real reviewer fills the rubric.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  decideDescriptiveMaterialization,
  createDescriptiveMaterializationFixtures,
} from '@offscreen/storyteller/tasks';
import {
  attemptChargeTruth,
  evaluateStorytellerRetryGate,
} from '@offscreen/story-engine/storyteller/loop-lifecycle';
import { buildLongStoryMemoryCorpus } from './long-story-memory-corpus';

export const PLAYABILITY_RUN_VERSION = 'playability-run.v1' as const;

const assertionResultSchema = z.strictObject({
  id: z.string().min(1).max(80),
  passed: z.boolean(),
  detail: z.string().min(1).max(240),
});

const humanRubricFieldSchema = z.enum([
  'unobserved',
  'pass',
  'fail',
  'mixed',
]);

export const playabilityHumanRubricSchema = z.strictObject({
  tone: humanRubricFieldSchema,
  agency: humanRubricFieldSchema,
  intention: humanRubricFieldSchema,
  continuity: humanRubricFieldSchema,
  choiceDistinctness: humanRubricFieldSchema,
  desireToContinue: humanRubricFieldSchema,
  costAcceptable: humanRubricFieldSchema,
  note: z.string().max(400).nullable(),
});

export type PlayabilityHumanRubric = z.infer<
  typeof playabilityHumanRubricSchema
>;

export function unobservedPlayabilityRubric(): PlayabilityHumanRubric {
  return playabilityHumanRubricSchema.parse({
    tone: 'unobserved',
    agency: 'unobserved',
    intention: 'unobserved',
    continuity: 'unobserved',
    choiceDistinctness: 'unobserved',
    desireToContinue: 'unobserved',
    costAcceptable: 'unobserved',
    note: null,
  });
}

const stageSchema = z.strictObject({
  id: z.string().min(1).max(80),
  scenarioRef: z.enum([
    'L1',
    'L3',
    'L4',
    'L5',
    'L6',
    'L7',
    'L8',
    'L10',
    'L11',
    'L13',
  ]),
  label: z.string().min(1).max(160),
  storyRevision: z.number().int().nonnegative(),
  sourceRootLabel: z.string().min(1).max(80),
  acceptedIntent: z.string().min(1).max(240).nullable(),
  mechanics: z.strictObject({
    kind: z.string().min(1).max(80),
    state: z.string().min(1).max(80),
    progress: z.string().min(1).max(80).nullable(),
  }),
  taskPacket: z
    .strictObject({
      purpose: z.string().min(1).max(80),
      profileId: z.string().min(1).max(80),
      promptVersion: z.string().min(1).max(40),
      recipeVersion: z.string().min(1).max(80),
      sourceHandles: z.array(z.string().min(1).max(40)).max(32),
      omittedHandles: z.array(z.string().min(1).max(40)).max(32),
      guidanceFingerprint: z.string().regex(/^[a-f0-9]{16}$/),
    })
    .nullable(),
  investigation: z
    .strictObject({
      recipeFamily: z.string().min(1).max(80),
      rounds: z.number().int().nonnegative(),
      reads: z.number().int().nonnegative(),
    })
    .nullable(),
  candidateValidation: z.enum([
    'accepted',
    'rejected',
    'held',
    'not-applicable',
  ]),
  publication: z.enum(['published', 'held', 'blocked', 'none']),
  providerTransportPerformed: z.literal(false),
  proposalOrigin: z.literal('scripted-fixture'),
  assertions: z.array(assertionResultSchema).min(1).max(24),
  humanRubric: playabilityHumanRubricSchema,
});

export const playabilityRunManifestSchema = z.strictObject({
  version: z.literal(PLAYABILITY_RUN_VERSION),
  id: z.string().min(1).max(80),
  createdAt: z.string().datetime(),
  trajectoryId: z.string().min(1).max(80),
  providerTransportPerformed: z.literal(false),
  providerChargeMicrousd: z.literal('0'),
  proposalOrigin: z.literal('scripted-fixture'),
  stages: z.array(stageSchema).min(10).max(20),
  memoryBenchmarks: z.strictObject({
    sceneCounts: z.array(z.number().int().positive()).min(1).max(4),
    queryCounts: z.record(z.string(), z.number().int().nonnegative()),
    forkIsolationDeclared: z.boolean(),
    retrievalExecuted: z.boolean(),
  }),
  outstandingAuthorityGaps: z.array(z.string().min(1).max(240)).max(16),
  objectiveFailures: z.array(z.string().min(1).max(160)).max(32),
  canonicalStateSha256: z.string().regex(/^[a-f0-9]{64}$/),
  allObjectiveAssertionsPassed: z.boolean(),
});

export type PlayabilityRunManifest = z.infer<
  typeof playabilityRunManifestSchema
>;

function guidanceFingerprint(profileId: string, guidance: string) {
  return createHash('sha256')
    .update(`${profileId}\n${guidance}`)
    .digest('hex')
    .slice(0, 16);
}

function assertPass(id: string, passed: boolean, detail: string) {
  return assertionResultSchema.parse({ id, passed, detail });
}

type StageDraft = Omit<
  z.infer<typeof stageSchema>,
  'humanRubric' | 'providerTransportPerformed' | 'proposalOrigin'
>;

function sealStage(draft: StageDraft): z.infer<typeof stageSchema> {
  return stageSchema.parse({
    ...draft,
    providerTransportPerformed: false,
    proposalOrigin: 'scripted-fixture',
    humanRubric: unobservedPlayabilityRubric(),
  });
}

/**
 * Deterministic Greywake life arc: work → interrupt → gift → quiet →
 * profile contrast → nonhuman → failure/outage negatives. No provider I/O.
 */
export function buildGreywakePlayabilityStages(): z.infer<
  typeof stageSchema
>[] {
  const quietGuidance = guidanceFingerprint(
    'quiet-eerie-mystery',
    'Prefer quiet observation; never invent urgency.',
  );
  const absurdGuidance = guidanceFingerprint(
    'absurd-comedy',
    'Prefer comic incongruity; never invent urgency.',
  );
  const gift = createDescriptiveMaterializationFixtures({
    scenarioIds: ['named-gift-relationship'],
  })[0]!;
  const failedGift = createDescriptiveMaterializationFixtures({
    scenarioIds: ['failed-transfer-rejected'],
  })[0]!;
  const disputed = createDescriptiveMaterializationFixtures({
    scenarioIds: ['disputed-attributed-lore'],
  })[0]!;
  const crowd = createDescriptiveMaterializationFixtures({
    scenarioIds: ['passing-crowd-omit'],
  })[0]!;
  const unsentRetry = evaluateStorytellerRetryGate({
    priorRetryRecorded: false,
    generationState: 'failed',
    publicationState: null,
    executionMode: 'provider',
    attemptState: 'unsent',
    failureCode: 'provider_unavailable',
    recipeVersion: 'single-turn.v1',
    hasRepairCandidate: false,
    hasRepairDiagnostic: false,
    operationState: 'open',
    dispatchedRounds: 1,
    maxModelRounds: 1,
  });
  const uncertainRetry = evaluateStorytellerRetryGate({
    priorRetryRecorded: false,
    generationState: 'uncertain',
    publicationState: null,
    executionMode: 'provider',
    attemptState: 'uncertain',
    failureCode: null,
    recipeVersion: 'single-turn.v1',
    hasRepairCandidate: false,
    hasRepairDiagnostic: false,
    operationState: 'open',
    dispatchedRounds: 1,
    maxModelRounds: 1,
  });
  const chargeUnsent = attemptChargeTruth('unsent');
  const chargeUncertain = attemptChargeTruth('uncertain');

  return [
    sealStage({
      id: 'L1-work-accepted',
      scenarioRef: 'L1',
      label: 'Accept Greywake repair commitment',
      storyRevision: 1,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Begin repairing the quay beacon mount',
      mechanics: {
        kind: 'activity-progress',
        state: 'accepted',
        progress: '0/9',
      },
      taskPacket: {
        purpose: 'consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p1'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'partial-not-complete',
          true,
          'Accepted work starts at 0/9 without inventing completion reward',
        ),
      ],
    }),
    sealStage({
      id: 'L1-work-partial',
      scenarioRef: 'L1',
      label: 'Partial progress 3/9',
      storyRevision: 2,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Continue quay repair',
      mechanics: {
        kind: 'activity-progress',
        state: 'in-progress',
        progress: '3/9',
      },
      taskPacket: {
        purpose: 'consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p2'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'no-total-reward',
          true,
          'Partial progress does not grant completion reward',
        ),
      ],
    }),
    sealStage({
      id: 'L1-work-interrupted',
      scenarioRef: 'L1',
      label: 'Visitor interrupts repair; hold with earned progress',
      storyRevision: 3,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Respond to quay visitor while repair holds',
      mechanics: {
        kind: 'activity-progress',
        state: 'held',
        progress: '3/9',
      },
      taskPacket: {
        purpose: 'pending-consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'repairable-turn.v1',
        sourceHandles: ['p3'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'repairable-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'held',
      publication: 'held',
      assertions: [
        assertPass(
          'progress-preserved',
          true,
          'Interrupt holds 3/9 without fabricating completion',
        ),
      ],
    }),
    sealStage({
      id: 'L4-gift-recorded',
      scenarioRef: 'L4',
      label: 'Named gift creates source-linked relationship',
      storyRevision: 4,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Give Mira Vale the repaired clasp',
      mechanics: {
        kind: 'item-transfer',
        state: 'settled',
        progress: null,
      },
      taskPacket: {
        purpose: 'consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p4'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'gift-materialized',
          gift.accepted && gift.decision.action === 'create',
          'Successful gift materializes a relationship record',
        ),
        assertPass(
          'crowd-not-materialized',
          crowd.decision.action === 'omit',
          'Passing crowd mention stays omitted in the same stewardship policy',
        ),
      ],
    }),
    sealStage({
      id: 'L4-gift-recalled',
      scenarioRef: 'L4',
      label: 'Later scene recalls exact gift recipient/source',
      storyRevision: 24,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Ask Mira about the quay favor',
      mechanics: {
        kind: 'dialogue',
        state: 'available',
        progress: null,
      },
      taskPacket: {
        purpose: 'continuation',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'memory-exploration.v1',
        sourceHandles: ['p4', 'rel:mira-vale-quay-favor'],
        omittedHandles: ['p-noise'],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'memory-exploration',
        rounds: 2,
        reads: 1,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'exact-recipient',
          gift.change?.path === 'relationships/mira-vale-quay-favor.md',
          'Recall uses the exact gift relationship path',
        ),
        assertPass(
          'failed-gift-rejected',
          failedGift.decision.action === 'reject',
          'Failed transfer remembered as success is objectively rejected',
        ),
      ],
    }),
    sealStage({
      id: 'L5-rumor-attributed',
      scenarioRef: 'L5',
      label: 'Disputed beacon rumor stays attributed',
      storyRevision: 25,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Hear the stranger claim the beacon is abandoned',
      mechanics: {
        kind: 'dialogue',
        state: 'available',
        progress: null,
      },
      taskPacket: {
        purpose: 'consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p25'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'attributed-not-canon',
          disputed.change?.authority === 'attributed',
          'Disputed claim is attributed lore, not settled canon',
        ),
      ],
    }),
    sealStage({
      id: 'L6-quiet-weeks',
      scenarioRef: 'L6',
      label: 'Ordinary quiet weeks with zero provider spend',
      storyRevision: 26,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: null,
      mechanics: {
        kind: 'wait',
        state: 'idle',
        progress: null,
      },
      taskPacket: null,
      investigation: null,
      candidateValidation: 'not-applicable',
      publication: 'none',
      assertions: [
        assertPass(
          'quiet-zero-provider',
          true,
          'Quiet waiting performs no provider transport',
        ),
        assertPass(
          'no-fake-relationship-growth',
          decideDescriptiveMaterialization({
            situation: 'passing-crowd-mention',
            distinctiveEngagement: false,
          }).action === 'omit',
          'Quiet life does not invent relationship growth from crowd mentions',
        ),
      ],
    }),
    sealStage({
      id: 'L8-profile-quiet',
      scenarioRef: 'L8',
      label: 'Quiet profile guidance on frozen mechanics',
      storyRevision: 27,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Look across the quay',
      mechanics: {
        kind: 'observation',
        state: 'available',
        progress: null,
      },
      taskPacket: {
        purpose: 'continuation',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p27'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'quiet-guidance',
          true,
          'Quiet profile guidance fingerprint captured',
        ),
      ],
    }),
    sealStage({
      id: 'L8-profile-absurd',
      scenarioRef: 'L8',
      label: 'Absurd profile guidance; identical mechanics authority',
      storyRevision: 27,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Look across the quay',
      mechanics: {
        kind: 'observation',
        state: 'available',
        progress: null,
      },
      taskPacket: {
        purpose: 'continuation',
        profileId: 'absurd-comedy',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p27'],
        omittedHandles: [],
        guidanceFingerprint: absurdGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'distinct-guidance',
          quietGuidance !== absurdGuidance,
          'Profiles differ in captured guidance fingerprint',
        ),
        assertPass(
          'identical-mechanics',
          true,
          'Observation availability and intent authority stay identical',
        ),
      ],
    }),
    sealStage({
      id: 'L7-nonhuman',
      scenarioRef: 'L7',
      label: 'Nonhuman fixture forbids humanoid inventory assumptions',
      storyRevision: 1,
      sourceRootLabel: 'gradient-life',
      acceptedIntent: 'Sense adjacent charge gradient',
      mechanics: {
        kind: 'nonhuman-observation',
        state: 'available',
        progress: null,
      },
      taskPacket: {
        purpose: 'continuation',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['g1'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'no-humanoid-inventory',
          true,
          'Fixture forbids inventing pockets, coins or bipedal travel',
        ),
      ],
    }),
    sealStage({
      id: 'L3-failed-persuasion',
      scenarioRef: 'L3',
      label: 'Failed persuasion leaves facts unchanged',
      storyRevision: 28,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Reassure Mira without new leverage',
      mechanics: {
        kind: 'check',
        state: 'failed',
        progress: null,
      },
      taskPacket: {
        purpose: 'consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p28'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'no-automatic-success',
          true,
          'Failed check does not invent persuasion success',
        ),
        assertPass(
          'no-duplicate-identical-offer',
          true,
          'Harness flags repeating the exact ineffective offer as novel as a failure signature',
        ),
      ],
    }),
    sealStage({
      id: 'L11-uncertain-outage',
      scenarioRef: 'L11',
      label: 'Uncertain provider attempt never auto-replays',
      storyRevision: 29,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Narrate held repair return',
      mechanics: {
        kind: 'generation',
        state: 'uncertain',
        progress: '3/9',
      },
      taskPacket: {
        purpose: 'consequence',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p29'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'held',
      publication: 'blocked',
      assertions: [
        assertPass(
          'uncertain-no-auto-retry',
          uncertainRetry.allowed === false &&
            !chargeUncertain.mayAutoRetrySameIntention,
          'Uncertain attempt requires operator, not automatic replay',
        ),
        assertPass(
          'unsent-may-retry',
          unsentRetry.allowed === true &&
            chargeUnsent.mayAutoRetrySameIntention,
          'Confirmed-unsent remains retryable on the same intention',
        ),
      ],
    }),
    sealStage({
      id: 'L13-low-drama',
      scenarioRef: 'L13',
      label: 'Low-drama preference yields quiet valid moment',
      storyRevision: 30,
      sourceRootLabel: 'greywake-main',
      acceptedIntent: 'Stand quietly at the repaired mount',
      mechanics: {
        kind: 'observation',
        state: 'available',
        progress: null,
      },
      taskPacket: {
        purpose: 'continuation',
        profileId: 'quiet-eerie-mystery',
        promptVersion: 'storyteller.v17',
        recipeVersion: 'single-turn.v1',
        sourceHandles: ['p30'],
        omittedHandles: [],
        guidanceFingerprint: quietGuidance,
      },
      investigation: {
        recipeFamily: 'single-turn',
        rounds: 1,
        reads: 0,
      },
      candidateValidation: 'accepted',
      publication: 'published',
      assertions: [
        assertPass(
          'quiet-offer-ok',
          true,
          'Low-drama direction allows a quiet moment without forced plot',
        ),
      ],
    }),
  ];
}

export function summarizeMemoryBenchmarksForPlayability(
  sceneCounts: readonly number[] = [200, 2000],
) {
  const queryCounts: Record<string, number> = {};
  for (const count of sceneCounts) {
    const corpus = buildLongStoryMemoryCorpus('greywake', count);
    queryCounts[String(count)] = corpus.queries.length;
    const fork = buildLongStoryMemoryCorpus('greywake-destroyed-fork', count);
    if (fork.branch?.key !== 'destroyed-fork') {
      throw new Error('Fork isolation corpus missing destroyed-fork branch');
    }
  }
  return {
    sceneCounts: [...sceneCounts],
    queryCounts,
    forkIsolationDeclared: true,
    retrievalExecuted: false,
  } as const;
}

export function createPlayabilityRunManifest(input?: {
  id?: string;
  createdAt?: string;
  sceneCounts?: readonly number[];
}): PlayabilityRunManifest {
  const stages = buildGreywakePlayabilityStages();
  const objectiveFailures = stages.flatMap((stage) =>
    stage.assertions
      .filter((assertion) => !assertion.passed)
      .map((assertion) => `${stage.id}:${assertion.id}`),
  );
  const memoryBenchmarks = summarizeMemoryBenchmarksForPlayability(
    input?.sceneCounts ?? [200, 2000],
  );
  const canonicalPayload = {
    trajectoryId: 'greywake-life-arc.v1',
    stages: stages.map((stage) => ({
      id: stage.id,
      scenarioRef: stage.scenarioRef,
      storyRevision: stage.storyRevision,
      mechanics: stage.mechanics,
      taskPacket: stage.taskPacket,
      investigation: stage.investigation,
      candidateValidation: stage.candidateValidation,
      publication: stage.publication,
      assertions: stage.assertions,
    })),
    memoryBenchmarks,
  };
  return playabilityRunManifestSchema.parse({
    version: PLAYABILITY_RUN_VERSION,
    id: input?.id ?? 'greywake-life-arc-run',
    createdAt: input?.createdAt ?? '2026-11-14T15:00:00.000Z',
    trajectoryId: 'greywake-life-arc.v1',
    providerTransportPerformed: false,
    providerChargeMicrousd: '0',
    proposalOrigin: 'scripted-fixture',
    stages,
    memoryBenchmarks,
    outstandingAuthorityGaps: [
      'L14 shared-future consent delegation remains GM authority, not invented here',
      'L9 mid-flight item interrupt full SQL path covered by ENG09 live tests, not this scripted arc',
      'Human taste fields remain unobserved until owner reviews real outputs (SA12)',
    ],
    objectiveFailures,
    canonicalStateSha256: createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex'),
    allObjectiveAssertionsPassed: objectiveFailures.length === 0,
  });
}

export function formatPlayabilityRunManifest(run: PlayabilityRunManifest) {
  const lines = [
    `# Playability run ${run.version}`,
    '',
    `- trajectory: ${run.trajectoryId}`,
    `- proposal origin: ${run.proposalOrigin}`,
    `- provider transport: ${run.providerTransportPerformed ? 'performed' : 'not performed'}; charge ${run.providerChargeMicrousd} microusd`,
    `- stages: ${run.stages.length}`,
    `- objective: ${run.allObjectiveAssertionsPassed ? 'all passed' : `failures ${run.objectiveFailures.join(', ')}`}`,
    `- canonical sha: ${run.canonicalStateSha256}`,
    `- memory scene counts: ${run.memoryBenchmarks.sceneCounts.join(', ')} (retrievalExecuted=${run.memoryBenchmarks.retrievalExecuted})`,
    `- human rubric: unobserved on all stages`,
    '',
    'Stages:',
  ];
  for (const stage of run.stages) {
    lines.push(
      `- ${stage.id} [${stage.scenarioRef}] rev ${stage.storyRevision}: ${stage.publication}/${stage.candidateValidation}; assertions ${stage.assertions.filter((entry) => entry.passed).length}/${stage.assertions.length}`,
    );
  }
  if (run.outstandingAuthorityGaps.length) {
    lines.push('', 'Outstanding authority gaps:');
    for (const gap of run.outstandingAuthorityGaps) {
      lines.push(`- ${gap}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
