import { AppliedMigrationPrefixError, MigrationJournalError } from './journal';
import { MigrationLockBusyError } from './runner';

export const GENERIC_MIGRATION_FAILURE_MESSAGE =
  'Migration failed. Check database connectivity, schema and migration lock.';

const JOURNAL_FAILURE_PREFIX = 'Migration journal invalid';
const APPLIED_FAILURE_PREFIX = 'Applied migration prefix invalid at index';
const LOCK_BUSY_MESSAGE = 'Migration failed: another migration is running.';

const JOURNAL_CATEGORIES = new Set([
  'shape',
  'version',
  'dialect',
  'entries',
  'entry',
  'idx',
  'entry-version',
  'when',
  'tag',
  'duplicate-tag',
  'breakpoints',
  'missing-sql',
  'missing-journal',
  'malformed-journal',
  'read-failed',
  'loaded-count',
  'folderMillis',
  'hash-format',
  'sql',
  'bps',
]);

const APPLIED_CATEGORIES = new Set(['created_at', 'id', 'hash', 'length']);

function safeNonnegativeIndex(value: number | null): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

export function formatMigrationFailure(error: unknown): string {
  if (error instanceof MigrationLockBusyError) {
    return LOCK_BUSY_MESSAGE;
  }

  if (error instanceof MigrationJournalError) {
    if (!JOURNAL_CATEGORIES.has(error.category)) {
      return GENERIC_MIGRATION_FAILURE_MESSAGE;
    }
    const index = safeNonnegativeIndex(error.index);
    if (index === undefined) {
      return GENERIC_MIGRATION_FAILURE_MESSAGE;
    }
    if (index === null) {
      return `${JOURNAL_FAILURE_PREFIX}: ${error.category}`;
    }
    return `${JOURNAL_FAILURE_PREFIX} at entry ${index}: ${error.category}`;
  }

  if (error instanceof AppliedMigrationPrefixError) {
    if (!APPLIED_CATEGORIES.has(error.category)) {
      return GENERIC_MIGRATION_FAILURE_MESSAGE;
    }
    const index = safeNonnegativeIndex(error.index);
    if (index === undefined || index === null) {
      return GENERIC_MIGRATION_FAILURE_MESSAGE;
    }
    return `${APPLIED_FAILURE_PREFIX} ${index}: ${error.category}`;
  }

  return GENERIC_MIGRATION_FAILURE_MESSAGE;
}
