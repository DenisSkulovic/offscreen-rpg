#!/usr/bin/env node
/**
 * MA10: mode-aware runner for relocated legacy engine tests.
 * cwd for the Node test child is tools/api-integration (two-level package depth).
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');
const legacyDir = join(packageRoot, 'legacy-engine-tests');

const REQUIRED_ACK = 'I_ACCEPT_LOCAL_DB_MUTATION';

/** Sixteen filename-unit cases that provision disposable Postgres (SOURCE-MAP). */
const DISPOSABLE_SQL = new Set([
  'gm07-delegated-admission.test.mjs',
  'gm07-delegated-expiry.test.mjs',
  'gm07-delegated-offer-capture.test.mjs',
  'gm07-delegated-worker-path.test.mjs',
  'gm07-delegation-policy.test.mjs',
  'historical-fork-v2.test.mjs',
  'historical-fork.test.mjs',
  'library-v2-admit.test.mjs',
  'library-v2-fork.test.mjs',
  'scene-checkpoint-publication.test.mjs',
  'scene-checkpoint.test.mjs',
  'story03-generation-adoption.test.mjs',
  'story03-notice-topic-freeze.test.mjs',
  'story03-stale-saved-publish.test.mjs',
  'v2-active-fork.test.mjs',
  'wr04-writer-research.test.mjs',
]);

const INTEGRATION = new Set([
  'obs00-b-current-authority-loader.integration.test.mjs',
  'obs00-b-dispatch-authority.integration.test.mjs',
  'p3b-writer-provider-custody.integration.test.mjs',
  'saved-repair-apply.integration.test.mjs',
  'saved-repair-plan.integration.test.mjs',
  'wr03-writer-library-tools.integration.test.mjs',
  'wr03-writer-loop.integration.test.mjs',
  'wr03-writer-mission-custody.integration.test.mjs',
  'wr03-writer-mission.migration.integration.test.mjs',
  'wr03-writer-proposal.integration.test.mjs',
  'wr03-writer-workdesk.integration.test.mjs',
  'wr07b-joined-play.integration.test.mjs',
  'wr07b-launch-admission.integration.test.mjs',
  'wr07b-launch-publication.integration.test.mjs',
]);

const LIVE = new Set([
  'connected-rig.live.test.mjs',
  'eng01-item-transfer.live.test.mjs',
  'eng03-c1-committed-capture.live.test.mjs',
  'eng03-c1r-provisional-recovery.live.test.mjs',
  'eng03-c2-interrupted-capture.live.test.mjs',
  'eng03-lock-measurement.live.test.mjs',
  'eng03-narrow-capture.live.test.mjs',
  'eng03-resolution-lock-measurement.live.test.mjs',
  'eng03-t04-campaign-consequence-capture.live.test.mjs',
  'eng03-t05-historical-report-capture.live.test.mjs',
  'eng04-bounded-activity-reads.live.test.mjs',
  'gm01-custom-intent.live.test.mjs',
  'gm02-custom-intent-accept.live.test.mjs',
  'gm03-quiet-repeat.live.test.mjs',
  'gm05-public-events.live.test.mjs',
  'gm06-visit-checkpoint.live.test.mjs',
  'obs01-operation-coverage.live.test.mjs',
  'obs02-execution-stages.live.test.mjs',
  'obs02-h-stage-integrity.live.test.mjs',
  'obs03-prompt-provenance.live.test.mjs',
  'pw01-appearance-projection.live.test.mjs',
  'sandbox-postgres.live.test.mjs',
]);

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const CHAMBER_RUN_RE = /^offscreen_chamber_run_[a-f0-9]{32}$/;
const ALLOWED_DB_NAMES = new Set(['offscreen_db_test', 'offscreen_hk01_repair_test']);

function usage() {
  process.stderr.write(`Usage: node scripts/run-legacy-engine-tests.mjs [options]

Options:
  --mode=pure|disposable|integration|live   default: pure
  --allow-local-disposable                  required for non-pure modes
  --name=<basename.test.mjs>                repeat; required for non-pure modes
  --list-only                               print selected files; do not spawn
  --help                                    show this message

Non-pure modes require --allow-local-disposable, OFFSCREEN_DISPOSABLE_TEST_ACK=${REQUIRED_ACK},
and at least one --name= selector. Present DATABASE_URL / DATABASE_TEST_URL values are validated
before spawn (local host, no query, disposable database name only).
`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function classifyBasename(name) {
  if (LIVE.has(name)) return 'live';
  if (INTEGRATION.has(name)) return 'integration';
  if (DISPOSABLE_SQL.has(name)) return 'disposable';
  if (name.endsWith('.test.mjs')) return 'pure';
  return null;
}

function readLedger() {
  const names = readdirSync(legacyDir)
    .filter((entry) => entry.endsWith('.test.mjs'))
    .sort();
  if (names.length !== 112) {
    fail(`Expected 112 legacy-engine-tests basenames, found ${names.length}`);
  }
  const unique = new Set(names);
  if (unique.size !== 112) {
    fail('legacy-engine-tests contains duplicate basenames');
  }

  const byMode = { pure: [], disposable: [], integration: [], live: [] };
  for (const name of names) {
    const mode = classifyBasename(name);
    if (!mode) {
      fail(`Unclassified test file: ${name}`);
    }
    byMode[mode].push(name);
  }
  if (byMode.pure.length !== 60) {
    fail(`Pure selector expected 60 files, found ${byMode.pure.length}`);
  }
  if (byMode.disposable.length !== 16) {
    fail(`Disposable selector expected 16 files, found ${byMode.disposable.length}`);
  }
  if (byMode.integration.length !== 14) {
    fail(`Integration selector expected 14 files, found ${byMode.integration.length}`);
  }
  if (byMode.live.length !== 22) {
    fail(`Live selector expected 22 files, found ${byMode.live.length}`);
  }
  return { names, byMode };
}

function parseArgs(argv) {
  let mode = 'pure';
  let allowLocalDisposable = false;
  const selectedNames = [];
  let listOnly = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    if (arg === '--list-only') {
      listOnly = true;
      continue;
    }
    if (arg === '--allow-local-disposable') {
      allowLocalDisposable = true;
      continue;
    }
    if (arg.startsWith('--mode=')) {
      mode = arg.slice('--mode='.length);
      continue;
    }
    if (arg.startsWith('--name=')) {
      const name = arg.slice('--name='.length);
      if (!name || name.includes('/') || name.includes('\\')) {
        fail(`Invalid --name selector (basename only): ${arg}`);
      }
      selectedNames.push(name);
      continue;
    }
    fail(`Unknown argument: ${arg}`);
  }

  if (!['pure', 'disposable', 'integration', 'live'].includes(mode)) {
    fail(`Unknown mode: ${mode}`);
  }

  const seen = new Set();
  for (const name of selectedNames) {
    if (seen.has(name)) {
      fail(`Duplicate --name selector: ${name}`);
    }
    seen.add(name);
  }

  return { mode, allowLocalDisposable, selectedNames, listOnly };
}

function assertDisposableDatabaseName(databaseName) {
  if (ALLOWED_DB_NAMES.has(databaseName)) {
    return;
  }
  if (CHAMBER_RUN_RE.test(databaseName)) {
    return;
  }
  fail(
    `Refusing non-disposable database name "${databaseName}" (allowed: offscreen_db_test, offscreen_hk01_repair_test, offscreen_chamber_run_<32hex>)`,
  );
}

function validateConfiguredDatabaseUrl(envKey, value) {
  if (value === undefined || value === '') {
    return;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${envKey} is not a valid URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    fail(`${envKey} must use postgres:// or postgresql://`);
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    fail(`${envKey} refuses non-local host ${url.hostname}`);
  }
  if (url.search) {
    fail(`${envKey} must not include query overrides`);
  }
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName) {
    fail(`${envKey} missing database name`);
  }
  assertDisposableDatabaseName(databaseName);
}

function assertGatedEnvironment(mode, allowLocalDisposable) {
  if (mode === 'pure') {
    return;
  }
  if (!allowLocalDisposable) {
    fail(
      `Refusing ${mode} mode without --allow-local-disposable (will not import or spawn gated tests)`,
    );
  }
  if (process.env.OFFSCREEN_DISPOSABLE_TEST_ACK !== REQUIRED_ACK) {
    fail(
      `Refusing ${mode} mode without OFFSCREEN_DISPOSABLE_TEST_ACK=${REQUIRED_ACK}`,
    );
  }
  validateConfiguredDatabaseUrl(
    'DATABASE_TEST_URL',
    process.env.DATABASE_TEST_URL,
  );
  validateConfiguredDatabaseUrl('DATABASE_URL', process.env.DATABASE_URL);
}

const argv = process.argv.slice(2);
const options = parseArgs(argv);

const { names, byMode } = readLedger();

if (options.mode !== 'pure') {
  assertGatedEnvironment(options.mode, options.allowLocalDisposable);
}

let selectedFiles;
if (options.mode === 'pure') {
  if (options.selectedNames.length > 0) {
    fail('Pure mode does not accept --name selectors');
  }
  selectedFiles = byMode.pure.map((name) => join(legacyDir, name));
} else {
  const ledger = new Set(names);
  if (options.selectedNames.length === 0) {
    fail(
      `${options.mode} mode requires at least one --name=<basename.test.mjs> selector`,
    );
  }
  selectedFiles = [];
  for (const name of options.selectedNames) {
    if (!ledger.has(name)) {
      fail(`Unknown test basename (not in 112-file ledger): ${name}`);
    }
    const classified = classifyBasename(name);
    if (classified !== options.mode) {
      fail(
        `--name=${name} belongs to ${classified} mode, not requested ${options.mode}`,
      );
    }
    selectedFiles.push(join(legacyDir, name));
  }
  selectedFiles.sort();
}

if (options.listOnly) {
  for (const file of selectedFiles) {
    process.stdout.write(`${file}\n`);
  }
  process.exit(0);
}

const child = spawnSync(
  process.execPath,
  ['--test', '--test-concurrency=1', ...selectedFiles],
  {
    stdio: 'inherit',
    cwd: packageRoot,
    env: process.env,
  },
);

if (child.error) {
  fail(child.error.message);
}
process.exit(child.status === null ? 1 : child.status);