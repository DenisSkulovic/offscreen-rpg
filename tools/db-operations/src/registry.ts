import {
  type OperationManifest,
  operationKey,
  validateManifest,
} from './contract.js';

export class OperationRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OperationRegistryError';
  }
}

/** Explicit compile-time registry entries (no filesystem discovery). */
const REGISTRY_SOURCE: readonly OperationManifest[] = [];

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

/** Frozen manifests registered for lookup. */
export const manifests: readonly OperationManifest[] = Object.freeze([
  ...REGISTRY_SOURCE,
]);

export function lookup(key: string): OperationManifest | undefined {
  return manifests.find((entry) => operationKey(entry) === key);
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
