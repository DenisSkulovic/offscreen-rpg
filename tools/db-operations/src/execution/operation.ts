import {
  type OperationManifest,
  operationKey,
  validateManifest,
} from '../contract.js';
import {
  parseNonNegativeBigInt,
  formatNonNegativeBigInt,
} from '../ledger/repository.js';

export const MAX_ATOMIC_AFFECTED_ROWS = 1000n;

export const ACTOR_PATTERN = /^[a-zA-Z0-9_.@-]{1,80}$/;

export type OperationQueryResult = Readonly<{
  rows: Array<Record<string, unknown>>;
  rowCount: number | null;
}>;

export type OperationQuery = (
  sql: string,
  values?: readonly unknown[],
) => Promise<OperationQueryResult>;

export type AtomicPlanResult = Readonly<{
  eligibleRows: string;
}>;

export type AtomicExecuteResult = Readonly<{
  affectedRows: string;
}>;

export type RegisteredAtomicOperation = Readonly<{
  manifest: OperationManifest;
  plan(query: OperationQuery): Promise<AtomicPlanResult>;
  execute(query: OperationQuery): Promise<AtomicExecuteResult>;
  verify(query: OperationQuery): Promise<boolean>;
}>;

export class AtomicOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AtomicOperationError';
  }
}

export function assertActorSyntax(actor: string): void {
  if (!ACTOR_PATTERN.test(actor)) {
    throw new AtomicOperationError('actor must match allowed token pattern');
  }
}

export function parseAtomicCount(value: string, field: string): bigint {
  const parsed = parseNonNegativeBigInt(value, field);
  if (parsed > MAX_ATOMIC_AFFECTED_ROWS) {
    throw new AtomicOperationError(
      `${field} exceeds maximum of ${formatNonNegativeBigInt(MAX_ATOMIC_AFFECTED_ROWS)}`,
    );
  }
  return parsed;
}

export function assertAffectedWithinPlan(
  planned: bigint,
  affected: bigint,
): void {
  if (affected > planned) {
    throw new AtomicOperationError(
      'affectedRows exceeds planned eligibleRows; refused',
    );
  }
}

export function assertRunnableAtomicManifest(
  manifest: OperationManifest,
): void {
  if (manifest.mode !== 'atomic') {
    throw new AtomicOperationError('operation mode must be atomic');
  }
  if (manifest.risk === 'high') {
    throw new AtomicOperationError('high-risk atomic execution refused');
  }
  if (manifest.risk !== 'low' && manifest.risk !== 'medium') {
    throw new AtomicOperationError('operation risk must be low or medium');
  }
}

export function manifestOperationKey(manifest: OperationManifest): string {
  return operationKey(manifest);
}

export function freezeRegisteredOperation(
  entry: RegisteredAtomicOperation,
): RegisteredAtomicOperation {
  const manifest = Object.freeze({
    ...entry.manifest,
    affectedTables: Object.freeze([...entry.manifest.affectedTables]),
  });
  return Object.freeze({
    manifest,
    plan: entry.plan,
    execute: entry.execute,
    verify: entry.verify,
  });
}

export function compileRegisteredOperations(
  manifests: readonly unknown[],
  handlers: Readonly<{
    plan: RegisteredAtomicOperation['plan'];
    execute: RegisteredAtomicOperation['execute'];
    verify: RegisteredAtomicOperation['verify'];
  }>,
): readonly RegisteredAtomicOperation[] {
  const validated = manifests.map((entry) => validateManifest(entry));
  const seen = new Set<string>();
  const operations: RegisteredAtomicOperation[] = [];
  for (const manifest of validated) {
    const key = operationKey(manifest);
    if (seen.has(key)) {
      throw new AtomicOperationError(`duplicate operation key: ${key}`);
    }
    seen.add(key);
    operations.push(
      freezeRegisteredOperation({
        manifest,
        plan: handlers.plan,
        execute: handlers.execute,
        verify: handlers.verify,
      }),
    );
  }
  return Object.freeze(operations);
}
