import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { storytellerExecutionStage } from '@offscreen/db/storyteller-schema';
import type { Database } from '@offscreen/db';
import type { Transaction } from '../outbox/index';

export const STORYTELLER_EXECUTION_STAGE_PRODUCER =
  process.env['OFFSCREEN_BUILD_ID'] ?? 'local-dev';

export class ExecutionStageIntegrityError extends Error {
  readonly code = 'execution_stage_integrity_conflict' as const;
  constructor(
    readonly generationId: string,
    readonly stage: string,
    readonly idempotencyKey: string,
  ) {
    super('execution_stage_integrity_conflict');
    this.name = 'ExecutionStageIntegrityError';
  }
}

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

type StageClient = Pick<Transaction, 'insert' | 'select'>;

function substantiveFields(input: {
  outcome: string;
  attemptId: string | null;
  sourceKind: string;
  sourceId: string | null;
  sourceSha256: string | null;
  failureClass: string | null;
  operationId: string | null;
  producerBuildId: string;
}) {
  return {
    outcome: input.outcome,
    attemptId: input.attemptId,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    sourceSha256: input.sourceSha256,
    failureClass: input.failureClass,
    operationId: input.operationId,
    producerBuildId: input.producerBuildId,
  };
}

/**
 * Persist one compact stage receipt. Same key + same substantive fields is a
 * no-op retry. Same key with divergent facts raises integrity conflict.
 * Never stores narrative text.
 */
export async function recordExecutionStage(
  db: StageClient,
  input: RecordExecutionStageInput,
) {
  const producerBuildId =
    input.producerBuildId ?? STORYTELLER_EXECUTION_STAGE_PRODUCER;
  const values = {
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
    producerBuildId,
  };
  await db
    .insert(storytellerExecutionStage)
    .values(values)
    .onConflictDoNothing({
      target: [
        storytellerExecutionStage.generationId,
        storytellerExecutionStage.stage,
        storytellerExecutionStage.idempotencyKey,
      ],
    });
  const [existing] = await db
    .select({
      outcome: storytellerExecutionStage.outcome,
      attemptId: storytellerExecutionStage.attemptId,
      sourceKind: storytellerExecutionStage.sourceKind,
      sourceId: storytellerExecutionStage.sourceId,
      sourceSha256: storytellerExecutionStage.sourceSha256,
      failureClass: storytellerExecutionStage.failureClass,
      operationId: storytellerExecutionStage.operationId,
      producerBuildId: storytellerExecutionStage.producerBuildId,
    })
    .from(storytellerExecutionStage)
    .where(
      and(
        eq(storytellerExecutionStage.generationId, input.generationId),
        eq(storytellerExecutionStage.stage, input.stage),
        eq(storytellerExecutionStage.idempotencyKey, input.idempotencyKey),
      ),
    );
  if (!existing) {
    throw new Error('execution_stage_missing_after_insert');
  }
  const expected = substantiveFields({
    outcome: values.outcome,
    attemptId: values.attemptId,
    sourceKind: values.sourceKind,
    sourceId: values.sourceId,
    sourceSha256: values.sourceSha256,
    failureClass: values.failureClass,
    operationId: values.operationId,
    producerBuildId: values.producerBuildId,
  });
  const actual = substantiveFields(existing);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new ExecutionStageIntegrityError(
      input.generationId,
      input.stage,
      input.idempotencyKey,
    );
  }
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
    .orderBy(
      asc(storytellerExecutionStage.createdAt),
      asc(storytellerExecutionStage.id),
    );
}

/** Capture materialization stage identity includes rearm epoch + attempt. */
export function captureMaterializationStartedKey(
  rearmEpoch: number,
  attempt: number,
) {
  return `context-materialization-started:e${rearmEpoch}:a${attempt}`;
}

export function captureTerminalStageKey(
  rearmEpoch: number,
  attempt: number,
  state: 'held' | 'blocked' | 'stale',
) {
  return `capture-terminal:e${rearmEpoch}:a${attempt}:${state}`;
}
