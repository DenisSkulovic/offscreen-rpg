import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import {
  AppliedMigrationPrefixError,
  assertAppliedPrefix,
  MigrationJournalError,
  validateMigrationJournal,
} from '../src/migrations/journal';

function must<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`missing index ${index}`);
  }
  return item;
}

const fixtureSql = `CREATE TABLE db_component_fixture (
  id integer PRIMARY KEY,
  amount integer NOT NULL CHECK (amount >= 0)
);
`;

function baseJournal(
  entries: Array<{
    idx: number;
    when: number;
    tag: string;
    breakpoints?: boolean;
  }>,
) {
  return {
    version: '7',
    dialect: 'postgresql',
    entries: entries.map((entry) => ({
      idx: entry.idx,
      version: '7',
      when: entry.when,
      tag: entry.tag,
      breakpoints: entry.breakpoints ?? true,
    })),
  };
}

async function writeMigrationFolder(
  dir: string,
  journal: ReturnType<typeof baseJournal>,
  sqlByTag: Record<string, string>,
) {
  await mkdir(join(dir, 'meta'), { recursive: true });
  await writeFile(
    join(dir, 'meta/_journal.json'),
    JSON.stringify(journal, null, 2),
  );
  for (const [tag, sql] of Object.entries(sqlByTag)) {
    await writeFile(join(dir, `${tag}.sql`), sql);
  }
}

async function withTempFolder(
  journal: ReturnType<typeof baseJournal>,
  sqlByTag: Record<string, string>,
  run: (folder: string, loaded: ReturnType<typeof readMigrationFiles>) => void,
) {
  const dir = await mkdtemp(join(tmpdir(), 'db08-journal-'));
  try {
    await writeMigrationFolder(dir, journal, sqlByTag);
    const loaded = validateMigrationJournal(dir);
    run(dir, loaded);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('readMigrationFiles hash and folderMillis match validated journal entries', async () => {
  await withTempFolder(
    baseJournal([{ idx: 0, when: 1, tag: '0000_fixture' }]),
    { '0000_fixture': fixtureSql },
    (folder, loaded) => {
      const direct = readMigrationFiles({ migrationsFolder: folder });
      assert.equal(loaded.length, 1);
      assert.equal(must(loaded, 0).hash, must(direct, 0).hash);
      assert.equal(must(loaded, 0).folderMillis, 1);
      assert.equal(must(loaded, 0).folderMillis, must(direct, 0).folderMillis);
      assert.ok(Array.isArray(must(loaded, 0).sql));
    },
  );
});

test('applied prefix accepts empty, partial, and full sequences', async () => {
  const journal = baseJournal([
    { idx: 0, when: 10, tag: '0000_alpha' },
    { idx: 1, when: 20, tag: '0001_beta' },
    { idx: 2, when: 30, tag: '0002_gamma' },
  ]);
  const sql = {
    '0000_alpha': 'CREATE TABLE a (id int);',
    '0001_beta': 'CREATE TABLE b (id int);',
    '0002_gamma': 'CREATE TABLE c (id int);',
  };
  const dir = await mkdtemp(join(tmpdir(), 'db08-journal-'));
  try {
    await writeMigrationFolder(dir, journal, sql);
    const loaded = validateMigrationJournal(dir);

    assertAppliedPrefix(loaded, []);

    assertAppliedPrefix(loaded, [
      {
        id: 1,
        hash: must(loaded, 0).hash,
        created_at: must(loaded, 0).folderMillis,
      },
    ]);

    assertAppliedPrefix(loaded, [
      {
        id: 1,
        hash: must(loaded, 0).hash,
        created_at: String(must(loaded, 0).folderMillis),
      },
      { id: 2, hash: must(loaded, 1).hash, created_at: must(loaded, 1).folderMillis },
      {
        id: 3,
        hash: must(loaded, 2).hash,
        created_at: `${must(loaded, 2).folderMillis}`,
      },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('serial id gaps are permitted in the applied prefix', async () => {
  await withTempFolder(
    baseJournal([
      { idx: 0, when: 10, tag: '0000_alpha' },
      { idx: 1, when: 20, tag: '0001_beta' },
    ]),
    {
      '0000_alpha': 'CREATE TABLE a (id int);',
      '0001_beta': 'CREATE TABLE b (id int);',
    },
    (_folder, loaded) => {
      assertAppliedPrefix(loaded, [
        { id: 1, hash: must(loaded, 0).hash, created_at: 10 },
        { id: 7, hash: must(loaded, 1).hash, created_at: 20 },
      ]);
    },
  );
});

test('rejects modified hash in applied prefix', async () => {
  await withTempFolder(
    baseJournal([{ idx: 0, when: 1, tag: '0000_fixture' }]),
    { '0000_fixture': fixtureSql },
    (_folder, loaded) => {
      assert.throws(
        () =>
          assertAppliedPrefix(loaded, [
            {
              id: 1,
              hash: '0'.repeat(64),
              created_at: must(loaded, 0).folderMillis,
            },
          ]),
        AppliedMigrationPrefixError,
      );
    },
  );
});

test('rejects missing first and missing middle prefix rows', async () => {
  const journal = baseJournal([
    { idx: 0, when: 10, tag: '0000_alpha' },
    { idx: 1, when: 20, tag: '0001_beta' },
    { idx: 2, when: 30, tag: '0002_gamma' },
  ]);
  const sql = {
    '0000_alpha': 'CREATE TABLE a (id int);',
    '0001_beta': 'CREATE TABLE b (id int);',
    '0002_gamma': 'CREATE TABLE c (id int);',
  };
  const dir = await mkdtemp(join(tmpdir(), 'db08-journal-'));
  try {
    await writeMigrationFolder(dir, journal, sql);
    const loaded = validateMigrationJournal(dir);

    assert.throws(
      () =>
        assertAppliedPrefix(loaded, [
          { id: 1, hash: must(loaded, 1).hash, created_at: must(loaded, 1).folderMillis },
        ]),
      (error: unknown) =>
        error instanceof AppliedMigrationPrefixError &&
        error.category === 'hash' &&
        error.index === 0,
    );

    assert.throws(
      () =>
        assertAppliedPrefix(loaded, [
          { id: 1, hash: must(loaded, 0).hash, created_at: must(loaded, 0).folderMillis },
          { id: 2, hash: must(loaded, 2).hash, created_at: must(loaded, 2).folderMillis },
        ]),
      (error: unknown) =>
        error instanceof AppliedMigrationPrefixError &&
        error.category === 'hash' &&
        error.index === 1,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects newer unknown applied rows beyond journal length', async () => {
  await withTempFolder(
    baseJournal([{ idx: 0, when: 1, tag: '0000_fixture' }]),
    { '0000_fixture': fixtureSql },
    (_folder, loaded) => {
      assert.throws(
        () =>
          assertAppliedPrefix(loaded, [
            { id: 1, hash: must(loaded, 0).hash, created_at: 1 },
            { id: 2, hash: must(loaded, 0).hash, created_at: 1 },
          ]),
        (error: unknown) =>
          error instanceof AppliedMigrationPrefixError &&
          error.category === 'length',
      );
    },
  );
});

test('rejects duplicate non-increasing ids and reversed timestamps', async () => {
  await withTempFolder(
    baseJournal([
      { idx: 0, when: 10, tag: '0000_alpha' },
      { idx: 1, when: 20, tag: '0001_beta' },
    ]),
    {
      '0000_alpha': 'CREATE TABLE a (id int);',
      '0001_beta': 'CREATE TABLE b (id int);',
    },
    (_folder, loaded) => {
      assert.throws(
        () =>
          assertAppliedPrefix(loaded, [
            { id: 1, hash: must(loaded, 0).hash, created_at: 10 },
            { id: 1, hash: must(loaded, 1).hash, created_at: 20 },
          ]),
        AppliedMigrationPrefixError,
      );

      assert.throws(
        () =>
          assertAppliedPrefix(loaded, [
            { id: 1, hash: must(loaded, 0).hash, created_at: 20 },
          ]),
        (error: unknown) =>
          error instanceof AppliedMigrationPrefixError &&
          error.category === 'created_at',
      );
    },
  );
});

test('rejects null or malformed ledger values', async () => {
  await withTempFolder(
    baseJournal([{ idx: 0, when: 1, tag: '0000_fixture' }]),
    { '0000_fixture': fixtureSql },
    (_folder, loaded) => {
      for (const row of [
        { id: null, hash: must(loaded, 0).hash, created_at: 1 },
        { id: 1, hash: null, created_at: 1 },
        { id: 1, hash: must(loaded, 0).hash, created_at: null },
        { id: 0, hash: must(loaded, 0).hash, created_at: 1 },
        { id: 1, hash: must(loaded, 0).hash, created_at: 'abc' },
      ]) {
        assert.throws(
          () => assertAppliedPrefix(loaded, [row]),
          AppliedMigrationPrefixError,
        );
      }
    },
  );
});

test('rejects journal duplicate idx, noncontiguous idx, and unsafe tags', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'db08-journal-'));
  try {
    await writeMigrationFolder(
      dir,
      baseJournal([
        { idx: 0, when: 1, tag: '0000_fixture' },
        { idx: 0, when: 2, tag: '0001_other' },
      ]),
      {
        '0000_fixture': fixtureSql,
        '0001_other': 'CREATE TABLE other (id int);',
      },
    );
    assert.throws(() => validateMigrationJournal(dir), MigrationJournalError);

    await writeMigrationFolder(
      dir,
      baseJournal([
        { idx: 0, when: 1, tag: '0000_fixture' },
        { idx: 2, when: 2, tag: '0001_other' },
      ]),
      {
        '0000_fixture': fixtureSql,
        '0001_other': 'CREATE TABLE other (id int);',
      },
    );
    assert.throws(
      () => validateMigrationJournal(dir),
      (error: unknown) =>
        error instanceof MigrationJournalError && error.category === 'idx',
    );

    await writeMigrationFolder(
      dir,
      baseJournal([{ idx: 0, when: 1, tag: '../escape' }]),
      { '../escape': fixtureSql },
    );
    assert.throws(
      () => validateMigrationJournal(dir),
      (error: unknown) =>
        error instanceof MigrationJournalError && error.category === 'tag',
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('validates the repository migration journal without a database', () => {
  const migrationsFolder = resolve(__dirname, '../../migrations');
  const loaded = validateMigrationJournal(migrationsFolder);
  assert.equal(loaded.length, 25);
  const newest = loaded[loaded.length - 1];
  if (newest === undefined) {
    throw new Error('repository journal was empty');
  }
  assert.equal(newest.folderMillis, 1794824800000);
  assert.match(newest.hash, /^[0-9a-f]{64}$/);
});
