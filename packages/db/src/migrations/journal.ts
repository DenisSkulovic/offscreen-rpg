import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';

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

export class AppliedMigrationPrefixError extends Error {
  constructor(
    readonly category: string,
    readonly index: number,
  ) {
    super(`Applied migration prefix invalid at index ${index}: ${category}`);
    this.name = 'AppliedMigrationPrefixError';
  }
}

export type AppliedMigrationLedgerRow = {
  id: unknown;
  hash: unknown;
  created_at: unknown;
};

type ValidatedJournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

function throwJournal(category: string, index: number | null = null): never {
  throw new MigrationJournalError(category, index);
}

function throwApplied(category: string, index: number): never {
  throw new AppliedMigrationPrefixError(category, index);
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
    if (index === null) {
      throwJournal(category);
    }
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

function parseCreatedAt(
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

function parseRowId(value: unknown, index: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throwApplied('id', index);
  }
  return value;
}

function parseRowHash(value: unknown, index: number): string {
  if (typeof value !== 'string' || value.length === 0) {
    throwApplied('hash', index);
  }
  return value;
}

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
