import { randomUUID } from 'node:crypto';

import { operationKey } from '../contract.js';
import {
  formatNonNegativeBigInt,
  insertExecutionClaim,
  parseNonNegativeBigInt,
  readExecutionByKey,
  updateExecutionCheckpoint,
  type ExecutionRecord,
  type LedgerQueryable,
} from '../ledger/repository.js';
import {
  redactSessionError,
  SessionError,
  withMutationSession,
  withReadOnlySession,
  type SessionClient,
  type SessionContext,
} from './session.js';
import {
  assertActorSyntax,
  assertRunnableBatchedManifest,
  BatchedOperationError,
  freezeRegisteredBatchedOperation,
  parseAtomicCount,
  resolveBatchedDispatchBounds,
  type RegisteredBatchedOperation,
} from './operation.js';
import {
  assertCleanGitProvenance,
  readGitProvenance,
  recheckGitProvenance,
  type GitProvenanceReader,
} from './atomic.js';

export { freezeRegisteredBatchedOperation, resolveBatchedDispatchBounds };

export type BatchedPlanReceipt = Readonly<{
  operationKey: string;
  targetId: string;
  eligibleRows: string;
  estimateOnly: true;
  manifest: RegisteredBatchedOperation['manifest'];
}>;

export type BatchedStatusReceipt = Readonly<{
  operationKey: string;
  targetId: string;
  enrolled: true;
  execution: ExecutionRecord | null;
}>;

export type BatchedRunReceipt =
  | Readonly<{
      outcome: 'noop';
      operationKey: string;
      targetId: string;
      artifactSha: string;
    }>
  | Readonly<{
      outcome: 'succeeded';
      operationKey: string;
      targetId: string;
      runId: string;
      artifactSha: string;
      actor: string;
      checkpoint: string;
      processed: string;
    }>
  | Readonly<{
      outcome: 'paused';
      operationKey: string;
      targetId: string;
      runId: string;
      artifactSha: string;
      actor: string;
      checkpoint: string;
      processed: string;
      batchesApplied: number;
    }>;

export type BatchedRunRequest = Readonly<{
  targetId: string;
  confirmTarget: string;
  actor: string;
  resume: boolean;
  batchSize?: number;
  maxBatches?: number;
}>;

type ActiveExecutionContext = Readonly<{
  runId: string;
  actor: string;
  checkpoint: bigint;
  processed: bigint;
}>;

function operationQuery(queryable: LedgerQueryable) {
  return (sql: string, values?: readonly unknown[]) =>
    queryable.query(sql, values);
}

function refuseSucceededShaMismatch(
  existing: ExecutionRecord,
  sha: string,
): void {
  if (existing.state === 'succeeded' && existing.artifactSha !== sha) {
    throw new BatchedOperationError(
      'operation already succeeded under different artifact SHA; refused',
    );
  }
}

function refuseWithoutExplicitResume(existing: ExecutionRecord): void {
  if (existing.state === 'running' || existing.state === 'paused') {
    throw new BatchedOperationError(
      'execution already active; explicit resume required',
    );
  }
}

function assertMatchingArtifact(existing: ExecutionRecord, sha: string): void {
  if (existing.artifactSha !== sha) {
    throw new BatchedOperationError(
      'operation artifact SHA does not match active execution; refused',
    );
  }
}

function assertBatchCursorProgress(
  checkpoint: bigint,
  lastId: bigint,
  done: boolean,
): void {
  if (lastId < checkpoint) {
    throw new BatchedOperationError(
      'batch lastId precedes checkpoint cursor; refused',
    );
  }
  if (!done && lastId <= checkpoint) {
    throw new BatchedOperationError(
      'batch lastId must strictly advance checkpoint while not done; refused',
    );
  }
}

function assertBatchAffectedRows(
  affectedRows: bigint,
  batchSize: number,
): void {
  const limit = BigInt(batchSize);
  if (affectedRows < 0n || affectedRows > limit) {
    throw new BatchedOperationError(
      'batch affectedRows outside inclusive batch bounds; refused',
    );
  }
}

function assertNondecreasingProcessed(
  prior: bigint,
  next: bigint,
  affectedRows: bigint,
): void {
  const expected = prior + affectedRows;
  if (next !== expected) {
    throw new BatchedOperationError(
      'batch processed count does not match prior plus affectedRows; refused',
    );
  }
  if (next < prior) {
    throw new BatchedOperationError('processed count decreased; refused');
  }
}

function loadActiveExecution(
  existing: ExecutionRecord,
): ActiveExecutionContext {
  return Object.freeze({
    runId: existing.runId,
    actor: existing.actor,
    checkpoint: parseNonNegativeBigInt(existing.checkpoint, 'checkpoint'),
    processed: parseNonNegativeBigInt(existing.processed, 'processed'),
  });
}

async function commitStartClaim(
  ctx: SessionContext,
  key: string,
  artifactSha: string,
  actor: string,
): Promise<ActiveExecutionContext> {
  const runId = randomUUID();
  await ctx.runTransaction(async (tx) => {
    const existing = await readExecutionByKey(tx, key);
    if (existing !== undefined) {
      throw new BatchedOperationError(
        'execution claim already exists for operation_key',
      );
    }
    await insertExecutionClaim(tx, {
      operationKey: key,
      artifactSha,
      runId,
      actor,
      checkpoint: 0n,
      processed: 0n,
    });
  });
  return Object.freeze({
    runId,
    actor,
    checkpoint: 0n,
    processed: 0n,
  });
}

async function commitResumeTransition(
  ctx: SessionContext,
  key: string,
  artifactSha: string,
  existing: ExecutionRecord,
): Promise<ActiveExecutionContext> {
  const active = loadActiveExecution(existing);
  if (existing.state === 'paused') {
    await ctx.runTransaction(async (tx) => {
      const current = await readExecutionByKey(tx, key);
      if (current === undefined) {
        throw new BatchedOperationError('execution row missing on resume');
      }
      assertMatchingArtifact(current, artifactSha);
      if (current.state !== 'paused') {
        throw new BatchedOperationError(
          'execution state changed before resume; refused',
        );
      }
      await updateExecutionCheckpoint(tx, {
        operationKey: key,
        runId: current.runId,
        artifactSha,
        expectedState: 'paused',
        expectedCheckpoint: current.checkpoint,
        expectedProcessed: current.processed,
        newState: 'running',
        newCheckpoint: current.checkpoint,
        newProcessed: current.processed,
        event: 'batch',
      });
    });
  }
  return active;
}

async function initializeBatchedRun(
  ctx: SessionContext,
  key: string,
  artifactSha: string,
  actor: string,
  resume: boolean,
): Promise<
  | Readonly<{ kind: 'noop' }>
  | Readonly<{ kind: 'active'; active: ActiveExecutionContext }>
> {
  const existing = await readExecutionByKey(ctx, key);
  if (existing === undefined) {
    if (resume) {
      throw new BatchedOperationError(
        'resume requested but no execution exists; refused',
      );
    }
    const active = await commitStartClaim(ctx, key, artifactSha, actor);
    return Object.freeze({ kind: 'active', active });
  }

  if (existing.state === 'succeeded' && existing.artifactSha === artifactSha) {
    return Object.freeze({ kind: 'noop' });
  }
  refuseSucceededShaMismatch(existing, artifactSha);
  assertMatchingArtifact(existing, artifactSha);
  if (!resume) {
    refuseWithoutExplicitResume(existing);
  }
  const active = await commitResumeTransition(ctx, key, artifactSha, existing);
  return Object.freeze({ kind: 'active', active });
}

async function runSingleBatch(
  operation: RegisteredBatchedOperation,
  ctx: SessionContext,
  key: string,
  artifactSha: string,
  active: ActiveExecutionContext,
  batchSize: number,
): Promise<
  | Readonly<{ done: true; receipt: BatchedRunReceipt }>
  | Readonly<{ done: false; active: ActiveExecutionContext }>
> {
  return ctx.runTransaction(async (tx) => {
    const current = await readExecutionByKey(tx, key);
    if (current === undefined) {
      throw new BatchedOperationError('execution row missing during batch');
    }
    assertMatchingArtifact(current, artifactSha);
    if (current.runId !== active.runId) {
      throw new BatchedOperationError('execution run_id mismatch; refused');
    }
    if (current.state !== 'running') {
      throw new BatchedOperationError(
        'execution must be running to apply batch; refused',
      );
    }

    const checkpoint = parseNonNegativeBigInt(current.checkpoint, 'checkpoint');
    const processed = parseNonNegativeBigInt(current.processed, 'processed');
    if (checkpoint !== active.checkpoint || processed !== active.processed) {
      throw new BatchedOperationError(
        'execution checkpoint mismatch with dispatch context; refused',
      );
    }

    const query = operationQuery(tx);
    const batch = await operation.nextBatch(query, checkpoint, batchSize);
    assertBatchCursorProgress(checkpoint, batch.lastId, batch.done);
    assertBatchAffectedRows(batch.affectedRows, batchSize);

    const newProcessed = processed + batch.affectedRows;
    assertNondecreasingProcessed(processed, newProcessed, batch.affectedRows);
    const targetId = ctx.marker.targetId;

    if (batch.done) {
      const verified = await operation.verify(query);
      if (verified !== true) {
        throw new BatchedOperationError(
          'operation verify returned false; refused',
        );
      }
      const checkpointDecimal = formatNonNegativeBigInt(batch.lastId);
      const processedDecimal = formatNonNegativeBigInt(newProcessed);
      await updateExecutionCheckpoint(tx, {
        operationKey: key,
        runId: active.runId,
        artifactSha,
        expectedState: 'running',
        expectedCheckpoint: formatNonNegativeBigInt(checkpoint),
        expectedProcessed: formatNonNegativeBigInt(processed),
        newState: 'succeeded',
        newCheckpoint: checkpointDecimal,
        newProcessed: processedDecimal,
        event: 'succeeded',
      });
      return Object.freeze({
        done: true as const,
        receipt: Object.freeze({
          outcome: 'succeeded' as const,
          operationKey: key,
          targetId,
          runId: active.runId,
          artifactSha,
          actor: active.actor,
          checkpoint: checkpointDecimal,
          processed: processedDecimal,
        }),
      });
    }

    const checkpointDecimal = formatNonNegativeBigInt(batch.lastId);
    const processedDecimal = formatNonNegativeBigInt(newProcessed);
    await updateExecutionCheckpoint(tx, {
      operationKey: key,
      runId: active.runId,
      artifactSha,
      expectedState: 'running',
      expectedCheckpoint: formatNonNegativeBigInt(checkpoint),
      expectedProcessed: formatNonNegativeBigInt(processed),
      newState: 'running',
      newCheckpoint: checkpointDecimal,
      newProcessed: processedDecimal,
      event: 'batch',
    });
    return Object.freeze({
      done: false as const,
      active: Object.freeze({
        runId: active.runId,
        actor: active.actor,
        checkpoint: batch.lastId,
        processed: newProcessed,
      }),
    });
  });
}

async function pauseForBudget(
  ctx: SessionContext,
  key: string,
  artifactSha: string,
  active: ActiveExecutionContext,
  batchesApplied: number,
): Promise<BatchedRunReceipt> {
  return ctx.runTransaction(async (tx) => {
    const current = await readExecutionByKey(tx, key);
    if (current === undefined) {
      throw new BatchedOperationError('execution row missing on pause');
    }
    assertMatchingArtifact(current, artifactSha);
    if (current.runId !== active.runId) {
      throw new BatchedOperationError('execution run_id mismatch on pause');
    }
    if (current.state !== 'running') {
      throw new BatchedOperationError(
        'execution must be running to pause; refused',
      );
    }
    const checkpoint = formatNonNegativeBigInt(active.checkpoint);
    const processed = formatNonNegativeBigInt(active.processed);
    await updateExecutionCheckpoint(tx, {
      operationKey: key,
      runId: active.runId,
      artifactSha,
      expectedState: 'running',
      expectedCheckpoint: checkpoint,
      expectedProcessed: processed,
      newState: 'paused',
      newCheckpoint: checkpoint,
      newProcessed: processed,
      event: 'paused',
    });
    return Object.freeze({
      outcome: 'paused' as const,
      operationKey: key,
      targetId: ctx.marker.targetId,
      runId: active.runId,
      artifactSha,
      actor: active.actor,
      checkpoint,
      processed,
      batchesApplied,
    });
  });
}

async function runBatchedMutation(
  operation: RegisteredBatchedOperation,
  artifactSha: string,
  actor: string,
  ctx: SessionContext,
  bounds: Readonly<{ batchSize: number; maxBatches: number }>,
  resume: boolean,
): Promise<BatchedRunReceipt> {
  const key = operationKey(operation.manifest);
  const targetId = ctx.marker.targetId;

  const init = await initializeBatchedRun(ctx, key, artifactSha, actor, resume);
  if (init.kind === 'noop') {
    return Object.freeze({
      outcome: 'noop',
      operationKey: key,
      targetId,
      artifactSha,
    });
  }

  let active = init.active;
  let batchesApplied = 0;

  for (let index = 0; index < bounds.maxBatches; index += 1) {
    const result = await runSingleBatch(
      operation,
      ctx,
      key,
      artifactSha,
      active,
      bounds.batchSize,
    );
    batchesApplied += 1;
    if (result.done) {
      return result.receipt;
    }
    active = result.active;
  }

  return pauseForBudget(ctx, key, artifactSha, active, batchesApplied);
}

export async function executeBatchedPlan(
  operation: RegisteredBatchedOperation,
  targetId: string,
  client: SessionClient,
  target: Parameters<typeof withReadOnlySession>[0],
): Promise<BatchedPlanReceipt> {
  assertRunnableBatchedManifest(operation.manifest);
  const key = operationKey(operation.manifest);

  return withReadOnlySession(target, { targetId }, client, async (ctx) => {
    const plan = await operation.plan(operationQuery(ctx));
    const eligible = parseAtomicCount(plan.eligibleRows, 'eligibleRows');
    return Object.freeze({
      operationKey: key,
      targetId,
      eligibleRows: formatNonNegativeBigInt(eligible),
      estimateOnly: true as const,
      manifest: operation.manifest,
    });
  });
}

export async function executeBatchedStatus(
  operationKeyValue: string,
  targetId: string,
  client: SessionClient,
  target: Parameters<typeof withReadOnlySession>[0],
): Promise<BatchedStatusReceipt> {
  return withReadOnlySession(target, { targetId }, client, async (ctx) => {
    const execution = await readExecutionByKey(ctx, operationKeyValue);
    return Object.freeze({
      operationKey: operationKeyValue,
      targetId,
      enrolled: true as const,
      execution: execution ?? null,
    });
  });
}

export async function executeBatchedRun(
  operation: RegisteredBatchedOperation,
  request: BatchedRunRequest,
  client: SessionClient,
  target: Parameters<typeof withMutationSession>[0],
  deps: Readonly<{
    gitProvenance?: GitProvenanceReader;
  }> = {},
): Promise<BatchedRunReceipt> {
  assertRunnableBatchedManifest(operation.manifest);
  assertActorSyntax(request.actor);
  const bounds = resolveBatchedDispatchBounds(
    request.batchSize,
    request.maxBatches,
  );

  const reader = deps.gitProvenance ?? readGitProvenance;
  const artifactSha = await assertCleanGitProvenance(reader);
  await recheckGitProvenance(artifactSha, reader);

  return withMutationSession(
    target,
    { targetId: request.targetId, confirmTarget: request.confirmTarget },
    client,
    async (ctx) =>
      runBatchedMutation(
        operation,
        artifactSha,
        request.actor,
        ctx,
        bounds,
        request.resume,
      ),
  );
}

export function redactBatchedError(error: unknown): string {
  if (error instanceof BatchedOperationError) {
    if (error.message.includes('git')) {
      return 'git provenance check failed';
    }
    if (error.message.includes('verify')) {
      return 'operation verification failed';
    }
    if (error.message.includes('lastId')) {
      return 'batch cursor progression refused';
    }
    if (error.message.includes('affectedRows')) {
      return 'batch row count refused';
    }
    if (error.message.includes('artifact SHA')) {
      return 'operation artifact SHA mismatch';
    }
    if (
      error.message.includes('explicit resume') ||
      error.message.includes('already active')
    ) {
      return 'batched operation resume required';
    }
    if (error.message.includes('high-risk')) {
      return 'high-risk operation execution refused';
    }
    return 'batched operation refused';
  }
  const session = redactSessionError(error);
  if (session !== 'operation session failed') {
    return session;
  }
  if (error instanceof SessionError) {
    return redactSessionError(error);
  }
  return 'batched operation failed';
}
