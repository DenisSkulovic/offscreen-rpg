import type { MigrationMeta } from 'drizzle-orm/migrator';

export class AppliedMigrationPrefixError extends Error {
  constructor(
    readonly category: string,
    readonly index: number,
  ) {
    super(`Applied migration prefix invalid at index ${index}: ${category}`);
    this.name = 'AppliedMigrationPrefixError';
  }
}

/** Loose row shape from drizzle.__drizzle_migrations; validated at compare time. */
export type AppliedMigrationLedgerRow = {
  id: unknown;
  hash: unknown;
  created_at: unknown;
};

function throwApplied(category: string, index: number): never {
  throw new AppliedMigrationPrefixError(category, index);
}

export function parseCreatedAt(
  value: unknown,
  index: number,
  expected: number,
): number {
  if (value === null || value === undefined) {
    throwApplied('created_at', index);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throwApplied('created_at', index);
    }
    if (value !== expected) {
      throwApplied('created_at', index);
    }
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throwApplied('created_at', index);
    }
    if (parsed !== expected) {
      throwApplied('created_at', index);
    }
    return parsed;
  }
  throwApplied('created_at', index);
}

export function parseRowId(value: unknown, index: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throwApplied('id', index);
  }
  return value;
}

export function parseRowHash(value: unknown, index: number): string {
  if (typeof value !== 'string' || value.length === 0) {
    throwApplied('hash', index);
  }
  return value;
}

/**
 * Ensures the database applied-migration ledger is a strict prefix of the
 * on-disk journal loaded via readMigrationFiles. Ledger hashes must match the
 * journal-derived SHA-256 for each index; created_at must equal folderMillis
 * (journal entry.when), not server clock time. This check does not introspect
 * schema or SQL outcomes—only ledger row shape and ordering against the journal.
 */
export function assertAppliedPrefix(
  loaded: MigrationMeta[],
  rows: readonly AppliedMigrationLedgerRow[],
): void {
  if (rows.length > loaded.length) {
    throwApplied('length', loaded.length);
  }

  let previousId: number | undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const expected = loaded[i];
    if (row === undefined || expected === undefined) {
      throwApplied('length', i);
    }
    const id = parseRowId(row.id, i);
    if (previousId !== undefined && id <= previousId) {
      throwApplied('id', i);
    }
    previousId = id;

    const hash = parseRowHash(row.hash, i);
    if (hash !== expected.hash) {
      throwApplied('hash', i);
    }

    parseCreatedAt(row.created_at, i, expected.folderMillis);
  }
}
