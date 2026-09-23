import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildLongStoryMemoryCorpus,
  materializeLongStoryMemoryCorpus,
} from '@offscreen/application/developer-tools';
import {
  buildLexicalStoryIndex,
  createCanonicalMemoryExplorer,
  createStorytellerRuntime,
  loadCanonicalKnowledge,
  prepareMemoryEvidenceContext,
  prepareAdmittedStorytellerTask,
  resolveStoryRetrievalRecipe,
} from '@offscreen/application/storyteller';
import { dispatchReviewResponseSchema } from '@offscreen/contracts/chamber';
import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { inspectOpenRouterRequest } from '@offscreen/storyteller/providers/openrouter';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';

/**
 * Capture the exact first model round produced by the ordinary durable memory
 * controller. The provider is a tripwire: a successful capture must stop at
 * dispatch review before transport or spend.
 */
export async function captureHeldMemoryPacket(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  database: Database;
  documentStore: DocumentStore;
  ownerId: string;
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>;
  usagePolicy: EffectiveUsagePolicy;
  comparison?: {
    interactionId: string;
    mode: 'one-shot' | 'bounded-exploration';
    maxRepairRounds?: 0 | 1;
  };
}) {
  const corpus = buildLongStoryMemoryCorpus('greywake');
  const materialized = await materializeLongStoryMemoryCorpus(
    input.documentStore,
    corpus,
  );
  const canonicalKnowledge = await loadCanonicalKnowledge(input.documentStore, {
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
  });
  const currentScene = corpus.scenes.at(-1);
  if (!currentScene) throw new Error('Memory corpus has no current passage');

  const current = {
    id: currentScene.documentId,
    sequence: currentScene.sequence,
    content: {
      version: 1 as const,
      title: currentScene.title,
      paragraphs: currentScene.paragraphs,
    },
    response: null,
  };
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'continuation',
      source: {
        storyId: corpus.campaignId,
        narrativeRevision: currentScene.sequence,
        passageId: currentScene.documentId,
        interactionId: input.comparison?.interactionId ?? randomUUID(),
      },
      profile: storytellerCatalogue.resolve({
        id: 'quiet-eerie-mystery',
        revision: 1,
      }),
      execution: input.execution,
      context: {
        canonicalKnowledge,
        premise: {
          title: 'Return to Greywake',
          premise:
            'A traveler returns to Greywake after a long absence and tries to resume an ordinary life.',
          storytellingDirection:
            'Recover only relevant established history before narrating the return.',
        },
        current,
        selected: {
          id: 'ask-key-hiding-place',
          label: 'Ask Mira where she hid the brass key',
          intention:
            'Ask Mira Vale to repeat the exact old hiding place she named for the brass key, without guessing from the current ledger or forcing a larger commitment.',
        },
        items: [],
        notes: [],
        evidence: [current],
      },
    },
    input.usagePolicy,
    {
      ...(input.comparison?.mode === 'one-shot'
        ? { posture: 'off' as const }
        : {
            posture: 'minimal' as const,
            requested: {
              maxQueries: 1,
              maxReads: 1,
              maxRetainedBytes: 4096,
              maxModelRounds: 1,
            },
            maxRepairRounds: input.comparison?.maxRepairRounds ?? 0,
          }),
    },
  );
  const {
    resources: _resources,
    execution,
    ...taskWithoutResourcesOrLedgerIdentity
  } = task;
  const comparisonBasis = {
    ...taskWithoutResourcesOrLedgerIdentity,
    execution:
      execution.mode === 'provider'
        ? {
            ...execution,
            accountId: '<comparison-account>',
            runId: '<comparison-run>',
          }
        : execution,
  };
  const comparisonBasisSha256 = createHash('sha256')
    .update(JSON.stringify(comparisonBasis))
    .digest('hex');
  const generationId = randomUUID();
  await input.database.db.transaction(async (tx) => {
    await tx.insert(generation).values({
      id: generationId,
      ownerId: input.ownerId,
      kind: 'storyteller.profiled.v1',
      input: task,
    });
    await tx.insert(storytellerPublication).values({ generationId });
  });

  const runtime = createStorytellerRuntime(input.database, {
    documentStore: input.documentStore,
    dispatchAuthority: () => input.usagePolicy,
    provider: async () => {
      throw new Error('Held memory packet attempted provider transport');
    },
  });
  await runtime.complete(generationId);

  const response = await fetch(
    `${input.apiOrigin}/api/chamber-tools/generations/${generationId}/dispatch-review`,
    { headers: { cookie: input.cookie, origin: input.browserOrigin } },
  );
  if (!response.ok) {
    throw new Error(`Memory packet review was unavailable: ${response.status}`);
  }
  const review = dispatchReviewResponseSchema.parse(
    await response.json(),
  ).review;
  const accounting = await input.database.db.$client.query(
    `SELECT
       (SELECT count(*) FROM storyteller_attempt WHERE generation_id = $1) AS attempts,
       (SELECT count(*) FROM storyteller_dispatch_review WHERE generation_id = $1 AND state = 'awaiting-review') AS held,
       (SELECT state FROM storyteller_memory_exploration WHERE generation_id = $1) AS memory_state`,
    [generationId],
  );
  const row = accounting.rows[0];
  const expectedMemoryState =
    input.comparison?.mode === 'one-shot' ? null : 'held';
  if (
    row?.attempts !== '0' ||
    row?.held !== '1' ||
    row?.memory_state !== expectedMemoryState
  ) {
    throw new Error(
      'Memory packet did not stop cleanly before provider accounting',
    );
  }

  const evidenceDirectory = join(tmpdir(), 'offscreen-rpg-packet-review');
  await mkdir(evidenceDirectory, { recursive: true });
  const evidencePath = join(
    evidenceDirectory,
    `memory-request-${generationId}.json`,
  );
  const allowance = {
    modelRounds: task.resources.recipe.maxModelRounds,
    perRoundInputTokenCeiling: Math.min(
      input.execution.policy.maxInputTokens,
      input.usagePolicy.limits.maxInputTokensPerRequest,
    ),
    operationInputTokenCeiling: task.resources.envelope.maxInputTokens,
    perRequestSerializedByteCeiling:
      task.resources.envelope.maxSerializedRequestBytes,
    operationGeneratedTokenCeiling: task.resources.envelope.maxGeneratedTokens,
    reads: task.resources.recipe.maxReads,
    retainedReadByteCeiling:
      task.resources.recipe.version === 'memory-exploration.v1'
        ? task.resources.recipe.maxRetainedReadBytes
        : 0,
  };
  await writeFile(
    evidencePath,
    `${JSON.stringify(
      {
        case: {
          id: 'greywake-hidden-key',
          version: '1',
          mode: input.comparison?.mode ?? 'bounded-exploration',
          comparisonBasisSha256,
        },
        corpus: materialized,
        generationId,
        allowance,
        accounting: {
          attempts: 0,
          heldReviews: 1,
          memoryState: expectedMemoryState,
        },
        review,
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
  let finalProjectionPath: string | null = null;
  let finalProjection: {
    packetSha256: string;
    serializedBytes: number;
    capturedRequestBytes: number;
    outputSchemaBytes: number;
  } | null = null;
  if (
    input.comparison?.mode !== 'one-shot' &&
    input.execution.policy.outputProtocol === 'memory-json-object-native-final'
  ) {
    if (!('storyId' in task.source) || !task.context.canonicalKnowledge) {
      throw new Error('Hybrid final projection lacks canonical story context');
    }
    const recipe = task.resources.recipe;
    if (recipe.version !== 'memory-exploration.v1') {
      throw new Error('Hybrid final projection requires memory exploration');
    }
    const root = task.context.canonicalKnowledge;
    const index = await buildLexicalStoryIndex(input.documentStore, {
      storyId: task.source.storyId,
      rootHash: root.rootHash,
      rootRevision: root.rootRevision,
    });
    const explorer = createCanonicalMemoryExplorer({
      storage: input.documentStore,
      index,
      recipe: resolveStoryRetrievalRecipe({
        posture:
          task.resources.creativeExploration.posture === 'off'
            ? 'minimal'
            : task.resources.creativeExploration.posture,
        operationLimits: {
          maxReads: recipe.maxReads,
          maxRetainedBytes: recipe.maxRetainedReadBytes,
        },
      }),
      creativeExploration: task.resources.creativeExploration,
    });
    const scriptedRequest = {
      kind: 'needs_context' as const,
      version: 1 as const,
      purpose:
        "Verify Mira Vale's established answer about the brass key's old hiding place before resolving the question.",
      requests: [
        {
          requestId: 'r1',
          operation: 'ask_memory' as const,
          intent: 'evidence' as const,
          question:
            'What exact hiding place did Mira Vale previously name for the brass key, and in what circumstances did she say it?',
        },
      ],
    };
    await explorer.execute(scriptedRequest);
    const snapshot = explorer.snapshot();
    const prepared = prepareMemoryEvidenceContext(task, snapshot, 2);
    const inspection = inspectOpenRouterRequest(task, {
      request: prepared.request,
      maxGeneratedTokens: Math.max(
        1,
        Math.floor(
          task.resources.envelope.maxGeneratedTokens / recipe.maxModelRounds,
        ),
      ),
      outputProtocol: 'native-json-schema',
    });
    if (
      inspection.outputProtocol !== 'native-json-schema' ||
      inspection.body.response_format.type !== 'json_schema'
    ) {
      throw new Error('Hybrid final projection did not use native schema');
    }
    finalProjectionPath = join(
      evidenceDirectory,
      `memory-final-projection-${generationId}.json`,
    );
    finalProjection = {
      packetSha256: inspection.sha256,
      serializedBytes: inspection.serializedBytes,
      capturedRequestBytes: inspection.capturedRequestBytes,
      outputSchemaBytes: inspection.outputSchemaBytes,
    };
    await writeFile(
      finalProjectionPath,
      `${JSON.stringify(
        {
          format: 'offscreen.memory-final-packet-projection.v1',
          case: {
            id: 'greywake-hidden-key',
            version: '1',
            comparisonBasisSha256,
          },
          generationId,
          sourceHeldReview: {
            attemptId: review.attemptId,
            packetSha256: review.packetSha256,
          },
          scriptedRequest,
          retrievalSnapshot: snapshot,
          finalContext: {
            round: 2,
            canRequestContext: false,
            selectedEvidence: prepared.selected,
            omittedEvidence: prepared.omitted,
            capturedRequestBytes: prepared.capturedRequestBytes,
            boundedRequestBytes: prepared.boundedRequestBytes,
            request: prepared.request,
            evidencePack: prepared.evidencePack,
          },
          inspection,
          accounting: {
            providerAttempts: 0,
            providerSpendMicrousd: '0',
            transportPerformed: false,
          },
        },
        null,
        2,
      )}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
  }
  return {
    evidencePath,
    generationId,
    review,
    corpus: materialized,
    allowance,
    comparisonBasisSha256,
    finalProjectionPath,
    finalProjection,
  } as const;
}

/**
 * Captures a fair missing-context pair without constructing provider transport.
 * Both tasks share one interaction identity and one deterministic corpus root;
 * only their admitted resource recipe differs.
 */
export async function captureHeldMemoryComparisonPackets(
  input: Omit<Parameters<typeof captureHeldMemoryPacket>[0], 'comparison'>,
) {
  const interactionId = randomUUID();
  const oneShot = await captureHeldMemoryPacket({
    ...input,
    comparison: { interactionId, mode: 'one-shot' },
  });
  const boundedExploration = await captureHeldMemoryPacket({
    ...input,
    comparison: { interactionId, mode: 'bounded-exploration' },
  });
  if (
    oneShot.comparisonBasisSha256 !==
      boundedExploration.comparisonBasisSha256 ||
    oneShot.corpus.rootHash !== boundedExploration.corpus.rootHash ||
    oneShot.corpus.rootRevision !== boundedExploration.corpus.rootRevision
  ) {
    throw new Error('Memory comparison changed more than its resource recipe');
  }

  const directory = join(tmpdir(), 'offscreen-rpg-packet-review');
  const path = join(directory, `memory-comparison-${interactionId}.json`);
  const inspection = (capture: typeof oneShot) => ({
    evidencePath: capture.evidencePath,
    generationId: capture.generationId,
    packetSha256: capture.review.packetSha256,
    serializedBytes:
      capture.review.inspection &&
      typeof capture.review.inspection === 'object' &&
      'serializedBytes' in capture.review.inspection
        ? capture.review.inspection.serializedBytes
        : null,
    allowance: capture.allowance,
  });
  await writeFile(
    path,
    `${JSON.stringify(
      {
        format: 'offscreen.memory-comparison-packets.v1',
        case: {
          id: 'greywake-hidden-key',
          version: '1',
          interactionId,
          corpusId: oneShot.corpus.corpusId,
          rootHash: oneShot.corpus.rootHash,
          rootRevision: oneShot.corpus.rootRevision,
          comparisonBasisSha256: oneShot.comparisonBasisSha256,
          expectation:
            'The one-shot candidate must not invent the old key location; bounded exploration may ask for and use canonical evidence before answering.',
        },
        fixedVariables: [
          'canonical root and current passage',
          'selected intention',
          'Storyteller profile and prompt',
          'provider route placeholder and output allowance',
        ],
        changedVariable:
          'single-turn/no-tools versus two-round/one-read memory exploration',
        oneShot: inspection(oneShot),
        boundedExploration: inspection(boundedExploration),
        providerAttempts: 0,
        providerSpendMicrousd: '0',
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
  return { path, oneShot, boundedExploration } as const;
}
