import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AppliedMigrationPrefixError,
  MigrationJournalError,
} from '../src/migrations/journal';
import {
  formatMigrationFailure,
  GENERIC_MIGRATION_FAILURE_MESSAGE,
} from '../src/migrations/diagnostics';
import { MigrationLockBusyError } from '../src/migrations/runner';

test('formatMigrationFailure maps known journal, applied, and lock errors', () => {
  assert.equal(
    formatMigrationFailure(new MigrationJournalError('missing-journal', null)),
    'Migration journal invalid: missing-journal',
  );
  assert.equal(
    formatMigrationFailure(new MigrationJournalError('tag', 3)),
    'Migration journal invalid at entry 3: tag',
  );
  assert.equal(
    formatMigrationFailure(new AppliedMigrationPrefixError('hash', 0)),
    'Applied migration prefix invalid at index 0: hash',
  );
  assert.equal(
    formatMigrationFailure(new MigrationLockBusyError()),
    'Migration failed: another migration is running.',
  );
});

test('formatMigrationFailure rejects hostile journal category', () => {
  assert.equal(
    formatMigrationFailure(
      new MigrationJournalError('postgres://secret@host/db', 0),
    ),
    GENERIC_MIGRATION_FAILURE_MESSAGE,
  );
});

test('formatMigrationFailure rejects secret-bearing connection errors', () => {
  assert.equal(
    formatMigrationFailure(
      new Error(
        'connect failed postgresql://user:password@127.0.0.1:5432/offscreen_db',
      ),
    ),
    GENERIC_MIGRATION_FAILURE_MESSAGE,
  );
});

test('formatMigrationFailure rejects unknown values', () => {
  assert.equal(formatMigrationFailure(null), GENERIC_MIGRATION_FAILURE_MESSAGE);
  assert.equal(
    formatMigrationFailure('connection reset'),
    GENERIC_MIGRATION_FAILURE_MESSAGE,
  );
  assert.equal(
    formatMigrationFailure(
      new AppliedMigrationPrefixError('length', Number.NaN),
    ),
    GENERIC_MIGRATION_FAILURE_MESSAGE,
  );
});
