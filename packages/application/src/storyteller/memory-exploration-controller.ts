import { and, eq, sql } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerMemoryExploration } from '@offscreen/db/storyteller-schema';
import {
  storytellerNeedsContextSchema,
  storytellerTaskSchema,
  validateStorytellerResult,
  type StorytellerOutput,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import type { MemoryExplorationSnapshot } from './memory-exploration';

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

    const round = snapshot.rounds.length + 1;
    if (round > recipe.maxModelRounds) {
      throw new Error('Memory exploration final round exhausted');
    }
    const rawOutput = await input.source({ task, round, snapshot });
    const contextRequest = storytellerNeedsContextSchema.safeParse(rawOutput);
    if (contextRequest.success) {
      if (round > recipe.maxModelRounds - recipe.finalAnswerReserveRounds) {
        throw new Error('Memory exploration must preserve the final round');
      }
      if (
        snapshot.readsUsed + contextRequest.data.requests.length >
        recipe.maxReads
      ) {
        throw new Error('Memory exploration read limit exceeded');
      }
      await explorer.execute(contextRequest.data);
      const nextSnapshot = explorer.snapshot();
      assertSnapshotWithinRecipe(nextSnapshot, recipe);
      const updated = await database.db
        .update(storytellerMemoryExploration)
        .set({
          revision: artifact.revision + 1,
          snapshot: nextSnapshot,
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
