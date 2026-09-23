/**
 * Multi-round memory and creative exploration under one operation envelope.
 * Must not own canonical storage or general publication; see
 * ./memory-exploration.ts for admission and ./publication.ts for applying
 * committed results.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerMemoryExploration } from '@offscreen/db/storyteller-schema';
import { canonicalJson } from '@offscreen/documents';
import {
  composeMemoryExplorationDecisionRequest,
  capturedProviderRequestSchema,
  creativeDirectionSetSchema,
  memoryExplorationFinalResponseSchema,
  serializedRequestBytes,
  storytellerNeedsContextSchema,
  storytellerTaskSchema,
  validateStorytellerResult,
  type StorytellerOutput,
  type StorytellerTask,
  type CreativeDirectionSet,
} from '@offscreen/storyteller/tasks';
import {
  CanonicalMemoryExplorationError,
  creativeSnapshotWithinRecipe,
  type MemoryExplorationSnapshot,
} from './memory-exploration';
import { packMemoryExplorationEvidence } from './memory-evidence-packing';
import {
  validateMemoryEvidenceUse,
  type MemoryEvidenceUseReport,
} from './memory-evidence-use';

export type MemoryExplorationFailureCode =
  | 'stale-root'
  | 'invalid-handle'
  | 'read-limit'
  | 'round-limit'
  | 'creative-limit'
  | 'context-limit'
  | 'review-held'
  | 'review-stopped'
  | 'authority-unavailable'
  | 'budget-unavailable'
  | 'usage-uncertain'
  | 'provider-refusal'
  | 'invalid-output'
  | 'provider-uncertain';

export type MemoryRoundInterruption =
  | Readonly<{ state: 'held'; code: 'review-held' }>
  | Readonly<{
      state: 'failed';
      code:
        | 'review-stopped'
        | 'authority-unavailable'
        | 'budget-unavailable'
        | 'provider-refusal'
        | 'invalid-output';
    }>
  | Readonly<{
      state: 'uncertain';
      code: 'usage-uncertain' | 'provider-uncertain';
    }>;

export class MemoryExplorationControllerError extends Error {
  constructor(readonly code: MemoryExplorationFailureCode) {
    super(`Memory exploration stopped: ${code}`);
  }
}

function isFailureCode(value: unknown): value is MemoryExplorationFailureCode {
  return (
    value === 'stale-root' ||
    value === 'invalid-handle' ||
    value === 'read-limit' ||
    value === 'round-limit' ||
    value === 'creative-limit' ||
    value === 'context-limit' ||
    value === 'review-held' ||
    value === 'review-stopped' ||
    value === 'authority-unavailable' ||
    value === 'budget-unavailable' ||
    value === 'usage-uncertain' ||
    value === 'provider-refusal' ||
    value === 'invalid-output' ||
    value === 'provider-uncertain'
  );
}

type CanonicalMemoryExplorer = Readonly<{
  execute: (
    request: ReturnType<typeof storytellerNeedsContextSchema.parse>,
  ) => Promise<unknown>;
  snapshot: () => MemoryExplorationSnapshot;
}>;

export type ScriptedMemoryRoundSource = (input: {
  attemptId: string;
  task: StorytellerTask;
  round: number;
  canRequestContext: boolean;
  snapshot: MemoryExplorationSnapshot;
  request: ReturnType<typeof prepareMemoryEvidenceContext>['request'];
  capturedRequestBytes: number;
  boundedRequestBytes: number;
}) => unknown | Promise<unknown>;

export type CapturedMemoryRoundDelivery = Readonly<{
  output: unknown;
  /** JSON-safe provider usage/telemetry needed by an idempotent settlement hook. */
  settlement: unknown | null;
}>;

export type PersistedMemoryRoundSettlement = (input: {
  attemptId: string;
  task: StorytellerTask;
  round: number;
  delivery: CapturedMemoryRoundDelivery;
  operationOutcome: 'continue' | 'complete';
}) => void | Promise<void>;

export type MemoryExplorationControllerResult = Readonly<{
  output: StorytellerOutput;
  evidenceUse: MemoryEvidenceUseReport;
  creativeDirections: CreativeDirectionSet;
  replayed: boolean;
  explorationRounds: number;
}>;

const storedFinalCandidateSchema = z.strictObject({
  format: z.literal('offscreen.memory-final-candidate.v1'),
  output: z.json(),
  evidenceUse: z.strictObject({
    format: z.literal('offscreen.memory-evidence-use.v1'),
    declaredItemIds: z.array(z.string()),
    declaredSourceIds: z.array(z.string()),
    requiredItemIds: z.array(z.string()),
    requiredUnusedItemIds: z.array(z.string()),
  }),
  creativeDirections: creativeDirectionSetSchema,
});

const storedModelOutputSchema = z.strictObject({
  format: z.literal('offscreen.memory-round-delivery.v1'),
  output: z.json(),
  settlement: z.json().nullable(),
});

function validateCreativeDirections(
  packet: ReturnType<typeof prepareMemoryEvidenceContext>['evidencePack'],
  evidenceUse: MemoryEvidenceUseReport,
  rawDirections: CreativeDirectionSet,
  recipe: StorytellerTask['resources']['creativeExploration'],
) {
  const directions = creativeDirectionSetSchema.parse(rawDirections);
  if (
    directions.directions.length > recipe.limits.maxCandidateDirections ||
    (!recipe.enabled && directions.directions.length > 0)
  ) {
    throw new MemoryExplorationControllerError('creative-limit');
  }
  const packetItems = new Set(packet.evidence.map((item) => item.itemId));
  const usedItems = new Set(evidenceUse.declaredItemIds);
  for (const direction of directions.directions) {
    if (direction.evidenceItemIds.some((itemId) => !packetItems.has(itemId))) {
      throw new Error(
        'Creative direction cites evidence outside the final packet',
      );
    }
    if (
      direction.status === 'selected' &&
      direction.evidenceItemIds.some((itemId) => !usedItems.has(itemId))
    ) {
      throw new Error('Selected creative direction evidence was not used');
    }
  }
  return directions;
}

function creativeOperations(
  snapshot: MemoryExplorationSnapshot,
  pending: ReturnType<typeof storytellerNeedsContextSchema.parse>,
) {
  const prior = snapshot.rounds.flatMap((round) => {
    if (!round || typeof round !== 'object' || Array.isArray(round)) return [];
    const parsed = storytellerNeedsContextSchema.safeParse(
      (round as { request?: unknown }).request,
    );
    return parsed.success ? parsed.data.requests : [];
  });
  return [...prior, ...pending.requests].filter(
    (operation) =>
      operation.operation === 'ask_memory' &&
      operation.intent === 'possibilities',
  );
}

function creativeRequestWithinRecipe(
  task: StorytellerTask,
  snapshot: MemoryExplorationSnapshot,
  request: ReturnType<typeof storytellerNeedsContextSchema.parse>,
) {
  const operations = creativeOperations(snapshot, request);
  if (!operations.length) return true;
  const recipe = task.resources.creativeExploration;
  return (
    recipe.enabled &&
    operations.length <= recipe.limits.maxQueries &&
    recipe.limits.maxLenses >= 1
  );
}

function assertSnapshotWithinRecipe(
  snapshot: MemoryExplorationSnapshot,
  recipe: Extract<
    StorytellerTask['resources']['recipe'],
    { version: 'memory-exploration.v1' }
  >,
) {
  if (
    snapshot.rounds.length >
      recipe.maxModelRounds - recipe.finalAnswerReserveRounds ||
    snapshot.readsUsed > recipe.maxReads ||
    snapshot.retainedBytes > recipe.maxRetainedReadBytes
  ) {
    throw new Error('Memory exploration artifact exceeds its recipe');
  }
}

function requestSha256(request: unknown) {
  // JSONB does not preserve object-key insertion order. Hash the semantic JSON
  // form so a persisted request replays identically after a database round trip.
  return createHash('sha256').update(canonicalJson(request)).digest('hex');
}

/** Builds the inspectable final-context payload under the task's shared request envelope. */
export function prepareMemoryEvidenceContext(
  task: StorytellerTask,
  snapshot: MemoryExplorationSnapshot,
  round: number,
) {
  const recipe = task.resources.recipe;
  if (recipe.version !== 'memory-exploration.v1') {
    throw new Error('Memory evidence requires an exploration recipe');
  }
  const canRequestContext =
    round <= recipe.maxModelRounds - recipe.finalAnswerReserveRounds;
  let availablePacketBytes = Math.min(
    recipe.maxRetainedReadBytes,
    task.resources.envelope.maxSerializedRequestBytes,
  );
  while (availablePacketBytes > 0) {
    const packed = packMemoryExplorationEvidence(snapshot, {
      maxBytes: availablePacketBytes,
      maxItems: 64,
      maxItemsPerGroup: 8,
    });
    if (packed.status === 'mandatory-overflow') break;
    const request = composeMemoryExplorationDecisionRequest({
      request: task.request,
      round,
      canRequestContext,
      evidencePack: packed.packet,
    });
    const capturedRequestBytes = Buffer.byteLength(
      JSON.stringify(request),
      'utf8',
    );
    const boundedRequestBytes = serializedRequestBytes(request);
    const overflow =
      boundedRequestBytes - task.resources.envelope.maxSerializedRequestBytes;
    if (overflow <= 0) {
      return {
        request,
        evidencePack: packed.packet,
        capturedRequestBytes,
        boundedRequestBytes,
        selected: packed.selected,
        omitted: packed.omitted,
      };
    }
    availablePacketBytes = Math.min(
      availablePacketBytes - Math.max(1, overflow),
      packed.bytes - 1,
    );
  }
  throw new MemoryExplorationControllerError('context-limit');
}

/**
 * Runs only the private evidence-gathering/final-candidate lifecycle. The
 * caller still owns generation completion and publication, so a context round
 * can never accidentally become player-visible state.
 */
export async function runMemoryExploration(
  database: Database,
  input: {
    generationId: string;
    task: StorytellerTask;
    createExplorer: (
      snapshot?: MemoryExplorationSnapshot,
    ) => CanonicalMemoryExplorer;
    source: ScriptedMemoryRoundSource;
    captureDelivery?: (rawOutput: unknown) => CapturedMemoryRoundDelivery;
    settlePersistedRound?: PersistedMemoryRoundSettlement;
    classifyRoundError?: (error: unknown) => MemoryRoundInterruption | null;
    closeSettledOperation?: (
      failureCode: MemoryExplorationFailureCode,
    ) => void | Promise<void>;
  },
): Promise<MemoryExplorationControllerResult> {
  const task = storytellerTaskSchema.parse(input.task);
  const recipe = task.resources.recipe;
  if (recipe.version !== 'memory-exploration.v1') {
    throw new Error('Memory exploration requires an exploration task');
  }

  const [generationRecord] = await database.db
    .select({ input: generation.input })
    .from(generation)
    .where(eq(generation.id, input.generationId));
  if (!generationRecord) {
    throw new Error('Memory exploration generation missing');
  }
  const storedTask = storytellerTaskSchema.parse(generationRecord.input);
  if (!isDeepStrictEqual(storedTask, task)) {
    throw new Error('Memory exploration task does not match generation');
  }

  const initialSnapshot = input.createExplorer().snapshot();
  await database.db
    .insert(storytellerMemoryExploration)
    .values({
      generationId: input.generationId,
      snapshot: initialSnapshot,
    })
    .onConflictDoNothing();

  for (;;) {
    const [artifact] = await database.db
      .select()
      .from(storytellerMemoryExploration)
      .where(eq(storytellerMemoryExploration.generationId, input.generationId));
    if (!artifact) throw new Error('Memory exploration artifact missing');

    const explorer = input.createExplorer(
      artifact.snapshot as MemoryExplorationSnapshot,
    );
    const snapshot = explorer.snapshot();
    assertSnapshotWithinRecipe(snapshot, recipe);
    if (artifact.modelRoundsUsed > recipe.maxModelRounds) {
      throw new Error('Memory exploration model rounds exceed its recipe');
    }
    if (
      !creativeSnapshotWithinRecipe(
        snapshot,
        task.resources.creativeExploration,
      )
    ) {
      throw new Error(
        'Stored creative exploration artifact exceeds its recipe',
      );
    }
    if (artifact.state === 'final-ready') {
      const finalCandidate = storedFinalCandidateSchema.parse(
        artifact.finalOutput,
      );
      return {
        output: validateStorytellerResult(task, finalCandidate.output),
        evidenceUse: finalCandidate.evidenceUse,
        creativeDirections: finalCandidate.creativeDirections,
        replayed: true,
        explorationRounds: snapshot.rounds.length,
      };
    }
    if (artifact.state === 'failed' || artifact.state === 'uncertain') {
      if (!isFailureCode(artifact.failureCode)) {
        throw new Error('Memory exploration failure artifact is invalid');
      }
      throw new MemoryExplorationControllerError(artifact.failureCode);
    }

    const interrupt = async (error: unknown): Promise<never> => {
      const interruption = input.classifyRoundError?.(error);
      if (!interruption) throw error;
      if (
        artifact.state === interruption.state &&
        artifact.failureCode === interruption.code
      ) {
        throw new MemoryExplorationControllerError(interruption.code);
      }
      if (interruption.state === 'failed') {
        await input.closeSettledOperation?.(interruption.code);
      }
      const updated = await database.db
        .update(storytellerMemoryExploration)
        .set({
          revision: artifact.revision + 1,
          state: interruption.state,
          failureCode: interruption.code,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(
          and(
            eq(storytellerMemoryExploration.generationId, input.generationId),
            eq(storytellerMemoryExploration.revision, artifact.revision),
            inArray(storytellerMemoryExploration.state, ['exploring', 'held']),
          ),
        )
        .returning({ generationId: storytellerMemoryExploration.generationId });
      if (!updated.length) {
        throw new Error('Memory exploration artifact changed concurrently');
      }
      throw new MemoryExplorationControllerError(interruption.code);
    };

    const fail = async (code: MemoryExplorationFailureCode): Promise<never> => {
      await input.closeSettledOperation?.(code);
      const updated = await database.db
        .update(storytellerMemoryExploration)
        .set({
          revision: artifact.revision + 1,
          state: 'failed',
          pendingModelAttemptId: null,
          pendingModelRequestSha256: null,
          pendingModelRequest: null,
          pendingModelOutput: null,
          pendingRequestSha256: null,
          pendingRequest: null,
          failureCode: code,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(
          and(
            eq(storytellerMemoryExploration.generationId, input.generationId),
            eq(storytellerMemoryExploration.revision, artifact.revision),
            eq(storytellerMemoryExploration.state, 'exploring'),
          ),
        )
        .returning({ generationId: storytellerMemoryExploration.generationId });
      if (!updated.length) {
        throw new Error('Memory exploration artifact changed concurrently');
      }
      throw new MemoryExplorationControllerError(code);
    };

    const round =
      artifact.pendingRequest !== null || artifact.pendingModelOutput !== null
        ? artifact.modelRoundsUsed
        : artifact.modelRoundsUsed + 1;
    if (round > recipe.maxModelRounds) {
      return fail('round-limit');
    }
    const pendingRequest = artifact.pendingRequest
      ? storytellerNeedsContextSchema.parse(artifact.pendingRequest)
      : null;
    if (
      pendingRequest &&
      requestSha256(pendingRequest) !== artifact.pendingRequestSha256
    ) {
      throw new Error('Memory exploration pending request hash mismatch');
    }
    let rawOutput: unknown = pendingRequest;
    let preparedContext: ReturnType<
      typeof prepareMemoryEvidenceContext
    > | null = null;
    if (!pendingRequest) {
      try {
        preparedContext = prepareMemoryEvidenceContext(task, snapshot, round);
      } catch (error) {
        if (
          error instanceof MemoryExplorationControllerError &&
          error.code === 'context-limit'
        ) {
          return fail('context-limit');
        }
        throw error;
      }
      const pendingModelRequest = artifact.pendingModelRequest
        ? capturedProviderRequestSchema.parse(artifact.pendingModelRequest)
        : null;
      if (
        (pendingModelRequest === null) !==
          (artifact.pendingModelAttemptId === null) ||
        (pendingModelRequest === null) !==
          (artifact.pendingModelRequestSha256 === null)
      ) {
        throw new Error('Memory exploration pending model round is invalid');
      }
      if (!pendingModelRequest) {
        const attemptId = randomUUID();
        const requestHash = requestSha256(preparedContext.request);
        const persisted = await database.db
          .update(storytellerMemoryExploration)
          .set({
            revision: artifact.revision + 1,
            pendingModelAttemptId: attemptId,
            pendingModelRequestSha256: requestHash,
            pendingModelRequest: preparedContext.request,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(storytellerMemoryExploration.generationId, input.generationId),
              eq(storytellerMemoryExploration.revision, artifact.revision),
              eq(storytellerMemoryExploration.state, 'exploring'),
              sql`${storytellerMemoryExploration.pendingModelAttemptId} IS NULL`,
            ),
          )
          .returning({
            generationId: storytellerMemoryExploration.generationId,
          });
        if (!persisted.length) {
          throw new Error('Memory exploration artifact changed concurrently');
        }
        continue;
      }
      if (
        requestSha256(pendingModelRequest) !==
        artifact.pendingModelRequestSha256
      ) {
        throw new Error('Memory exploration pending model request mismatch');
      }
      if (artifact.pendingModelOutput !== null) {
        rawOutput = storedModelOutputSchema.parse(
          artifact.pendingModelOutput,
        ).output;
      } else {
        try {
          rawOutput = await input.source({
            attemptId: artifact.pendingModelAttemptId!,
            task,
            round,
            canRequestContext:
              round <=
              recipe.maxModelRounds - recipe.finalAnswerReserveRounds,
            snapshot,
            request: pendingModelRequest,
            capturedRequestBytes: preparedContext.capturedRequestBytes,
            boundedRequestBytes: preparedContext.boundedRequestBytes,
          });
        } catch (error) {
          return interrupt(error);
        }
        const captured = input.captureDelivery?.(rawOutput) ?? {
          output: rawOutput,
          settlement: null,
        };
        const storedOutput = storedModelOutputSchema.parse({
          format: 'offscreen.memory-round-delivery.v1',
          ...captured,
        });
        const persisted = await database.db
          .update(storytellerMemoryExploration)
          .set({
            revision: artifact.revision + 1,
            modelRoundsUsed: artifact.modelRoundsUsed + 1,
            state: 'exploring',
            failureCode: null,
            pendingModelOutput: storedOutput,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(storytellerMemoryExploration.generationId, input.generationId),
              eq(storytellerMemoryExploration.revision, artifact.revision),
              inArray(storytellerMemoryExploration.state, [
                'exploring',
                'held',
              ]),
              eq(
                storytellerMemoryExploration.pendingModelAttemptId,
                artifact.pendingModelAttemptId!,
              ),
              sql`${storytellerMemoryExploration.pendingModelOutput} IS NULL`,
            ),
          )
          .returning({
            generationId: storytellerMemoryExploration.generationId,
          });
        if (!persisted.length) {
          throw new Error('Memory exploration artifact changed concurrently');
        }
        continue;
      }
    }
    const contextRequest = storytellerNeedsContextSchema.safeParse(rawOutput);
    const validatedFinalCandidate = (() => {
      if (contextRequest.success || !preparedContext) return null;
      const parsed = memoryExplorationFinalResponseSchema.safeParse(rawOutput);
      if (!parsed.success) return null;
      try {
        const output = validateStorytellerResult(task, parsed.data.result);
        const evidenceUse = validateMemoryEvidenceUse(
          preparedContext.evidencePack,
          parsed.data.evidenceUse,
        );
        const creativeDirections = validateCreativeDirections(
          preparedContext.evidencePack,
          evidenceUse,
          parsed.data.creativeDirections,
          task.resources.creativeExploration,
        );
        return {
          format: 'offscreen.memory-final-candidate.v1' as const,
          output,
          evidenceUse,
          creativeDirections,
        };
      } catch {
        return null;
      }
    })();
    const repairRoundsUsed = Math.max(
      0,
      artifact.modelRoundsUsed - snapshot.rounds.length - 1,
    );
    const repairableInvalidFinal =
      !contextRequest.success &&
      validatedFinalCandidate === null &&
      artifact.modelRoundsUsed < recipe.maxModelRounds &&
      repairRoundsUsed < recipe.maxRepairRounds;
    const admissibleContextRequest =
      contextRequest.success &&
      round <= recipe.maxModelRounds - recipe.finalAnswerReserveRounds &&
      snapshot.readsUsed + contextRequest.data.requests.length <=
        recipe.maxReads &&
      creativeRequestWithinRecipe(task, snapshot, contextRequest.data);
    if (!pendingRequest && input.settlePersistedRound) {
      if (
        !artifact.pendingModelAttemptId ||
        artifact.pendingModelOutput === null
      ) {
        throw new Error('Memory exploration settlement lacks a saved delivery');
      }
      const delivery = storedModelOutputSchema.parse(
        artifact.pendingModelOutput,
      );
      try {
        await input.settlePersistedRound({
          attemptId: artifact.pendingModelAttemptId,
          task,
          round,
          delivery,
          operationOutcome:
            admissibleContextRequest || repairableInvalidFinal
              ? 'continue'
              : 'complete',
        });
      } catch (error) {
        return interrupt(error);
      }
    }
    if (contextRequest.success) {
      if (round > recipe.maxModelRounds - recipe.finalAnswerReserveRounds) {
        return fail('round-limit');
      }
      if (
        snapshot.readsUsed + contextRequest.data.requests.length >
        recipe.maxReads
      ) {
        return fail('read-limit');
      }
      if (!creativeRequestWithinRecipe(task, snapshot, contextRequest.data)) {
        return fail('creative-limit');
      }
      if (!pendingRequest) {
        const requestHash = requestSha256(contextRequest.data);
        const persisted = await database.db
          .update(storytellerMemoryExploration)
          .set({
            revision: artifact.revision + 1,
            pendingModelAttemptId: null,
            pendingModelRequestSha256: null,
            pendingModelRequest: null,
            pendingModelOutput: null,
            pendingRequestSha256: requestHash,
            pendingRequest: contextRequest.data,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(storytellerMemoryExploration.generationId, input.generationId),
              eq(storytellerMemoryExploration.revision, artifact.revision),
              eq(storytellerMemoryExploration.state, 'exploring'),
              sql`${storytellerMemoryExploration.pendingRequest} IS NULL`,
            ),
          )
          .returning({
            generationId: storytellerMemoryExploration.generationId,
          });
        if (!persisted.length) {
          throw new Error('Memory exploration artifact changed concurrently');
        }
        continue;
      }
      try {
        await explorer.execute(contextRequest.data);
      } catch (error) {
        if (error instanceof CanonicalMemoryExplorationError) {
          return fail(error.code);
        }
        throw error;
      }
      const nextSnapshot = explorer.snapshot();
      assertSnapshotWithinRecipe(nextSnapshot, recipe);
      if (
        !creativeSnapshotWithinRecipe(
          nextSnapshot,
          task.resources.creativeExploration,
        )
      ) {
        return fail('creative-limit');
      }
      const updated = await database.db
        .update(storytellerMemoryExploration)
        .set({
          revision: artifact.revision + 1,
          snapshot: nextSnapshot,
          pendingRequestSha256: null,
          pendingRequest: null,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(
          and(
            eq(storytellerMemoryExploration.generationId, input.generationId),
            eq(storytellerMemoryExploration.revision, artifact.revision),
            eq(storytellerMemoryExploration.state, 'exploring'),
          ),
        )
        .returning({ generationId: storytellerMemoryExploration.generationId });
      if (!updated.length) {
        throw new Error('Memory exploration artifact changed concurrently');
      }
      continue;
    }

    if (!validatedFinalCandidate) {
      if (!repairableInvalidFinal) {
        return fail('invalid-output');
      }
      const repaired = await database.db
        .update(storytellerMemoryExploration)
        .set({
          revision: artifact.revision + 1,
          pendingModelAttemptId: null,
          pendingModelRequestSha256: null,
          pendingModelRequest: null,
          pendingModelOutput: null,
          updatedAt: sql`clock_timestamp()`,
        })
        .where(
          and(
            eq(storytellerMemoryExploration.generationId, input.generationId),
            eq(storytellerMemoryExploration.revision, artifact.revision),
            eq(storytellerMemoryExploration.state, 'exploring'),
          ),
        )
        .returning({ generationId: storytellerMemoryExploration.generationId });
      if (!repaired.length) {
        throw new Error('Memory exploration artifact changed concurrently');
      }
      continue;
    }

    if (!preparedContext) {
      throw new Error('Final memory response is missing its evidence context');
    }
    const finalCandidate = validatedFinalCandidate;
    const updated = await database.db
      .update(storytellerMemoryExploration)
      .set({
        revision: artifact.revision + 1,
        state: 'final-ready',
        pendingModelAttemptId: null,
        pendingModelRequestSha256: null,
        pendingModelRequest: null,
        pendingModelOutput: null,
        finalOutput: finalCandidate,
        updatedAt: sql`clock_timestamp()`,
      })
      .where(
        and(
          eq(storytellerMemoryExploration.generationId, input.generationId),
          eq(storytellerMemoryExploration.revision, artifact.revision),
          eq(storytellerMemoryExploration.state, 'exploring'),
        ),
      )
      .returning({ generationId: storytellerMemoryExploration.generationId });
    if (!updated.length) {
      throw new Error('Memory exploration artifact changed concurrently');
    }
    return {
      output: finalCandidate.output,
      evidenceUse: finalCandidate.evidenceUse,
      creativeDirections: finalCandidate.creativeDirections,
      replayed: false,
      explorationRounds: snapshot.rounds.length,
    };
  }
}

/** Backward-compatible name for the original provider-free controller API. */
export const runScriptedMemoryExploration = runMemoryExploration;
