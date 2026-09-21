import { and, eq, sql } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerMemoryExploration } from '@offscreen/db/storyteller-schema';
import {
  composeMemoryExplorationDecisionRequest,
  serializedRequestBytes,
  storytellerNeedsContextSchema,
  storytellerTaskSchema,
  validateStorytellerResult,
  type StorytellerOutput,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import {
  CanonicalMemoryExplorationError,
  type MemoryExplorationSnapshot,
} from './memory-exploration';
import { packMemoryExplorationEvidence } from './memory-evidence-packing';

export type MemoryExplorationFailureCode =
  | 'stale-root'
  | 'invalid-handle'
  | 'read-limit'
  | 'round-limit'
  | 'context-limit';

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
    value === 'context-limit'
  );
}

type CanonicalMemoryExplorer = Readonly<{
  execute: (
    request: ReturnType<typeof storytellerNeedsContextSchema.parse>,
  ) => Promise<unknown>;
  snapshot: () => MemoryExplorationSnapshot;
}>;

export type ScriptedMemoryRoundSource = (input: {
  task: StorytellerTask;
  round: number;
  snapshot: MemoryExplorationSnapshot;
  request: ReturnType<typeof prepareMemoryEvidenceContext>['request'];
  capturedRequestBytes: number;
  boundedRequestBytes: number;
}) => unknown | Promise<unknown>;

export type MemoryExplorationControllerResult = Readonly<{
  output: StorytellerOutput;
  replayed: boolean;
  explorationRounds: number;
}>;

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
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
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
      boundedRequestBytes -
      task.resources.envelope.maxSerializedRequestBytes;
    if (overflow <= 0) {
      return {
        request,
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
export async function runScriptedMemoryExploration(
  database: Database,
  input: {
    generationId: string;
    task: StorytellerTask;
    createExplorer: (
      snapshot?: MemoryExplorationSnapshot,
    ) => CanonicalMemoryExplorer;
    source: ScriptedMemoryRoundSource;
  },
): Promise<MemoryExplorationControllerResult> {
  const task = storytellerTaskSchema.parse(input.task);
  const recipe = task.resources.recipe;
  if (
    task.execution.mode !== 'scripted' ||
    recipe.version !== 'memory-exploration.v1'
  ) {
    throw new Error('Memory exploration requires a scripted exploration task');
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
    if (artifact.state === 'final-ready') {
      return {
        output: validateStorytellerResult(task, artifact.finalOutput),
        replayed: true,
        explorationRounds: snapshot.rounds.length,
      };
    }
    if (artifact.state === 'failed') {
      if (!isFailureCode(artifact.failureCode)) {
        throw new Error('Memory exploration failure artifact is invalid');
      }
      throw new MemoryExplorationControllerError(artifact.failureCode);
    }

    const fail = async (code: MemoryExplorationFailureCode): Promise<never> => {
      const updated = await database.db
        .update(storytellerMemoryExploration)
        .set({
          revision: artifact.revision + 1,
          state: 'failed',
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

    const round = snapshot.rounds.length + 1;
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
    if (!pendingRequest) {
      let preparedContext: ReturnType<typeof prepareMemoryEvidenceContext>;
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
      rawOutput = await input.source({
        task,
        round,
        snapshot,
        request: preparedContext.request,
        capturedRequestBytes: preparedContext.capturedRequestBytes,
        boundedRequestBytes: preparedContext.boundedRequestBytes,
      });
    }
    const contextRequest = storytellerNeedsContextSchema.safeParse(rawOutput);
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
      if (!pendingRequest) {
        const requestHash = requestSha256(contextRequest.data);
        const persisted = await database.db
          .update(storytellerMemoryExploration)
          .set({
            revision: artifact.revision + 1,
            pendingRequestSha256: requestHash,
            pendingRequest: contextRequest.data,
            updatedAt: sql`clock_timestamp()`,
          })
          .where(
            and(
              eq(
                storytellerMemoryExploration.generationId,
                input.generationId,
              ),
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

    const output = validateStorytellerResult(task, rawOutput);
    const updated = await database.db
      .update(storytellerMemoryExploration)
      .set({
        revision: artifact.revision + 1,
        state: 'final-ready',
        finalOutput: output,
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
      output,
      replayed: false,
      explorationRounds: snapshot.rounds.length,
    };
  }
}
