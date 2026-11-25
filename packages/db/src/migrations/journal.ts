import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';

export {
  AppliedMigrationPrefixError,
  assertAppliedPrefix,
  parseCreatedAt,
  parseRowHash,
  parseRowId,
  type AppliedMigrationLedgerRow,
} from './applied-ledger';

const TAG_PATTERN = /^[0-9]{4,}_[A-Za-z0-9_-]+$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;

export class MigrationJournalError extends Error {
  constructor(
    readonly category: string,
    readonly index: number | null,
  ) {
    super(
      index === null
        ? `Migration journal invalid: ${category}`
        : `Migration journal invalid at entry ${index}: ${category}`,
    );
    this.name = 'MigrationJournalError';
  }
}

type ValidatedJournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

function throwJournal(category: string, index: number | null = null): never {
  throw new MigrationJournalError(category, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePositiveSafeInteger(
  value: unknown,
  category: string,
  index: number | null,
): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throwJournal(category, index);
  }
  return value;
}

function parseJournalEntries(
  raw: unknown,
  migrationsFolder: string,
): ValidatedJournalEntry[] {
  if (!isRecord(raw)) {
    throwJournal('shape');
  }
  if (raw.version !== '7') {
    throwJournal('version');
  }
  if (raw.dialect !== 'postgresql') {
    throwJournal('dialect');
  }
  if (!Array.isArray(raw.entries)) {
    throwJournal('entries');
  }
  const entries = raw.entries;
  if (entries.length === 0) {
    throwJournal('entries');
  }

  const validated: ValidatedJournalEntry[] = [];
  const seenTags = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!isRecord(entry)) {
      throwJournal('entry', i);
    }
    if (
      typeof entry.idx !== 'number' ||
      !Number.isSafeInteger(entry.idx) ||
      entry.idx < 0
    ) {
      throwJournal('idx', i);
    }
    const idx = entry.idx;
    if (idx !== i) {
      throwJournal('idx', i);
    }
    if (entry.version !== '7') {
      throwJournal('entry-version', i);
    }
    const when = parsePositiveSafeInteger(entry.when, 'when', i);
    const previous = i > 0 ? validated[i - 1] : undefined;
    if (previous !== undefined && when <= previous.when) {
      throwJournal('when', i);
    }
    if (typeof entry.tag !== 'string' || !TAG_PATTERN.test(entry.tag)) {
      throwJournal('tag', i);
    }
    if (seenTags.has(entry.tag)) {
      throwJournal('duplicate-tag', i);
    }
    seenTags.add(entry.tag);
    if (typeof entry.breakpoints !== 'boolean') {
      throwJournal('breakpoints', i);
    }
    const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
    if (!existsSync(sqlPath)) {
      throwJournal('missing-sql', i);
    }
    validated.push({
      idx,
      when,
      tag: entry.tag,
      breakpoints: entry.breakpoints,
    });
  }

  return validated;
}

/**
 * Validates meta/_journal.json and cross-checks readMigrationFiles output:
 * folderMillis must equal journal when; hashes are content-derived from SQL on
 * disk, not from the ledger. Does not verify live schema or applied rows—use
 * assertAppliedPrefix after reading drizzle.__drizzle_migrations.
 */
export function validateMigrationJournal(
  migrationsFolder: string,
): MigrationMeta[] {
  const journalPath = join(migrationsFolder, 'meta/_journal.json');
  if (!existsSync(journalPath)) {
    throwJournal('missing-journal');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(journalPath, 'utf8'));
  } catch {
    throwJournal('malformed-journal');
  }

  const entries = parseJournalEntries(parsed, migrationsFolder);

  let loaded: MigrationMeta[];
  try {
    loaded = readMigrationFiles({ migrationsFolder });
  } catch {
    throwJournal('read-failed');
  }

  if (loaded.length !== entries.length) {
    throwJournal('loaded-count');
  }

  for (let i = 0; i < loaded.length; i++) {
    const migration = loaded[i];
    const entry = entries[i];
    if (migration === undefined || entry === undefined) {
      throwJournal('loaded-count', i);
    }
    if (migration.folderMillis !== entry.when) {
      throwJournal('folderMillis', i);
    }
    if (!HASH_PATTERN.test(migration.hash)) {
      throwJournal('hash-format', i);
    }
    if (!Array.isArray(migration.sql)) {
      throwJournal('sql', i);
    }
    if (migration.bps !== entry.breakpoints) {
      throwJournal('bps', i);
    }
  }

  return loaded;
}
