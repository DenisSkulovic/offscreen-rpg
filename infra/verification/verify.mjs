#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { runDiagnostic } from './diagnostic.mjs';
import { assertHelmAvailable as defaultAssertHelmAvailable } from '../workloads/render.mjs';
import { runTrackedEntrypoint } from '../monitoring/operation-entrypoint.mjs';

export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const TEST_TIMEOUT_MS = 120_000;

/** @typedef {'PASS' | 'FAIL' | 'BLOCKED' | 'TIMEOUT'} SuiteStatus */

/** @typedef {{
 *   tests: number | null,
 *   pass: number | null,
 *   fail: number | null,
 *   skipped: number | null,
 *   complete: boolean,
 * }} TapCounts */

/** @typedef {{
 *   id: string,
 *   status: SuiteStatus,
 *   durationMs: number,
 *   command: string[],
 *   exitCode: number | null,
 *   signal: string | null,
 *   counts: TapCounts,
 *   files: string[],
 * }} SuiteResult */

/** @typedef {'SOURCE' | 'FIXTURE'} ScenarioTier */

export const SOURCE_SUITE_DEFINITIONS = Object.freeze([
  {
    id: 'platform-plan',
    requiresHelm: false,
    files: Object.freeze([
      'infra/environments/platform-plan.test.mjs',
      'infra/images/distribution/kind-image-loader.test.mjs',
      'infra/images/development/sync-plan.test.mjs',
    ]),
  },
  {
    id: 'dev-environments',
    requiresHelm: false,
    globDir: 'tools/dev-environments/test',
  },
  {
    id: 'workloads',
    requiresHelm: true,
    globDir: 'infra/workloads/tests',
  },
  {
    id: 'release',
    requiresHelm: false,
    globDir: 'infra/environments/release/test',
  },
]);

/** Stable catalog IDs from infra/verification/CAPABILITIES.md */
export const CATALOG_SCENARIO_IDS = Object.freeze([
  'HOST-01',
  'HOST-02',
  'CL-01',
  'CL-02',
  'CL-03',
  'PL-01',
  'PL-02',
  'PL-03',
  'PL-04',
  'PL-05',
  'PL-06',
  'PL-07',
  'PL-08',
  'PL-09',
  'DATA-01',
  'DATA-02',
  'DATA-03',
  'DATA-04',
  'DEV-01',
  'DEV-02',
  'DEV-03',
  'DEV-04',
  'DEV-05',
  'DEV-06',
  'DEV-07',
  'DEV-08',
  'DEV-09',
  'DEV-10',
  'DEV-11',
  'DEV-12',
  'DEV-13',
  'DEV-14',
  'DEV-15',
  'RES-01',
  'RES-02',
  'REL-01',
  'REL-02',
  'REL-03',
  'REL-04',
  'REL-05',
  'REL-06',
  'UX-01',
  'UX-02',
  'MON-01',
  'MON-02',
  'MON-03',
  'MON-04',
  'MON-05',
  'MON-06',
  'MON-07',
  'MON-08',
  'MON-09',
]);

/** Explicit static tier mapping from the capability catalog baseline text. */
export const SCENARIO_TIER_MAP = Object.freeze({
  'HOST-01': 'SOURCE',
  'CL-03': 'SOURCE',
  'PL-01': 'SOURCE',
  'PL-02': 'SOURCE',
  'PL-03': 'SOURCE',
  'DEV-01': 'SOURCE',
  'DEV-11': 'SOURCE',
  'DEV-13': 'SOURCE',
  'REL-02': 'SOURCE',
  'REL-04': 'FIXTURE',
});

/** Explicit static source-suite ownership for tiered scenarios only. */
export const SCENARIO_SOURCE_SUITE_MAP = Object.freeze({
  'HOST-01': Object.freeze(['dev-environments']),
  'CL-03': Object.freeze(['platform-plan']),
  'PL-01': Object.freeze(['platform-plan']),
  'PL-02': Object.freeze(['platform-plan']),
  'PL-03': Object.freeze(['platform-plan']),
  'DEV-01': Object.freeze(['dev-environments']),
  'DEV-11': Object.freeze(['dev-environments']),
  'DEV-13': Object.freeze(['dev-environments']),
  'REL-02': Object.freeze(['release']),
  'REL-04': Object.freeze(['release']),
});

/**
 * Workstation observability catalog rows proved by diagnostic fixture checks,
 * not the Node TAP source suite. Fixture PASS does not imply live acceptance.
 */
export const MON_FIXTURE_EVIDENCE = Object.freeze({
  'MON-01': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_install.py',
      'infra/monitoring/tests/test_collector.py',
      'infra/monitoring/tests/test_storage.py',
    ]),
  }),
  'MON-02': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_host.py',
      'infra/monitoring/tests/test_report.py',
    ]),
  }),
  'MON-03': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_processes.py',
      'infra/monitoring/tests/test_report.py',
    ]),
  }),
  'MON-04': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_runtime.py',
      'infra/monitoring/tests/test_kube.py',
      'infra/monitoring/tests/test_cgroup.py',
      'infra/monitoring/tests/test_runtime_collector.py',
      'infra/monitoring/tests/test_report.py',
    ]),
  }),
  'MON-05': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_host.py',
      'infra/monitoring/tests/test_kube.py',
      'infra/monitoring/tests/test_storage.py',
    ]),
  }),
  'MON-06': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_storage.py',
      'infra/monitoring/tests/test_host.py',
      'infra/monitoring/tests/test_report.py',
    ]),
  }),
  'MON-07': Object.freeze({
    diagnosticChecks: Object.freeze([
      'source:infra/monitoring/tests/operation-event.test.mjs',
      'source:monitoring-python',
    ]),
    modules: Object.freeze([
      'infra/monitoring/tests/operation-event.test.mjs',
      'infra/monitoring/tests/test_report.py',
    ]),
  }),
  'MON-08': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze([
      'infra/monitoring/tests/test_report.py',
      'infra/monitoring/tests/test_export.py',
    ]),
  }),
  'MON-09': Object.freeze({
    diagnosticChecks: Object.freeze(['source:monitoring-python']),
    modules: Object.freeze(['infra/monitoring/tests/test_collector.py']),
    liveNote:
      'Cadence and scheduling bounds only; comparable idle before/after overhead is separately authorized live proof, not inferred from fixtures.',
  }),
});

/** Diagnostic check IDs that attach observations to MON catalog rows when the check runs. */
export const DIAGNOSTIC_CHECK_CAPABILITY_LINKS = Object.freeze({
  'source:monitoring-python': Object.freeze([
    'MON-01',
    'MON-02',
    'MON-03',
    'MON-04',
    'MON-05',
    'MON-06',
    'MON-08',
    'MON-09',
  ]),
  'source:infra/monitoring/tests/operation-event.test.mjs': Object.freeze(['MON-07']),
});

const NOT_IMPLEMENTED_SUITES = new Set(['smoke', 'full']);

/**
 * @param {string[]} argv
 */
export function parseVerifyArgs(argv) {
  let suite;
  let json = false;
  /** @type {string[]} */
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--suite') {
      if (index + 1 >= argv.length) {
        return { ok: false, exitCode: 2, message: '--suite requires a value' };
      }
      index += 1;
      suite = argv[index];
      continue;
    }
    if (token === '--json') {
      json = true;
      continue;
    }
    if (token.startsWith('--')) {
      return { ok: false, exitCode: 2, message: `unknown option: ${token}` };
    }
    positional.push(token);
  }

  if (positional.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      message: 'unexpected positional arguments',
    };
  }
  if (!suite) {
    return { ok: false, exitCode: 2, message: 'missing --suite' };
  }
  if (NOT_IMPLEMENTED_SUITES.has(suite)) {
    return {
      ok: false,
      exitCode: 2,
      message: `suite not implemented: ${suite}`,
    };
  }
  if (suite !== 'source' && suite !== 'diagnostic') {
    return { ok: false, exitCode: 2, message: `unknown suite: ${suite}` };
  }

  return { ok: true, suite, json };
}

/**
 * @param {string} repoRoot
 * @param {string} relativeDir
 */
export function expandTestGlob(repoRoot, relativeDir) {
  const absolute = join(repoRoot, relativeDir);
  let entries;
  try {
    entries = readdirSync(absolute, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map((entry) => join(relativeDir, entry.name).replace(/\\/g, '/'))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * @param {string} repoRoot
 * @param {(typeof SOURCE_SUITE_DEFINITIONS)[number]} definition
 */
export function resolveSuiteFiles(repoRoot, definition) {
  if ('files' in definition && definition.files) {
    return [...definition.files];
  }
  if ('globDir' in definition && definition.globDir) {
    return expandTestGlob(repoRoot, definition.globDir);
  }
  return [];
}

/**
 * @param {string} text
 * @returns {TapCounts}
 */
export function parseTapCounts(text) {
  /** @type {TapCounts} */
  const counts = {
    tests: null,
    pass: null,
    fail: null,
    skipped: null,
    complete: false,
  };

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = /^#\s+(tests|pass|fail|skipped)\s+(\d+)/.exec(trimmed);
    if (!match) continue;
    const key = match[1];
    const value = Number.parseInt(match[2], 10);
    if (key === 'tests') counts.tests = value;
    if (key === 'pass') counts.pass = value;
    if (key === 'fail') counts.fail = value;
    if (key === 'skipped') counts.skipped = value;
  }

  counts.complete =
    counts.tests !== null &&
    counts.pass !== null &&
    counts.fail !== null &&
    counts.skipped !== null;
  return counts;
}

/**
 * @param {TapCounts} counts
 * @param {number | null} exitCode
 */
export function countsIndicateFailure(counts, exitCode) {
  if (!counts.complete) return true;
  if (counts.fail !== null && counts.fail > 0) return true;
  if (exitCode !== null && exitCode !== 0) return true;
  return false;
}

/**
 * @param {SuiteResult[]} suites
 */
export function buildCatalogScenarios(suites) {
  const byId = new Map(suites.map((suite) => [suite.id, suite]));

  return CATALOG_SCENARIO_IDS.map((id) => {
    const tier = SCENARIO_TIER_MAP[id];
    /** @type {{ id: string, liveStatus: 'NOT-RUN', tier?: ScenarioTier, sourceCoverage?: string }} */
    const row = { id, liveStatus: 'NOT-RUN' };
    if (!tier) {
      return row;
    }
    row.tier = tier;
    const mappedSuites = SCENARIO_SOURCE_SUITE_MAP[id] ?? [];
    if (mappedSuites.length === 0) {
      row.sourceCoverage = 'NOT-RUN';
      return row;
    }
    const statuses = mappedSuites.map(
      (suiteId) => byId.get(suiteId)?.status ?? 'FAIL',
    );
    if (statuses.every((status) => status === 'PASS')) {
      row.sourceCoverage = 'COVERED';
    } else if (statuses.some((status) => status === 'BLOCKED')) {
      row.sourceCoverage = 'BLOCKED';
    } else {
      row.sourceCoverage = 'GAP';
    }
    return row;
  });
}

/**
 * @param {SuiteResult[]} suites
 */
export function aggregateExitCode(suites) {
  if (suites.some((suite) => suite.status !== 'PASS')) {
    return 1;
  }
  return 0;
}

/**
 * @param {{
 *   repoRoot?: string,
 *   timeoutMs?: number,
 *   run?: (command: string, args: string[], options: object) => {
 *     status: number | null,
 *     signal: string | null,
 *     stdout?: string,
 *     stderr?: string,
 *     error?: Error,
 *   },
 *   assertHelmAvailable?: (options?: object) => string,
 *   now?: () => number,
 * }} [options]
 */
export function runSourceVerification(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const timeoutMs = options.timeoutMs ?? TEST_TIMEOUT_MS;
  const run = options.run ?? defaultRun;
  const assertHelm = options.assertHelmAvailable ?? defaultAssertHelmAvailable;
  const now = options.now ?? Date.now;

  let helmAvailable = true;
  let helmVersion;
  try {
    helmVersion = assertHelm();
  } catch {
    helmAvailable = false;
  }

  /** @type {SuiteResult[]} */
  const suites = [];

  for (const definition of SOURCE_SUITE_DEFINITIONS) {
    const files = resolveSuiteFiles(repoRoot, definition);
    const command = [process.execPath, '--test', '--test-reporter=tap', ...files];
    const started = now();

    if (files.length === 0) {
      suites.push({
        id: definition.id,
        status: 'FAIL',
        durationMs: 0,
        command,
        exitCode: null,
        signal: null,
        counts: {
          tests: null,
          pass: null,
          fail: null,
          skipped: null,
          complete: false,
        },
        files,
      });
      continue;
    }

    if (definition.requiresHelm && !helmAvailable) {
      suites.push({
        id: definition.id,
        status: 'BLOCKED',
        durationMs: now() - started,
        command,
        exitCode: null,
        signal: null,
        counts: {
          tests: null,
          pass: null,
          fail: null,
          skipped: null,
          complete: false,
        },
        files,
      });
      continue;
    }

    const result = run(process.execPath, ['--test', '--test-reporter=tap', ...files], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      shell: false,
    });

    const durationMs = now() - started;
    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    const combined = `${stdout}\n${stderr}`;
    const counts = parseTapCounts(combined);

    /** @type {SuiteStatus} */
    let status = 'PASS';
    if (
      result.error &&
      /** @type {{ code?: string }} */ (result.error).code === 'ETIMEDOUT'
    ) {
      status = 'TIMEOUT';
    } else if (result.signal === 'SIGTERM' || result.signal === 'SIGKILL') {
      status = 'TIMEOUT';
    } else if (result.signal) {
      status = 'FAIL';
    } else if (countsIndicateFailure(counts, result.status)) {
      status = 'FAIL';
    }

    suites.push({
      id: definition.id,
      status,
      durationMs,
      command,
      exitCode: result.status,
      signal: result.signal ?? null,
      counts,
      files,
    });
  }

  const scenarios = buildCatalogScenarios(suites);
  const exitCode = aggregateExitCode(suites);

  return {
    suite: 'source',
    exitCode,
    helm: helmAvailable
      ? { available: true, version: helmVersion }
      : { available: false },
    suites,
    scenarios,
  };
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {object} options
 */
function defaultRun(command, args, options) {
  return spawnSync(command, args, options);
}

/**
 * @param {{ json?: boolean }} options
 */
export function formatVerificationReport(report, options = {}) {
  if (options.json) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const lines = [
    `infra:verify suite=${report.suite} exit=${report.exitCode}`,
    `helm=${report.helm.available ? (report.helm.version ?? 'ok') : 'missing'}`,
  ];
  for (const suite of report.suites) {
    const counts = suite.counts;
    const countText = counts.complete
      ? `tests=${counts.tests} pass=${counts.pass} fail=${counts.fail} skipped=${counts.skipped}`
      : 'counts=unknown';
    lines.push(
      `${suite.id}: ${suite.status} exit=${suite.exitCode ?? 'n/a'} ${countText} ${suite.durationMs}ms`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/**
 * @param {string[]} argv
 * @param {{ write?: (chunk: string) => void, runVerification?: typeof runSourceVerification }} [io]
 */
export function runVerifyCli(argv, io = {}) {
  const write = io.write ?? ((chunk) => process.stdout.write(chunk));
  const runVerification = io.runVerification ?? runSourceVerification;
  const operationDeps = io.operationDeps ?? {};
  const parsed = parseVerifyArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n`);
    return parsed.exitCode;
  }

  let report;
  runTrackedEntrypoint(
    'infra.verify.source',
    () => {
      report = runVerification();
      return {
        exitCode: report.exitCode,
        refused: report.exitCode === 2,
      };
    },
    { repoRoot: REPO_ROOT, ...operationDeps },
  );
  write(formatVerificationReport(report, { json: parsed.json }));
  return report.exitCode;
}

const IS_CLI_MAIN =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_CLI_MAIN) {
  const parsed = parseVerifyArgs(process.argv.slice(2));
  if (parsed.ok && parsed.suite === 'diagnostic') {
    try {
      process.exitCode = await runDiagnostic({
        repoRoot: REPO_ROOT,
        definitions: SOURCE_SUITE_DEFINITIONS,
        resolveFiles: resolveSuiteFiles,
        parseCounts: parseTapCounts,
        catalogIds: CATALOG_SCENARIO_IDS,
        checkCapabilityLinks: DIAGNOSTIC_CHECK_CAPABILITY_LINKS,
        json: parsed.json,
      });
    } catch (error) {
      process.stderr.write('Diagnostic stopped: ' + error.message + '\n');
      process.exitCode = 1;
    }
  } else process.exitCode = runVerifyCli(process.argv.slice(2));
}
