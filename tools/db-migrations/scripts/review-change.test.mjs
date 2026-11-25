import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  buildManualChecklist,
  collectLexicalHintCategories,
  defaultRunGit,
  printReviewResult,
  reviewMigrationChange,
  reviewNewMigrationSql,
  runCli,
} from './review-change.mjs';

/**
 * @param {Record<string, string>} blobs sha:path -> content
 * @param {object} config
 * @param {Record<string, string>} [config.refs]
 * @param {boolean} [config.ancestor]
 * @param {string[]} [config.nameStatusLines]
 */
function createFakeRunGit(blobs, config = {}) {
  const refs = {
    HEAD: 'headsha',
    main: 'basesha',
    basesha: 'basesha',
    headsha: 'headsha',
    ...config.refs,
  };
  const ancestor = config.ancestor ?? true;
  const nameStatusLines = config.nameStatusLines ?? [];

  return (/** @type {string[]} */ args) => {
    if (args[0] === 'rev-parse' && args[1] === '--verify') {
      const raw = args[2];
      const ref = raw.replace(/\^\{commit\}$/u, '');
      if (ref.startsWith('-')) {
        return { ok: false, stdout: '', stderr: 'invalid ref', status: 128 };
      }
      const sha = refs[ref] ?? refs[raw];
      if (!sha) {
        return { ok: false, stdout: '', stderr: 'bad ref', status: 128 };
      }
      return { ok: true, stdout: `${sha}\n`, stderr: '', status: 0 };
    }
    if (args[0] === 'merge-base' && args[1] === '--is-ancestor') {
      if (!ancestor) {
        return { ok: false, stdout: '', stderr: '', status: 1 };
      }
      return { ok: true, stdout: '', stderr: '', status: 0 };
    }
    if (args[0] === 'show') {
      const spec = args[1];
      const content = blobs[spec];
      if (content === undefined) {
        return { ok: false, stdout: '', stderr: 'missing', status: 128 };
      }
      return { ok: true, stdout: content, stderr: '', status: 0 };
    }
    if (args[0] === 'diff' && args[1] === '--name-status') {
      const body = nameStatusLines.join('\n');
      return {
        ok: true,
        stdout: body ? `${body}\n` : '',
        stderr: '',
        status: 0,
      };
    }
    return {
      ok: false,
      stdout: '',
      stderr: `unexpected ${args.join(' ')}`,
      status: 1,
    };
  };
}

/** @param {object[]} entries */
function journal(entries) {
  return JSON.stringify({
    version: '7',
    dialect: 'postgresql',
    entries,
  });
}

/** @param {string} sql */
function sqlDigest(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

const entry0 = {
  idx: 0,
  version: '7',
  when: 1,
  tag: '0000_tiny_pandemic',
  breakpoints: true,
};
const entry1 = {
  idx: 1,
  version: '7',
  when: 2,
  tag: '0001_lumpy_menace',
  breakpoints: true,
};
const entry2 = {
  idx: 2,
  version: '7',
  when: 3,
  tag: '0002_fair_magus',
  breakpoints: true,
};

const baseSql0 = 'CREATE TABLE one ();';
const baseSql1 = 'CREATE TABLE two ();';
const baseSql2 = 'CREATE TABLE three ();';

function unchangedFixtures() {
  const j = journal([entry0, entry1]);
  return {
    blobs: {
      'basesha:packages/db/migrations/meta/_journal.json': j,
      'headsha:packages/db/migrations/meta/_journal.json': j,
      'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
      'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
      'headsha:packages/db/migrations/meta/0001_snapshot.json': '{}',
    },
    runGit: createFakeRunGit(
      {
        'basesha:packages/db/migrations/meta/_journal.json': j,
        'headsha:packages/db/migrations/meta/_journal.json': j,
        'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
        'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
        'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
        'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
        'headsha:packages/db/migrations/meta/0001_snapshot.json': '{}',
      },
      { refs: { basesha: 'basesha', headsha: 'headsha' } },
    ),
  };
}

describe('reviewMigrationChange', () => {
  it('accepts unchanged migration history', () => {
    const { runGit } = unchangedFixtures();
    const result = reviewMigrationChange({
      base: 'main',
      head: 'HEAD',
      runGit,
    });
    assert.equal(result.historyOk, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.newMigrations.length, 0);
    assert.equal(result.refusals.length, 0);
  });

  it('accepts a valid appended migration with matching SQL', () => {
    const baseJournal = journal([entry0, entry1]);
    const headJournal = journal([entry0, entry1, entry2]);
    const newSql = baseSql2;
    const runGit = createFakeRunGit(
      {
        'basesha:packages/db/migrations/meta/_journal.json': baseJournal,
        'headsha:packages/db/migrations/meta/_journal.json': headJournal,
        'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
        'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
        'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
        'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
        'headsha:packages/db/migrations/0002_fair_magus.sql': newSql,
        'headsha:packages/db/migrations/meta/0002_snapshot.json': '{}',
      },
      {
        nameStatusLines: ['A\tpackages/db/migrations/0002_fair_magus.sql'],
      },
    );
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit,
    });
    assert.equal(result.historyOk, true);
    assert.equal(result.newMigrations.length, 1);
    assert.equal(result.newMigrations[0].tag, '0002_fair_magus');
    assert.equal(result.newMigrations[0].sqlSha256, sqlDigest(newSql));
    assert.equal(result.newMigrations[0].hintCategories.length, 0);
    assert.match(
      result.newMigrations[0].lexicalRiskNote,
      /not classify.*safe/i,
    );
  });

  it('refuses rewritten historical journal entries', () => {
    const baseJournal = journal([entry0, entry1]);
    const mutated = { ...entry1, when: 99 };
    const headJournal = journal([entry0, mutated]);
    const runGit = createFakeRunGit({
      'basesha:packages/db/migrations/meta/_journal.json': baseJournal,
      'headsha:packages/db/migrations/meta/_journal.json': headJournal,
      'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
      'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
    });
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit,
    });
    assert.equal(result.historyOk, false);
    assert.ok(
      result.refusals.some((r) => r.includes('rewritten journal entry')),
    );
  });

  it('refuses rewritten historical SQL bytes', () => {
    const j = journal([entry0, entry1]);
    const runGit = createFakeRunGit({
      'basesha:packages/db/migrations/meta/_journal.json': j,
      'headsha:packages/db/migrations/meta/_journal.json': j,
      'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
      'headsha:packages/db/migrations/0001_lumpy_menace.sql': `${baseSql1}\n-- touched`,
    });
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit,
    });
    assert.equal(result.historyOk, false);
    assert.ok(
      result.refusals.some((r) => r.includes('rewritten prior migration SQL')),
    );
  });

  it('refuses missing SQL for journaled append and orphan new SQL files', () => {
    const baseJournal = journal([entry0]);
    const headJournal = journal([entry0, entry1]);
    const runGit = createFakeRunGit(
      {
        'basesha:packages/db/migrations/meta/_journal.json': baseJournal,
        'headsha:packages/db/migrations/meta/_journal.json': headJournal,
        'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
        'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      },
      {
        nameStatusLines: [
          'A\tpackages/db/migrations/0001_lumpy_menace.sql',
          'A\tpackages/db/migrations/0099_orphan.sql',
        ],
      },
    );
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit,
    });
    assert.equal(result.historyOk, false);
    assert.ok(
      result.refusals.some((r) => r.includes('missing SQL for journaled')),
    );
    assert.ok(
      result.refusals.some((r) => r.includes('unjournaled new migration SQL')),
    );
  });

  it('refuses non-ancestor base/head relationship', () => {
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit: createFakeRunGit(
        {
          'basesha:packages/db/migrations/meta/_journal.json': journal([
            entry0,
            entry1,
          ]),
          'headsha:packages/db/migrations/meta/_journal.json': journal([
            entry0,
            entry1,
          ]),
          'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
          'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
          'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
          'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
          'headsha:packages/db/migrations/meta/0001_snapshot.json': '{}',
        },
        { ancestor: false },
      ),
    });
    assert.equal(result.exitCode, 2);
    assert.match(result.unavailable ?? '', /not an ancestor/);
  });

  it('refuses unresolved refs and option-like refs', () => {
    const runGit = createFakeRunGit({});
    const missing = reviewMigrationChange({
      base: 'missing-ref',
      head: 'HEAD',
      runGit,
    });
    assert.equal(missing.exitCode, 2);
    assert.match(missing.unavailable ?? '', /unresolved git ref/);

    const option = reviewMigrationChange({
      base: '--dry-run',
      head: 'HEAD',
      runGit,
    });
    assert.equal(option.exitCode, 2);
    assert.match(option.unavailable ?? '', /option-like/);
  });

  it('reports missing terminal snapshot as warning only', () => {
    const j = journal([entry0, entry1]);
    const runGit = createFakeRunGit({
      'basesha:packages/db/migrations/meta/_journal.json': j,
      'headsha:packages/db/migrations/meta/_journal.json': j,
      'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
      'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
    });
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit,
    });
    assert.equal(result.historyOk, true);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /missing terminal snapshot/);
  });
});

describe('lexical review hints', () => {
  it('detects conservative hint categories including comment false positives', () => {
    const sql = `-- DROP TABLE legacy;\nALTER TABLE users ADD COLUMN x int;\nUPDATE users SET x = 1;`;
    const hints = collectLexicalHintCategories(sql);
    assert.ok(hints.includes('DROP'));
    assert.ok(hints.includes('ALTER TABLE'));
    assert.ok(hints.includes('UPDATE'));
  });

  it('never treats empty hints as safe classification', () => {
    const review = reviewNewMigrationSql(
      'SELECT 1;',
      3,
      '0003_plain',
      sqlDigest('SELECT 1;'),
    );
    assert.deepEqual(review.hintCategories, []);
    assert.match(review.lexicalRiskNote, /not classify.*safe/i);
    const checklist = buildManualChecklist([]);
    assert.equal(checklist.expectedVerification, true);
    assert.equal(checklist.compatibility, true);
  });

  it('maps hints to manual checklist topics', () => {
    const review = reviewNewMigrationSql(
      'ALTER TYPE mood RENAME TO temperament;',
      4,
      '0004_type',
      sqlDigest('x'),
    );
    assert.ok(review.hintCategories.includes('ALTER TYPE'));
    assert.equal(review.manualChecklist.lockingTableRewrite, true);
    assert.equal(review.manualChecklist.compatibility, true);
  });
});

describe('review output contract', () => {
  it('uses offscreen.db-migration-review.v1 and omits SQL bodies from JSON', () => {
    const { runGit } = unchangedFixtures();
    const result = reviewMigrationChange({
      base: 'main',
      head: 'HEAD',
      runGit,
    });
    assert.equal(result.schema, 'offscreen.db-migration-review.v1');
    const json = JSON.stringify(result);
    assert.doesNotMatch(json, /CREATE TABLE/);
    assert.doesNotMatch(json, /sqlBody/i);
  });

  it('keeps stable exit codes for warning-only inventory', () => {
    const j = journal([entry0, entry1]);
    const runGit = createFakeRunGit({
      'basesha:packages/db/migrations/meta/_journal.json': j,
      'headsha:packages/db/migrations/meta/_journal.json': j,
      'basesha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'headsha:packages/db/migrations/0000_tiny_pandemic.sql': baseSql0,
      'basesha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
      'headsha:packages/db/migrations/0001_lumpy_menace.sql': baseSql1,
    });
    const result = reviewMigrationChange({
      base: 'basesha',
      head: 'headsha',
      runGit,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.warnings.length, 1);
  });

  it('human output reports hints without printing SQL bodies', () => {
    const sql = 'DROP TABLE demo;';
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
    };
    try {
      printReviewResult({
        schema: 'offscreen.db-migration-review.v1',
        baseRef: 'main',
        headRef: 'HEAD',
        baseSha: 'abc',
        headSha: 'def',
        historyOk: true,
        refusals: [],
        warnings: [],
        priorEntryCount: 1,
        headEntryCount: 2,
        newMigrations: [
          reviewNewMigrationSql(sql, 1, '0001_drop', sqlDigest(sql)),
        ],
        lexicalHeuristicNotice: 'notice',
        exitCode: 0,
      });
    } finally {
      console.log = originalLog;
    }
    const joined = logs.join('\n');
    assert.match(joined, /DROP/);
    assert.doesNotMatch(joined, /DROP TABLE demo/);
  });
});

describe('review-change CLI', () => {
  it('returns usage exit when --base is missing', () => {
    assert.equal(runCli([]), 2);
  });
});

describe('reviewMigrationChange against repository', () => {
  it('compares main to HEAD without refusal when history unchanged', () => {
    const runGit = defaultRunGit();
    const result = reviewMigrationChange({
      base: 'main',
      head: 'HEAD',
      runGit,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.historyOk, true);
    assert.ok(result.baseSha);
    assert.ok(result.headSha);
  });
});
