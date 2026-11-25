import {
  type OperationManifest,
  operationKey,
  validateManifest,
} from './contract.js';
import type {
  RegisteredAtomicOperation,
  RegisteredBatchedOperation,
} from './execution/operation.js';

export class OperationRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationRegistryError';
  }
}

/** Explicit compile-time registry entries (no filesystem discovery). */
const REGISTRY_SOURCE: readonly OperationManifest[] = [];

/** Explicit compile-time atomic handlers (no filesystem discovery). */
const OPERATION_SOURCE: readonly RegisteredAtomicOperation[] = [];

/** Explicit compile-time batched handlers (no filesystem discovery). */
const BATCHED_OPERATION_SOURCE: readonly RegisteredBatchedOperation[] = [];

function assertUniqueKeys(manifests: readonly OperationManifest[]): void {
  const seen = new Set<string>();
  for (const manifest of manifests) {
    const key = operationKey(manifest);
    if (seen.has(key)) {
      throw new OperationRegistryError(`duplicate operation key: ${key}`);
    }
    seen.add(key);
  }
}

assertUniqueKeys(REGISTRY_SOURCE);

function assertUniqueOperationKeys(
  registeredManifests: readonly OperationManifest[],
  registeredOperations: readonly RegisteredAtomicOperation[],
): void {
  const manifestKeys = new Set(
    registeredManifests.map((entry) => operationKey(entry)),
  );
  const seen = new Set<string>();
  for (const operation of registeredOperations) {
    const key = operationKey(operation.manifest);
    if (seen.has(key)) {
      throw new OperationRegistryError(`duplicate operation key: ${key}`);
    }
    seen.add(key);
    if (!manifestKeys.has(key)) {
      throw new OperationRegistryError(
        `operation missing manifest for key: ${key}`,
      );
    }
  }
}

assertUniqueOperationKeys(REGISTRY_SOURCE, OPERATION_SOURCE);

function assertUniqueBatchedOperationKeys(
  registeredManifests: readonly OperationManifest[],
  registeredOperations: readonly RegisteredBatchedOperation[],
): void {
  const manifestKeys = new Set(
    registeredManifests.map((entry) => operationKey(entry)),
  );
  const seen = new Set<string>();
  for (const operation of registeredOperations) {
    const key = operationKey(operation.manifest);
    if (seen.has(key)) {
      throw new OperationRegistryError(`duplicate operation key: ${key}`);
    }
    seen.add(key);
    if (!manifestKeys.has(key)) {
      throw new OperationRegistryError(
        `operation missing manifest for key: ${key}`,
      );
    }
    const atomicCollision = OPERATION_SOURCE.find(
      (entry) => operationKey(entry.manifest) === key,
    );
    if (atomicCollision !== undefined) {
      throw new OperationRegistryError(
        `batched operation key collides with atomic handler: ${key}`,
      );
    }
  }
}

assertUniqueBatchedOperationKeys(REGISTRY_SOURCE, BATCHED_OPERATION_SOURCE);

/** Frozen manifests registered for lookup. */
export const manifests: readonly OperationManifest[] = Object.freeze([
  ...REGISTRY_SOURCE,
]);

/** Frozen atomic operations registered for execution. */
export const operations: readonly RegisteredAtomicOperation[] = Object.freeze([
  ...OPERATION_SOURCE,
]);

/** Frozen batched operations registered for execution. */
export const batchedOperations: readonly RegisteredBatchedOperation[] =
  Object.freeze([...BATCHED_OPERATION_SOURCE]);

export function lookup(key: string): OperationManifest | undefined {
  return manifests.find((entry) => operationKey(entry) === key);
}

export function lookupOperation(
  key: string,
): RegisteredAtomicOperation | undefined {
  return operations.find((entry) => operationKey(entry.manifest) === key);
}

export function lookupBatchedOperation(
  key: string,
): RegisteredBatchedOperation | undefined {
  return batchedOperations.find(
    (entry) => operationKey(entry.manifest) === key,
  );
}

/**
 * Validates manifest payloads and ensures registry keys are unique.
 * Used when adding entries to the explicit registry; no dynamic module paths.
 */
export function compileManifests(
  entries: readonly unknown[],
): readonly OperationManifest[] {
  const validated = entries.map((entry) => validateManifest(entry));
  assertUniqueKeys(validated);
  return Object.freeze(
    validated.map((entry) =>
      Object.freeze({
        ...entry,
        affectedTables: Object.freeze([...entry.affectedTables]),
      }),
    ),
  );
}
