import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { storytellerExecutionStage } from '@offscreen/db/storyteller-schema';
import type { Database } from '@offscreen/db';
import type { Transaction } from '../outbox/index';

export const STORYTELLER_EXECUTION_STAGE_PRODUCER =
  process.env['OFFSCREEN_BUILD_ID'] ?? 'local-dev';

export type ExecutionStageName =
  | 'cause-captured'
  | 'context-materialization-started'
  | 'context-materialization-completed'
  | 'task-prepared'
  | 'dispatch-review-prepared'
  | 'provider-dispatch-possible'
  | 'model-response-recorded'
  | 'validation-settled'
  | 'publication-decided'
  | 'stage-held'
  | 'stage-skipped'
  | 'stage-failed';

export type ExecutionStageOutcome =
  | 'completed'
  | 'failed'
  | 'held'
  | 'stale'
  | 'uncertain'
  | 'not-run';

export type ExecutionStageSourceKind =
  | 'generation'
  | 'context-capture'
  | 'dispatch-review'
  | 'publication'
  | 'attempt'
  | 'none';

export type RecordExecutionStageInput = Readonly<{
  generationId: string;
  stage: ExecutionStageName;
  outcome: ExecutionStageOutcome;
  idempotencyKey: string;
  operationId?: string | null;
  attemptId?: string | null;
  sourceKind: ExecutionStageSourceKind;
  sourceId?: string | null;
  sourceSha256?: string | null;
  failureClass?: string | null;
  producerBuildId?: string;
}>;

type StageInsertClient = Pick<Transaction, 'insert'>;

/**
 * Persist one compact stage receipt. Duplicate deliveries are no-ops via
 * UNIQUE(generation_id, stage, idempotency_key). Never stores narrative text.
 */
export async function recordExecutionStage(
  db: StageInsertClient,
  input: RecordExecutionStageInput,
) {
  await db
    .insert(storytellerExecutionStage)
    .values({
      id: randomUUID(),
      generationId: input.generationId,
      operationId: input.operationId ?? null,
      attemptId: input.attemptId ?? null,
      stage: input.stage,
      outcome: input.outcome,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId ?? null,
      sourceSha256: input.sourceSha256 ?? null,
      failureClass: input.failureClass ?? null,
      idempotencyKey: input.idempotencyKey,
      producerBuildId:
        input.producerBuildId ?? STORYTELLER_EXECUTION_STAGE_PRODUCER,
    })
    .onConflictDoNothing({
      target: [
        storytellerExecutionStage.generationId,
        storytellerExecutionStage.stage,
        storytellerExecutionStage.idempotencyKey,
      ],
    });
}

export async function listExecutionStages(
  database: Database,
  generationId: string,
) {
  return database.db
    .select({
      id: storytellerExecutionStage.id,
      generationId: storytellerExecutionStage.generationId,
      operationId: storytellerExecutionStage.operationId,
      attemptId: storytellerExecutionStage.attemptId,
      stage: storytellerExecutionStage.stage,
      outcome: storytellerExecutionStage.outcome,
      sourceKind: storytellerExecutionStage.sourceKind,
      sourceId: storytellerExecutionStage.sourceId,
      sourceSha256: storytellerExecutionStage.sourceSha256,
      failureClass: storytellerExecutionStage.failureClass,
      idempotencyKey: storytellerExecutionStage.idempotencyKey,
      createdAt: storytellerExecutionStage.createdAt,
      producerBuildId: storytellerExecutionStage.producerBuildId,
    })
    .from(storytellerExecutionStage)
    .where(eq(storytellerExecutionStage.generationId, generationId))
    .orderBy(asc(storytellerExecutionStage.createdAt));
}
