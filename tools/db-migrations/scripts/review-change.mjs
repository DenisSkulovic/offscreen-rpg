#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const repoRoot = path.resolve(toolRoot, '../..');

const JOURNAL_GIT_PATH = 'packages/db/migrations/meta/_journal.json';
const MIGRATIONS_GIT_PREFIX = 'packages/db/migrations';

const LEXICAL_HEURISTIC_NOTICE =
  'Lexical hints are heuristic only: they may match comments and miss dynamic SQL. Absence of hints does not classify a migration as safe.';

/** @typedef {{ ok: boolean, stdout: string, stderr: string, status: number }} GitResult */

/** @typedef {{ idx: number, version: string, when: number, tag: string, breakpoints: boolean }} JournalEntry */

/**
 * @typedef {{
 *   lockingTableRewrite: boolean,
 *   existingData: boolean,
 *   compatibility: boolean,
 *   recovery: boolean,
 *   transactionCompatibility: boolean,
 *   expectedVerification: boolean,
 * }} ManualChecklist
 */

/**
 * @typedef {{
 *   idx: number,
 *   tag: string,
 *   sqlSha256: string,
 *   hintCategories: string[],
 *   manualChecklist: ManualChecklist,
 *   lexicalRiskNote: string,
 * }} NewMigrationReview
 */

const ENTRY_FIELDS = ['idx', 'version', 'when', 'tag', 'breakpoints'];

/** @type {{ category: string, pattern: RegExp }[]} */
export const LEXICAL_HINT_RULES = [
  { category: 'DROP', pattern: /\bDROP\b/i },
  { category: 'TRUNCATE', pattern: /\bTRUNCATE\b/i },
  { category: 'ALTER TYPE', pattern: /\bALTER\s+TYPE\b/i },
  { category: 'SET NOT NULL', pattern: /\bSET\s+NOT\s+NULL\b/i },
  { category: 'CREATE INDEX', pattern: /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i },
  { category: 'CONCURRENTLY', pattern: /\bCONCURRENTLY\b/i },
  { category: 'UPDATE', pattern: /\bUPDATE\b/i },
  { category: 'DELETE', pattern: /\bDELETE\b/i },
  { category: 'ALTER TABLE', pattern: /\bALTER\s+TABLE\b/i },
];

/**
 * @param {string} sqlText
 */
export function collectLexicalHintCategories(sqlText) {
  /** @type {string[]} */
  const found = [];
  for (const rule of LEXICAL_HINT_RULES) {
    if (rule.pattern.test(sqlText)) {
      found.push(rule.category);
    }
  }
  return found;
}

/**
 * @param {string[]} hintCategories
 * @returns {ManualChecklist}
 */
export function buildManualChecklist(hintCategories) {
  const hints = new Set(hintCategories);
  const checklist = {
    lockingTableRewrite: false,
    existingData: false,
    compatibility: false,
    recovery: false,
    transactionCompatibility: false,
    expectedVerification: true,
  };

  if (
    hints.has('DROP') ||
    hints.has('TRUNCATE') ||
    hints.has('ALTER TYPE') ||
    hints.has('ALTER TABLE') ||
    hints.has('CREATE INDEX') ||
    hints.has('CONCURRENTLY')
  ) {
    checklist.lockingTableRewrite = true;
  }
  if (
    hints.has('SET NOT NULL') ||
    hints.has('UPDATE') ||
    hints.has('DELETE') ||
    hints.has('ALTER TYPE') ||
    hints.has('ALTER TABLE')
  ) {
    checklist.existingData = true;
  }
  if (
    hints.has('DROP') ||
    hints.has('TRUNCATE') ||
    hints.has('ALTER TYPE') ||
    hints.has('ALTER TABLE') ||
    hints.has('SET NOT NULL')
  ) {
    checklist.compatibility = true;
  }
  if (
    hints.has('DROP') ||
    hints.has('TRUNCATE') ||
    hints.has('UPDATE') ||
    hints.has('DELETE')
  ) {
    checklist.recovery = true;
  }
  if (
    hints.has('DROP') ||
    hints.has('TRUNCATE') ||
    hints.has('CREATE INDEX') ||
    hints.has('CONCURRENTLY') ||
    hints.has('ALTER TABLE')
  ) {
    checklist.transactionCompatibility = true;
  }

  if (hintCategories.length === 0) {
    checklist.compatibility = true;
    checklist.expectedVerification = true;
  }

  return checklist;
}

/**
 * @param {string} sqlText
 * @param {number} idx
 * @param {string} tag
 * @param {string} sqlSha256
 * @returns {NewMigrationReview}
 */
export function reviewNewMigrationSql(sqlText, idx, tag, sqlSha256) {
  const hintCategories = collectLexicalHintCategories(sqlText);
  return {
    idx,
    tag,
    sqlSha256,
    hintCategories,
    manualChecklist: buildManualChecklist(hintCategories),
    lexicalRiskNote: LEXICAL_HEURISTIC_NOTICE,
  };
}

/**
 * @param {JournalEntry} a
 * @param {JournalEntry} b
 */
function journalEntryEqual(a, b) {
  for (const field of ENTRY_FIELDS) {
    if (a[field] !== b[field]) return false;
  }
  return true;
}

/**
 * @param {string} tag
 */
function migrationSqlGitPath(tag) {
  return `${MIGRATIONS_GIT_PREFIX}/${tag}.sql`;
}

/**
 * @param {number} idx
 */
function snapshotGitPath(idx) {
  return `${MIGRATIONS_GIT_PREFIX}/meta/${String(idx).padStart(4, '0')}_snapshot.json`;
}

/**
 * @param {string} ref
 */
function rejectOptionLikeRef(ref) {
  return ref.startsWith('-');
}

/**
 * @param {string | Buffer} bytes
 */
function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * @param {string} text
 */
function parseJournal(text) {
  const journal = JSON.parse(text);
  if (!journal || !Array.isArray(journal.entries)) {
    throw new Error('invalid migration journal shape');
  }
  return /** @type {{ version: string, dialect: string, entries: JournalEntry[] }} */ (
    journal
  );
}

/**
 * @param {string} cwd
 * @returns {(args: string[]) => GitResult}
 */
export function defaultRunGit(cwd = repoRoot) {
  return (args) => {
    try {
      const stdout = execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 16 * 1024 * 1024,
      });
      return { ok: true, stdout, stderr: '', status: 0 };
    } catch (error) {
      const err =
        /** @type {NodeJS.ErrnoException & { status?: number, stdout?: Buffer, stderr?: Buffer }} */ (
          error
        );
      return {
        ok: false,
        stdout: err.stdout ? String(err.stdout) : '',
        stderr: err.stderr ? String(err.stderr) : '',
        status: err.status ?? 1,
        message: err.message,
      };
    }
  };
}

/**
 * @param {string} ref
 * @param {(args: string[]) => GitResult} runGit
 */
function resolveCommit(ref, runGit) {
  if (rejectOptionLikeRef(ref)) {
    return { ok: false, reason: `refusing option-like git ref: ${ref}` };
  }
  const verified = runGit(['rev-parse', '--verify', `${ref}^{commit}`]);
  if (!verified.ok) {
    return { ok: false, reason: `unresolved git ref: ${ref}` };
  }
  return { ok: true, sha: verified.stdout.trim() };
}

/**
 * @param {string} sha
 * @param {string} gitPath
 * @param {(args: string[]) => GitResult} runGit
 */
function gitShowBytes(sha, gitPath, runGit) {
  const result = runGit(['show', `${sha}:${gitPath}`]);
  if (!result.ok) {
    return { ok: false, reason: `missing ${gitPath} at ${sha.slice(0, 12)}` };
  }
  return { ok: true, bytes: Buffer.from(result.stdout, 'utf8') };
}

/**
 * @param {object} input
 * @param {string} input.base
 * @param {string} [input.head]
 * @param {(args: string[]) => GitResult} [input.runGit]
 */
export function reviewMigrationChange({
  base,
  head = 'HEAD',
  runGit = defaultRunGit(),
}) {
  /** @type {string[]} */
  const refusals = [];
  /** @type {string[]} */
  const warnings = [];

  const baseResolved = resolveCommit(base, runGit);
  if (!baseResolved.ok) {
    return unavailableResult(base, head, baseResolved.reason);
  }
  const headResolved = resolveCommit(head, runGit);
  if (!headResolved.ok) {
    return unavailableResult(base, head, headResolved.reason);
  }

  const baseSha = baseResolved.sha;
  const headSha = headResolved.sha;

  const ancestor = runGit(['merge-base', '--is-ancestor', baseSha, headSha]);
  if (!ancestor.ok || ancestor.status !== 0) {
    return unavailableResult(
      base,
      head,
      `base ${base} is not an ancestor of head ${head}`,
    );
  }

  const baseJournalShow = gitShowBytes(baseSha, JOURNAL_GIT_PATH, runGit);
  if (!baseJournalShow.ok) {
    return unavailableResult(base, head, baseJournalShow.reason);
  }
  const headJournalShow = gitShowBytes(headSha, JOURNAL_GIT_PATH, runGit);
  if (!headJournalShow.ok) {
    return unavailableResult(base, head, headJournalShow.reason);
  }

  let baseJournal;
  let headJournal;
  try {
    baseJournal = parseJournal(baseJournalShow.bytes.toString('utf8'));
    headJournal = parseJournal(headJournalShow.bytes.toString('utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unavailableResult(base, head, message);
  }

  const baseEntries = baseJournal.entries;
  const headEntries = headJournal.entries;

  if (headEntries.length < baseEntries.length) {
    refusals.push(
      `removed journal entries: base has ${baseEntries.length}, head has ${headEntries.length}`,
    );
  }

  const sharedCount = Math.min(baseEntries.length, headEntries.length);
  for (let i = 0; i < sharedCount; i += 1) {
    if (!journalEntryEqual(baseEntries[i], headEntries[i])) {
      refusals.push(
        `rewritten journal entry at idx ${baseEntries[i].idx}: tag ${baseEntries[i].tag}`,
      );
    }
  }

  for (let i = 0; i < baseEntries.length; i += 1) {
    const entry = baseEntries[i];
    const sqlPath = migrationSqlGitPath(entry.tag);
    const baseSql = gitShowBytes(baseSha, sqlPath, runGit);
    const headSql = gitShowBytes(headSha, sqlPath, runGit);
    if (!baseSql.ok) {
      refusals.push(`missing prior migration SQL at base: ${sqlPath}`);
      continue;
    }
    if (!headSql.ok) {
      refusals.push(`removed prior migration SQL: ${sqlPath}`);
      continue;
    }
    const baseHash = sha256Hex(baseSql.bytes);
    const headHash = sha256Hex(headSql.bytes);
    if (baseHash !== headHash) {
      refusals.push(`rewritten prior migration SQL: ${sqlPath}`);
    }
  }

  /** @type {NewMigrationReview[]} */
  const newMigrations = [];
  if (headEntries.length > baseEntries.length) {
    for (let i = baseEntries.length; i < headEntries.length; i += 1) {
      const entry = headEntries[i];
      const expectedIdx =
        i === baseEntries.length
          ? baseEntries.length === 0
            ? 0
            : baseEntries[baseEntries.length - 1].idx + 1
          : headEntries[i - 1].idx + 1;
      if (entry.idx !== expectedIdx) {
        refusals.push(
          `appended journal idx discontinuity at tag ${entry.tag}: expected ${expectedIdx}, got ${entry.idx}`,
        );
      }

      const sqlPath = migrationSqlGitPath(entry.tag);
      const headSql = gitShowBytes(headSha, sqlPath, runGit);
      if (!headSql.ok) {
        refusals.push(`missing SQL for journaled migration: ${sqlPath}`);
      } else {
        const sqlSha256 = sha256Hex(headSql.bytes);
        newMigrations.push(
          reviewNewMigrationSql(
            headSql.bytes.toString('utf8'),
            entry.idx,
            entry.tag,
            sqlSha256,
          ),
        );
      }
    }
  }

  const diff = runGit([
    'diff',
    '--name-status',
    `${baseSha}..${headSha}`,
    '--',
    `${MIGRATIONS_GIT_PREFIX}/`,
  ]);
  if (!diff.ok) {
    return unavailableResult(
      base,
      head,
      'git diff --name-status failed on migrations folder',
    );
  }

  const appendedTags = new Set(newMigrations.map((item) => item.tag));
  const lines = diff.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.split('\t');
    const status = parts[0];
    const filePath = parts[parts.length - 1];
    if (!filePath || !filePath.endsWith('.sql')) continue;
    const rel = filePath.startsWith(`${MIGRATIONS_GIT_PREFIX}/`)
      ? filePath.slice(MIGRATIONS_GIT_PREFIX.length + 1)
      : path.basename(filePath);
    if (rel.includes('/')) continue;
    const tag = rel.replace(/\.sql$/u, '');
    if (status.startsWith('A') || status.startsWith('?')) {
      if (!appendedTags.has(tag)) {
        refusals.push(`unjournaled new migration SQL: ${filePath}`);
      }
    }
    if (status.startsWith('D')) {
      const baseHas = baseEntries.some((entry) => entry.tag === tag);
      if (baseHas) {
        refusals.push(`deleted prior migration SQL: ${filePath}`);
      }
    }
  }

  const finalEntry = headEntries[headEntries.length - 1];
  if (finalEntry) {
    const snapshotPath = snapshotGitPath(finalEntry.idx);
    const snapshot = gitShowBytes(headSha, snapshotPath, runGit);
    if (!snapshot.ok) {
      warnings.push(
        `missing terminal snapshot ${snapshotPath} for journal idx ${finalEntry.idx} (metadata reconciliation is DBOPS01; not repaired here)`,
      );
    }
  }

  const historyOk = refusals.length === 0;
  return {
    schema: 'offscreen.db-migration-review.v1',
    baseRef: base,
    headRef: head,
    baseSha,
    headSha,
    historyOk,
    refusals,
    warnings,
    priorEntryCount: baseEntries.length,
    headEntryCount: headEntries.length,
    newMigrations,
    lexicalHeuristicNotice: LEXICAL_HEURISTIC_NOTICE,
    exitCode: historyOk ? 0 : 1,
  };
}

/**
 * @param {string} base
 * @param {string} head
 * @param {string} reason
 */
function unavailableResult(base, head, reason) {
  return {
    schema: 'offscreen.db-migration-review.v1',
    baseRef: base,
    headRef: head,
    baseSha: null,
    headSha: null,
    historyOk: false,
    refusals: [],
    warnings: [],
    priorEntryCount: 0,
    headEntryCount: 0,
    newMigrations: [],
    lexicalHeuristicNotice: LEXICAL_HEURISTIC_NOTICE,
    unavailable: reason,
    exitCode: 2,
  };
}

const CHECKLIST_LABELS = {
  lockingTableRewrite: 'locking / table rewrite',
  existingData: 'existing data',
  compatibility: 'compatibility',
  recovery: 'recovery',
  transactionCompatibility: 'transaction compatibility',
  expectedVerification: 'expected verification',
};

/**
 * @param {ReturnType<typeof reviewMigrationChange>} result
 * @param {{ json?: boolean }} [options]
 */
export function printReviewResult(result, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.unavailable) {
    console.error(`migration change review unavailable: ${result.unavailable}`);
    return;
  }
  console.log(
    `base ${result.baseSha?.slice(0, 12)} → head ${result.headSha?.slice(0, 12)}`,
  );
  console.log(
    `journal entries: ${result.priorEntryCount} prior, ${result.headEntryCount} at head (${result.newMigrations.length} new)`,
  );
  console.log(result.lexicalHeuristicNotice);
  for (const migration of result.newMigrations) {
    console.log(
      `  + ${migration.tag} (idx ${migration.idx}) sha256 ${migration.sqlSha256.slice(0, 12)}…`,
    );
    if (migration.hintCategories.length === 0) {
      console.log('    lexical hints: none detected (not classified as safe)');
    } else {
      console.log(`    lexical hints: ${migration.hintCategories.join(', ')}`);
    }
    const checklist = Object.entries(migration.manualChecklist)
      .filter(([, value]) => value)
      .map(
        ([key]) =>
          CHECKLIST_LABELS[
            /** @type {keyof typeof CHECKLIST_LABELS} */ (key)
          ] ?? key,
      );
    console.log(`    manual checklist: ${checklist.join('; ')}`);
    console.log(`    note: ${migration.lexicalRiskNote}`);
  }
  for (const warning of result.warnings) {
    console.error(`warning: ${warning}`);
  }
  for (const refusal of result.refusals) {
    console.error(`refusal: ${refusal}`);
  }
  if (result.historyOk) {
    console.log('migration history integrity: ok');
  } else {
    console.error('migration history integrity: refused');
  }
}

/**
 * @param {string[]} argv
 */
export function runCli(argv) {
  let base;
  let head = 'HEAD';
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--') {
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--base') {
      base = argv[++i];
      continue;
    }
    if (arg === '--head') {
      head = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(
        'usage: review-change.mjs --base <ref> [--head <ref>] [--json]',
      );
      return 0;
    }
    console.error(`unknown argument: ${arg}`);
    return 2;
  }
  if (!base) {
    console.error('missing required --base <ref>');
    return 2;
  }
  if (rejectOptionLikeRef(base) || rejectOptionLikeRef(head)) {
    console.error('refusing option-like git ref');
    return 2;
  }
  const result = reviewMigrationChange({ base, head });
  printReviewResult(result, { json });
  return result.exitCode ?? (result.historyOk ? 0 : 1);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  process.exit(runCli(process.argv.slice(2)));
}
