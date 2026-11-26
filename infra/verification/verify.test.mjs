import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {
  aggregateExitCode,
  buildCatalogScenarios,
  CATALOG_SCENARIO_IDS,
  expandTestGlob,
  parseTapCounts,
  parseVerifyArgs,
  resolveSuiteFiles,
  runSourceVerification,
  runVerifyCli,
  SCENARIO_TIER_MAP,
  SOURCE_SUITE_DEFINITIONS,
  MON_FIXTURE_EVIDENCE,
  DIAGNOSTIC_CHECK_CAPABILITY_LINKS,
} from './verify.mjs';

const TAP_OK = `# tests 2
# suites 1
# pass 2
# fail 0
# skipped 0
`;

const TAP_FAIL = `# tests 2
# suites 1
# pass 1
# fail 1
# skipped 0
`;

function suiteKeyFromFiles(files) {
  const sample = files[0] ?? '';
  if (
    files.some((file) =>
      file.includes('infra/platform/redis/tests/render.test.mjs'),
    )
  ) {
    return 'redis-render';
  }
  if (
    sample.includes('platform-plan') ||
    sample.includes('kind-image-loader') ||
    sample.includes('sync-plan') ||
    sample.includes('infra/platform/temporal/tests') ||
    sample.includes('infra/platform/postgres/tests/temporal-persistence') ||
    sample.includes('infra/platform/redis/tests')
  ) {
    return 'platform-plan';
  }
  if (sample.includes('tools/dev-environments/test')) return 'dev-environments';
  if (sample.includes('infra/workloads/tests')) return 'workloads';
  if (sample.includes('infra/environments/release/test')) return 'release';
  if (
    sample.includes('infra/verification/dev-environments/lifecycle-programme')
  ) {
    return 'infra-dev-lifecycle';
  }
  if (
    sample.includes('recovery-programme') ||
    sample.includes('tenant-retention-programme')
  ) {
    return 'infra-dev-recovery';
  }
  if (sample.includes('selective-profile-programme'))
    return 'infra-dev-selective';
  return 'unknown';
}

function mockRunBySuite(resultsByPrefix) {
  return (command, args) => {
    assert.equal(command, process.execPath);
    assert.equal(args[0], '--test');
    assert.equal(args[1], '--test-reporter=tap');
    const files = args.slice(2);
    const key = suiteKeyFromFiles(files);
    const template = resultsByPrefix[key] ?? {
      status: 0,
      signal: null,
      stdout: TAP_OK,
      stderr: '',
    };
    return {
      ...template,
      stdout: template.stdout ?? '',
      stderr: template.stderr ?? '',
    };
  };
}

test('parseVerifyArgs accepts source and strict --json', () => {
  const parsed = parseVerifyArgs(['--suite', 'source', '--json']);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.suite, 'source');
  assert.equal(parsed.json, true);
});

test('parseVerifyArgs rejects smoke/full and unknown options', () => {
  assert.deepEqual(parseVerifyArgs(['--suite', 'smoke']), {
    ok: false,
    exitCode: 2,
    message: 'suite not implemented: smoke',
  });
  assert.deepEqual(parseVerifyArgs(['--suite', 'full']), {
    ok: false,
    exitCode: 2,
    message: 'suite not implemented: full',
  });
  assert.deepEqual(parseVerifyArgs(['--suite', 'source', '--help']), {
    ok: false,
    exitCode: 2,
    message: 'unknown option: --help',
  });
});

test('parseTapCounts preserves counts and marks missing summary incomplete', () => {
  const full = parseTapCounts(TAP_OK);
  assert.equal(full.complete, true);
  assert.deepEqual(full, {
    tests: 2,
    pass: 2,
    fail: 0,
    skipped: 0,
    complete: true,
  });
  const partial = parseTapCounts('# pass 1\n');
  assert.equal(partial.complete, false);
  assert.equal(partial.pass, 1);
});

test('runSourceVerification passes when all suites pass', () => {
  const report = runSourceVerification({
    run: mockRunBySuite({}),
    assertHelmAvailable: () => 'v3.14.0',
    now: (() => {
      let t = 1_000;
      return () => (t += 10);
    })(),
  });
  assert.equal(report.exitCode, 0);
  assert.equal(report.suites.length, 11);
  assert.ok(report.suites.every((suite) => suite.status === 'PASS'));
  assert.ok(
    report.suites.every((suite) =>
      suite.command.every((part, index) =>
        index === 0 ? part === process.execPath : true,
      ),
    ),
  );
});

test('runSourceVerification fails on partial suite failure', () => {
  const report = runSourceVerification({
    run: mockRunBySuite({
      release: { status: 1, signal: null, stdout: TAP_FAIL, stderr: '' },
    }),
    assertHelmAvailable: () => 'v3.14.0',
  });
  assert.equal(report.exitCode, 1);
  const release = report.suites.find((suite) => suite.id === 'release');
  assert.equal(release?.status, 'FAIL');
});

test('runSourceVerification marks timeout suites as FAIL overall', () => {
  const report = runSourceVerification({
    run: mockRunBySuite({
      'dev-environments': {
        status: null,
        signal: 'SIGTERM',
        stdout: '',
        stderr: '',
        error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }),
      },
    }),
    assertHelmAvailable: () => 'v3.14.0',
  });
  assert.equal(report.exitCode, 1);
  const dev = report.suites.find((suite) => suite.id === 'dev-environments');
  assert.equal(dev?.status, 'TIMEOUT');
});

test('runSourceVerification blocks workloads without helm but runs other suites', () => {
  const calls = [];
  const report = runSourceVerification({
    run: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, signal: null, stdout: TAP_OK, stderr: '' };
    },
    assertHelmAvailable: () => {
      throw new Error('helm is not available');
    },
  });
  assert.equal(report.exitCode, 1);
  const workloads = report.suites.find((suite) => suite.id === 'workloads');
  assert.equal(workloads?.status, 'BLOCKED');
  const redisRender = report.suites.find(
    (suite) => suite.id === 'redis-render',
  );
  assert.equal(redisRender?.status, 'BLOCKED');
  const rabbitmqRender = report.suites.find(
    (suite) => suite.id === 'rabbitmq-render',
  );
  assert.equal(rabbitmqRender?.status, 'BLOCKED');
  assert.ok(
    report.suites
      .filter(
        (suite) =>
          suite.id !== 'workloads' &&
          suite.id !== 'redis-render' &&
          suite.id !== 'rabbitmq-render',
      )
      .every((suite) => suite.status === 'PASS'),
  );
  assert.ok(
    calls.every(
      ({ args }) => !args.includes('docker') && !args.includes('tilt'),
    ),
  );
  assert.equal(calls.length, 8);
});

test('expandTestGlob returns sorted filenames without shell expansion', () => {
  const root = mkdtempSync(join(tmpdir(), 'verify-glob-'));
  const rel = 'tools/dev-environments/test';
  mkdirSync(join(root, rel), { recursive: true });
  const names = ['z-last.test.mjs', 'a-first.test.mjs', 'ignore.mjs'];
  for (const name of names) {
    writeFileSync(join(root, rel, name), '');
  }
  assert.deepEqual(expandTestGlob(root, rel), [
    `${rel}/a-first.test.mjs`,
    `${rel}/z-last.test.mjs`,
  ]);
  const definition = SOURCE_SUITE_DEFINITIONS.find(
    (item) => item.id === 'workloads',
  );
  assert.ok(definition);
  const emptyRoot = mkdtempSync(join(tmpdir(), 'verify-glob-empty-'));
  mkdirSync(join(emptyRoot, definition.globDir), { recursive: true });
  assert.equal(resolveSuiteFiles(emptyRoot, definition).length, 0);
});

test('empty glob suite fails without invoking node for that suite', () => {
  const spawnedSuiteIds = [];
  const report = runSourceVerification({
    run: (command, args) => {
      spawnedSuiteIds.push(suiteKeyFromFiles(args.slice(2)));
      return { status: 0, signal: null, stdout: TAP_OK, stderr: '' };
    },
    assertHelmAvailable: () => 'v3.14.0',
  });
  for (const suite of report.suites) {
    if (suite.files.length === 0) {
      assert.equal(suite.status, 'FAIL');
      assert.ok(!spawnedSuiteIds.includes(suite.id));
    }
  }
});

test('catalog lists every stable ID; tier only on explicit map; live NOT-RUN', () => {
  const report = runSourceVerification({
    run: mockRunBySuite({}),
    assertHelmAvailable: () => 'v3.14.0',
  });
  assert.equal(report.scenarios.length, CATALOG_SCENARIO_IDS.length);
  assert.ok(report.scenarios.every((row) => row.liveStatus === 'NOT-RUN'));
  for (const row of report.scenarios) {
    if (SCENARIO_TIER_MAP[row.id]) {
      assert.equal(row.tier, SCENARIO_TIER_MAP[row.id]);
      assert.ok(row.sourceCoverage);
    } else {
      assert.equal(row.tier, undefined);
      assert.equal(row.sourceCoverage, undefined);
    }
  }
});

test('buildCatalogScenarios never marks live acceptance PASS from source', () => {
  const scenarios = buildCatalogScenarios([
    {
      id: 'release',
      status: 'PASS',
      durationMs: 1,
      command: [],
      exitCode: 0,
      signal: null,
      counts: parseTapCounts(TAP_OK),
      files: [],
    },
  ]);
  const rel02 = scenarios.find((row) => row.id === 'REL-02');
  assert.equal(rel02?.liveStatus, 'NOT-RUN');
  assert.equal(rel02?.sourceCoverage, 'COVERED');
  assert.notEqual(rel02?.liveStatus, 'PASS');
});

test('runVerifyCli returns exit 2 for invalid suite without live commands', () => {
  const code = runVerifyCli(['--suite', 'smoke'], { write: () => {} });
  assert.equal(code, 2);
});

test('MON fixture evidence covers MON-01..09 with report and export modules for MON-08', () => {
  const monIds = CATALOG_SCENARIO_IDS.filter((id) => id.startsWith('MON-'));
  assert.equal(monIds.length, 9);
  for (const id of monIds) {
    assert.ok(
      MON_FIXTURE_EVIDENCE[id],
      `missing MON_FIXTURE_EVIDENCE for ${id}`,
    );
    assert.ok(MON_FIXTURE_EVIDENCE[id].diagnosticChecks.length > 0);
  }
  const mon08 = MON_FIXTURE_EVIDENCE['MON-08'];
  assert.ok(mon08.modules.some((path) => path.endsWith('test_report.py')));
  assert.ok(mon08.modules.some((path) => path.endsWith('test_export.py')));
  assert.ok(
    DIAGNOSTIC_CHECK_CAPABILITY_LINKS['source:monitoring-python'].includes(
      'MON-08',
    ),
  );
  assert.deepEqual(
    DIAGNOSTIC_CHECK_CAPABILITY_LINKS[
      'source:infra/monitoring/tests/operation-event.test.mjs'
    ],
    ['MON-07'],
  );
});

test('aggregateExitCode is zero only when every suite passed', () => {
  assert.equal(
    aggregateExitCode([
      {
        id: 'a',
        status: 'PASS',
        durationMs: 0,
        command: [],
        exitCode: 0,
        signal: null,
        counts: parseTapCounts(TAP_OK),
        files: [],
      },
    ]),
    0,
  );
  assert.equal(
    aggregateExitCode([
      {
        id: 'a',
        status: 'BLOCKED',
        durationMs: 0,
        command: [],
        exitCode: null,
        signal: null,
        counts: parseTapCounts(''),
        files: [],
      },
    ]),
    1,
  );
});
