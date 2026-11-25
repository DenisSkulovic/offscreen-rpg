import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/story-persistence/generations';
import { storytellerAttempt } from '@offscreen/story-persistence/storyteller';
import {
  storytellerTaskSchema,
  validateStorytellerResult,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import {
  hashStorytellerCustodyResult,
  readStorytellerSavedCustody,
  type PinnedStorytellerRoot,
} from './execution';
import { storytellerKind } from './records';

export type AdoptSavedStorytellerOutcome =
  | {
      status: 'adopted';
      generationId: string;
      attemptId: string;
      resultHash: string;
      statusRevision: number;
    }
  | {
      status: 'idempotent';
      generationId: string;
      attemptId: string;
      resultHash: string;
      statusRevision: number;
    }
  | {
      status: 'held';
      reason:
        | 'repair-pending'
        | 'legacy-state'
        | 'attempt-mismatch'
        | 'result-mismatch'
        | 'failed-state';
      generationId: string;
    }
  | {
      status: 'refused';
      reason:
        | 'unknown-generation'
        | 'root-mismatch'
        | 'unreadable-task'
        | 'missing-saved-result'
        | 'invalid-saved-result';
      generationId?: string;
    };

type LockedGeneration = {
  id: string;
  state: 'pending' | 'running' | 'succeeded' | 'failed' | 'uncertain';
  attemptId: string | null;
  output: unknown;
  statusRevision: number;
  repairCandidate: unknown;
  repairDiagnostic: unknown;
  input: unknown;
};

function readPinnedRoot(task: StorytellerTask): PinnedStorytellerRoot {
  return task.context.canonicalKnowledge?.rootHash ?? null;
}

function rootsMatch(
  committed: PinnedStorytellerRoot,
  presented: PinnedStorytellerRoot,
) {
  return committed === presented;
}

function validatedSavedResult(task: StorytellerTask, result: unknown) {
  try {
    const validated = validateStorytellerResult(task, result);
    return {
      ok: true as const,
      result: validated,
      resultHash: hashStorytellerCustodyResult(validated),
    };
  } catch {
    return { ok: false as const };
  }
}

function outputsMatch(
  task: StorytellerTask,
  output: unknown,
  expectedHash: string,
) {
  const validated = validatedSavedResult(task, output);
  if (!validated.ok) return false;
  if (validated.resultHash !== expectedHash) return false;
  return hashStorytellerCustodyResult(validated.result) === expectedHash;
}

function idempotentSucceeded(
  row: LockedGeneration,
  attemptId: string,
  task: StorytellerTask,
  resultHash: string,
  result: unknown,
): AdoptSavedStorytellerOutcome | null {
  if (row.state !== 'succeeded' || row.attemptId !== attemptId) return null;
  if (
    outputsMatch(task, row.output, resultHash) &&
    row.attemptId === attemptId
  ) {
    return {
      status: 'idempotent',
      generationId: row.id,
      attemptId,
      resultHash,
      statusRevision: row.statusRevision,
    };
  }
  return {
    status: 'held',
    reason: row.attemptId === attemptId ? 'result-mismatch' : 'attempt-mismatch',
    generationId: row.id,
  };
}

export function createStorytellerGenerationAdoption(database: Database) {
  return {
    async adoptSavedStorytellerGeneration(input: {
      generationId: string;
      pinnedRoot: PinnedStorytellerRoot;
    }): Promise<AdoptSavedStorytellerOutcome> {
      return database.db.transaction(async (tx) => {
        const [row] = await tx
          .select({
            id: generation.id,
            state: generation.state,
            attemptId: generation.attemptId,
            output: generation.output,
            statusRevision: generation.statusRevision,
            repairCandidate: generation.repairCandidate,
            repairDiagnostic: generation.repairDiagnostic,
            input: generation.input,
          })
          .from(generation)
          .where(
            and(
              eq(generation.id, input.generationId),
              eq(generation.kind, storytellerKind),
            ),
          )
          .for('update');
        if (!row) {
          return { status: 'refused', reason: 'unknown-generation' };
        }
        const parsed = storytellerTaskSchema.safeParse(row.input);
        if (!parsed.success) {
          return {
            status: 'refused',
            reason: 'unreadable-task',
            generationId: row.id,
          };
        }
        const task = parsed.data;
        const committedRoot = readPinnedRoot(task);
        if (!rootsMatch(committedRoot, input.pinnedRoot)) {
          return {
            status: 'refused',
            reason: 'root-mismatch',
            generationId: row.id,
          };
        }
        const attempts = await tx
          .select({
            id: storytellerAttempt.id,
            createdAt: storytellerAttempt.createdAt,
            attribution: storytellerAttempt.attribution,
          })
          .from(storytellerAttempt)
          .where(eq(storytellerAttempt.generationId, row.id))
          .orderBy(
            asc(storytellerAttempt.createdAt),
            asc(storytellerAttempt.id),
          )
          .for('update');
        const savedAttempt = [...attempts]
          .sort((left, right) => {
            const time = left.createdAt.getTime() - right.createdAt.getTime();
            if (time !== 0) return time;
            return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
          })
          .map((attempt) => {
            const saved = readStorytellerSavedCustody(attempt.attribution);
            return saved ? { attemptId: attempt.id, saved } : null;
          })
          .find((entry) => entry != null);
        if (!savedAttempt) {
          return {
            status: 'refused',
            reason: 'missing-saved-result',
            generationId: row.id,
          };
        }
        const validated = validatedSavedResult(
          task,
          savedAttempt.saved.result,
        );
        if (!validated.ok) {
          return {
            status: 'refused',
            reason: 'invalid-saved-result',
            generationId: row.id,
          };
        }
        if (validated.resultHash !== savedAttempt.saved.resultHash) {
          return {
            status: 'refused',
            reason: 'invalid-saved-result',
            generationId: row.id,
          };
        }

        const locked: LockedGeneration = {
          id: row.id,
          state: row.state,
          attemptId: row.attemptId,
          output: row.output,
          statusRevision: row.statusRevision,
          repairCandidate: row.repairCandidate,
          repairDiagnostic: row.repairDiagnostic,
          input: row.input,
        };

        const idempotent = idempotentSucceeded(
          locked,
          savedAttempt.attemptId,
          task,
          validated.resultHash,
          validated.result,
        );
        if (idempotent) return idempotent;

        if (
          locked.repairCandidate != null ||
          locked.repairDiagnostic != null
        ) {
          return {
            status: 'held',
            reason: 'repair-pending',
            generationId: locked.id,
          };
        }

        if (locked.state === 'failed') {
          return {
            status: 'held',
            reason: 'failed-state',
            generationId: locked.id,
          };
        }

        if (locked.state === 'running' || locked.state === 'uncertain') {
          if (locked.attemptId !== savedAttempt.attemptId) {
            return {
              status: 'held',
              reason: 'attempt-mismatch',
              generationId: locked.id,
            };
          }
          return {
            status: 'held',
            reason: 'legacy-state',
            generationId: locked.id,
          };
        }

        if (locked.state !== 'pending' || locked.attemptId != null) {
          return {
            status: 'held',
            reason: 'legacy-state',
            generationId: locked.id,
          };
        }

        const [promoted] = await tx
          .update(generation)
          .set({
            state: 'succeeded',
            attemptId: savedAttempt.attemptId,
            output: validated.result,
            failureCode: null,
            statusRevision: sql`${generation.statusRevision} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generation.id, locked.id),
              eq(generation.state, 'pending'),
              isNull(generation.attemptId),
              isNull(generation.output),
              isNull(generation.failureCode),
              isNull(generation.repairCandidate),
              isNull(generation.repairDiagnostic),
            ),
          )
          .returning({
            statusRevision: generation.statusRevision,
          });

        if (!promoted) {
          const [current] = await tx
            .select({
              id: generation.id,
              state: generation.state,
              attemptId: generation.attemptId,
              output: generation.output,
              statusRevision: generation.statusRevision,
              repairCandidate: generation.repairCandidate,
              repairDiagnostic: generation.repairDiagnostic,
              input: generation.input,
            })
            .from(generation)
            .where(eq(generation.id, locked.id));
          if (!current) {
            return { status: 'refused', reason: 'unknown-generation' };
          }
          const retry = idempotentSucceeded(
            {
              id: current.id,
              state: current.state,
              attemptId: current.attemptId,
              output: current.output,
              statusRevision: current.statusRevision,
              repairCandidate: current.repairCandidate,
              repairDiagnostic: current.repairDiagnostic,
              input: current.input,
            },
            savedAttempt.attemptId,
            task,
            validated.resultHash,
            validated.result,
          );
          if (retry) return retry;
          return {
            status: 'held',
            reason: 'legacy-state',
            generationId: locked.id,
          };
        }

        return {
          status: 'adopted',
          generationId: locked.id,
          attemptId: savedAttempt.attemptId,
          resultHash: validated.resultHash,
          statusRevision: promoted.statusRevision,
        };
      });
    },
  };
}