import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

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
  assertAffectedWithinPlan,
  assertActorSyntax,
  assertRunnableAtomicManifest,
  AtomicOperationError,
  parseAtomicCount,
  type RegisteredAtomicOperation,
} from './operation.js';

const execFileAsync = promisify(execFile);

const ARTIFACT_SHA_PATTERN = /^[0-9a-f]{40}$/;

export type GitProvenance = Readonly<{
  sha: string;
  clean: boolean;
}>;

export type GitProvenanceReader = () => Promise<GitProvenance>;

export type AtomicPlanReceipt = Readonly<{
  operationKey: string;
  targetId: string;
  eligibleRows: string;
  estimateOnly: true;
  manifest: RegisteredAtomicOperation['manifest'];
}>;

export type AtomicStatusReceipt = Readonly<{
  operationKey: string;
  targetId: string;
  enrolled: true;
  execution: ExecutionRecord | null;
}>;

export type AtomicRunReceipt =
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
      affectedRows: string;
    }>;

async function defaultGitProvenanceReader(): Promise<GitProvenance> {
  const statusResult = await execFileAsync('git', [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  const statusStdout = `${statusResult.stdout}`.trim();
  const clean = statusStdout.length === 0;

  const headResult = await execFileAsync('git', ['rev-parse', 'HEAD']);
  const headStdout = `${headResult.stdout}`.trim();
  const sha = headStdout.trim();
  if (!ARTIFACT_SHA_PATTERN.test(sha)) {
    throw new AtomicOperationError('git HEAD must be a 40-character hex SHA');
  }

  return Object.freeze({ sha, clean });
}

export async function readGitProvenance(
  reader: GitProvenanceReader = defaultGitProvenanceReader,
): Promise<GitProvenance> {
  return reader();
}

export async function assertCleanGitProvenance(
  reader: GitProvenanceReader = defaultGitProvenanceReader,
): Promise<string> {
  const provenance = await readGitProvenance(reader);
  if (!provenance.clean) {
    throw new AtomicOperationError(
      'git working tree must be clean before atomic execution',
    );
  }
  return provenance.sha;
}

export async function recheckGitProvenance(
  expectedSha: string,
  reader: GitProvenanceReader = defaultGitProvenanceReader,
): Promise<void> {
  const provenance = await readGitProvenance(reader);
  if (!provenance.clean) {
    throw new AtomicOperationError(
      'git working tree must remain clean before dispatch',
    );
  }
  if (provenance.sha !== expectedSha) {
    throw new AtomicOperationError(
      'git HEAD changed after provenance check; refused',
    );
  }
}

function operationQuery(queryable: LedgerQueryable) {
  return (sql: string, values?: readonly unknown[]) =>
    queryable.query(sql, values);
}

export async function executeAtomicPlan(
  operation: RegisteredAtomicOperation,
  targetId: string,
  client: SessionClient,
  target: Parameters<typeof withReadOnlySession>[0],
): Promise<AtomicPlanReceipt> {
  assertRunnableAtomicManifest(operation.manifest);
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

export async function executeAtomicStatus(
  operationKeyValue: string,
  targetId: string,
  client: SessionClient,
  target: Parameters<typeof withReadOnlySession>[0],
): Promise<AtomicStatusReceipt> {
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

function refuseActiveExecution(existing: ExecutionRecord): void {
  if (existing.state === 'running' || existing.state === 'paused') {
    throw new AtomicOperationError(
      'execution already active for operation key; refused',
    );
  }
}

function refuseSucceededShaMismatch(
  existing: ExecutionRecord,
  sha: string,
): void {
  if (existing.state === 'succeeded' && existing.artifactSha !== sha) {
    throw new AtomicOperationError(
      'operation already succeeded under different artifact SHA; refused',
    );
  }
}

async function runAtomicMutation(
  operation: RegisteredAtomicOperation,
  artifactSha: string,
  actor: string,
  ctx: SessionContext,
): Promise<AtomicRunReceipt> {
  const key = operationKey(operation.manifest);
  const targetId = ctx.marker.targetId;

  return ctx.runTransaction(async (tx) => {
    const existing = await readExecutionByKey(tx, key);
    if (existing !== undefined) {
      if (
        existing.state === 'succeeded' &&
        existing.artifactSha === artifactSha
      ) {
        return Object.freeze({
          outcome: 'noop' as const,
          operationKey: key,
          targetId,
          artifactSha,
        });
      }
      refuseSucceededShaMismatch(existing, artifactSha);
      refuseActiveExecution(existing);
    }

    const runId = randomUUID();
    await insertExecutionClaim(tx, {
      operationKey: key,
      artifactSha,
      runId,
      actor,
      checkpoint: 0n,
      processed: 0n,
    });

    const query = operationQuery(tx);
    const planResult = await operation.plan(query);
    const planned = parseAtomicCount(planResult.eligibleRows, 'eligibleRows');

    const executeResult = await operation.execute(query);
    const affected = parseAtomicCount(
      executeResult.affectedRows,
      'affectedRows',
    );
    assertAffectedWithinPlan(planned, affected);

    const verified = await operation.verify(query);
    if (verified !== true) {
      throw new AtomicOperationError(
        'operation verify returned false; refused',
      );
    }

    const affectedDecimal = parseNonNegativeBigInt(
      executeResult.affectedRows,
      'affectedRows',
    ).toString();

    await updateExecutionCheckpoint(tx, {
      operationKey: key,
      runId,
      artifactSha,
      expectedState: 'running',
      expectedCheckpoint: '0',
      expectedProcessed: '0',
      newState: 'succeeded',
      newCheckpoint: '0',
      newProcessed: affectedDecimal,
      event: 'succeeded',
    });

    return Object.freeze({
      outcome: 'succeeded' as const,
      operationKey: key,
      targetId,
      runId,
      artifactSha,
      actor,
      affectedRows: affectedDecimal,
    });
  });
}

export type AtomicRunRequest = Readonly<{
  targetId: string;
  confirmTarget: string;
  actor: string;
}>;

export async function executeAtomicRun(
  operation: RegisteredAtomicOperation,
  request: AtomicRunRequest,
  client: SessionClient,
  target: Parameters<typeof withMutationSession>[0],
  deps: Readonly<{
    gitProvenance?: GitProvenanceReader;
  }> = {},
): Promise<AtomicRunReceipt> {
  assertRunnableAtomicManifest(operation.manifest);
  assertActorSyntax(request.actor);

  const reader = deps.gitProvenance ?? defaultGitProvenanceReader;
  const artifactSha = await assertCleanGitProvenance(reader);
  await recheckGitProvenance(artifactSha, reader);

  return withMutationSession(
    target,
    { targetId: request.targetId, confirmTarget: request.confirmTarget },
    client,
    async (ctx) =>
      runAtomicMutation(operation, artifactSha, request.actor, ctx),
  );
}

export function redactAtomicError(error: unknown): string {
  if (error instanceof AtomicOperationError) {
    if (error.message.includes('git')) {
      return 'git provenance check failed';
    }
    if (error.message.includes('verify')) {
      return 'operation verification failed';
    }
    if (error.message.includes('exceeds')) {
      return 'operation row count limit exceeded';
    }
    if (error.message.includes('artifact SHA')) {
      return 'operation artifact SHA mismatch';
    }
    if (error.message.includes('already active')) {
      return 'operation execution already active';
    }
    if (error.message.includes('high-risk')) {
      return 'high-risk operation execution refused';
    }
    if (
      error.message.includes('unregistered') ||
      error.message.includes('actor')
    ) {
      return 'atomic operation refused';
    }
    return 'atomic operation refused';
  }
  const session = redactSessionError(error);
  if (session !== 'operation session failed') {
    return session;
  }
  if (error instanceof SessionError) {
    return redactSessionError(error);
  }
  return 'atomic operation failed';
}
