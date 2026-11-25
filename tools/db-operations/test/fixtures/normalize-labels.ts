import { validateManifest } from '../../src/contract.js';
import {
  BatchedOperationError,
  freezeRegisteredBatchedOperation,
  type OperationQuery,
  type RegisteredBatchedOperation,
} from '../../src/execution/operation.js';
import {
  formatNonNegativeBigInt,
  parseNonNegativeBigInt,
} from '../../src/ledger/repository.js';

export const NORMALIZE_LABELS_TABLE = 'offscreen_ops_fixture.labels';

export const SQL_NORMALIZE_LABELS_PLAN = `
SELECT count(*)::text AS eligible_rows
FROM offscreen_ops_fixture.labels
WHERE normalized IS DISTINCT FROM lower(original)
`.trim();

export const SQL_NORMALIZE_LABELS_SELECT_BATCH = `
SELECT id, revision, original
FROM offscreen_ops_fixture.labels
WHERE id > $1
ORDER BY id
LIMIT $2
FOR UPDATE
`.trim();

export const SQL_NORMALIZE_LABELS_UPDATE_ROW = `
UPDATE offscreen_ops_fixture.labels
SET normalized = lower(original), revision = revision + 1
WHERE id = $1 AND revision = $2
  AND normalized IS DISTINCT FROM lower(original)
`.trim();

export const SQL_NORMALIZE_LABELS_VERIFY = `
SELECT count(*)::text AS violations
FROM offscreen_ops_fixture.labels
WHERE normalized IS DISTINCT FROM lower(original)
`.trim();

export type NormalizeLabelsLockedRow = Readonly<{
  id: bigint;
  revision: bigint;
  original: string;
}>;

function expectedNormalized(original: string): string {
  return original.toLowerCase();
}

function isAlreadyNormalized(
  original: string,
  normalized: string | null | undefined,
): boolean {
  if (normalized === null || normalized === undefined) {
    return false;
  }
  return normalized === expectedNormalized(original);
}

export function normalizeLabelsManifest() {
  return validateManifest({
    id: 'normalize-labels-fixture',
    version: 1,
    title: 'Normalize label casing (test fixture)',
    owner: 'ops',
    kind: 'backfill',
    risk: 'low',
    mode: 'batched',
    recovery: 'reversible',
    recoveryNotes:
      'Test-only fixture; not registered in production CLI. Real target proof uses VER02 disposable resource.',
    affectedTables: [NORMALIZE_LABELS_TABLE],
  });
}

export function createNormalizeLabelsBatchedOperation(): RegisteredBatchedOperation {
  return freezeRegisteredBatchedOperation({
    manifest: normalizeLabelsManifest(),
    async plan(query: OperationQuery) {
      const result = await query(SQL_NORMALIZE_LABELS_PLAN);
      const row = result.rows[0];
      if (row === undefined) {
        throw new BatchedOperationError(
          'normalize-labels plan returned no rows',
        );
      }
      const eligible = row['eligible_rows'];
      if (typeof eligible !== 'string') {
        throw new BatchedOperationError(
          'normalize-labels plan eligible_rows invalid',
        );
      }
      parseNonNegativeBigInt(eligible, 'eligibleRows');
      return { eligibleRows: eligible };
    },
    async nextBatch(query, afterId, limit) {
      const selected = await query(SQL_NORMALIZE_LABELS_SELECT_BATCH, [
        afterId.toString(),
        limit,
      ]);
      const rows = selected.rows as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        return Object.freeze({
          lastId: afterId,
          affectedRows: 0n,
          done: true,
        });
      }

      let affectedRows = 0n;
      let lastId = afterId;

      for (const raw of rows) {
        const locked = parseLockedRow(raw);
        lastId = locked.id;

        const update = await query(SQL_NORMALIZE_LABELS_UPDATE_ROW, [
          locked.id.toString(),
          locked.revision.toString(),
        ]);
        const rowCount = update.rowCount ?? 0;

        if (rowCount === 1) {
          affectedRows += 1n;
          continue;
        }
        if (rowCount === 0) {
          const reconciliation = await assertRowAlreadyCorrect(query, locked);
          if (reconciliation === 'cas_failed') {
            throw new BatchedOperationError(
              'normalize-labels compare-and-set failed without idempotent row; refused',
            );
          }
          affectedRows += 1n;
          continue;
        }
        throw new BatchedOperationError(
          'normalize-labels update returned unexpected rowCount; refused',
        );
      }

      return Object.freeze({
        lastId,
        affectedRows,
        done: rows.length < limit,
      });
    },
    async verify(query: OperationQuery) {
      const result = await query(SQL_NORMALIZE_LABELS_VERIFY);
      const row = result.rows[0];
      if (row === undefined) {
        throw new BatchedOperationError(
          'normalize-labels verify returned no rows',
        );
      }
      const violations = row['violations'];
      if (typeof violations !== 'string') {
        throw new BatchedOperationError(
          'normalize-labels verify violations invalid',
        );
      }
      const count = parseNonNegativeBigInt(violations, 'violations');
      return count === 0n;
    },
  });
}

function parseLockedRow(
  raw: Record<string, unknown>,
): NormalizeLabelsLockedRow {
  const idValue = raw['id'];
  const revisionValue = raw['revision'];
  const originalValue = raw['original'];
  if (typeof originalValue !== 'string') {
    throw new BatchedOperationError('locked row missing original text');
  }
  const id =
    typeof idValue === 'bigint'
      ? idValue
      : parseNonNegativeBigInt(String(idValue), 'id');
  const revision =
    typeof revisionValue === 'bigint'
      ? revisionValue
      : parseNonNegativeBigInt(String(revisionValue), 'revision');
  return Object.freeze({ id, revision, original: originalValue });
}

export const SQL_NORMALIZE_LABELS_READ_LOCKED = `
SELECT revision, normalized
FROM offscreen_ops_fixture.labels
WHERE id = $1
`.trim();

async function assertRowAlreadyCorrect(
  query: OperationQuery,
  locked: NormalizeLabelsLockedRow,
): Promise<'already_correct' | 'cas_failed'> {
  const peek = await query(SQL_NORMALIZE_LABELS_READ_LOCKED, [
    locked.id.toString(),
  ]);
  const row = peek.rows[0];
  if (row === undefined) {
    throw new BatchedOperationError(
      'normalize-labels locked row disappeared before CAS reconciliation; refused',
    );
  }
  const revisionValue = row['revision'];
  const revision =
    typeof revisionValue === 'bigint'
      ? revisionValue
      : parseNonNegativeBigInt(String(revisionValue), 'revision');
  if (revision !== locked.revision) {
    return 'cas_failed';
  }
  const normalized = row['normalized'];
  if (
    normalized !== null &&
    normalized !== undefined &&
    typeof normalized !== 'string'
  ) {
    throw new BatchedOperationError(
      'normalize-labels locked row normalized invalid',
    );
  }
  return isAlreadyNormalized(
    locked.original,
    normalized === null || normalized === undefined ? null : normalized,
  )
    ? 'already_correct'
    : 'cas_failed';
}

export function formatLabelCount(count: bigint): string {
  return formatNonNegativeBigInt(count);
}
