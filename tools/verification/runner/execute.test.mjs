import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {
  buildVerificationPlan,
  resolveSubject,
  REPO_ROOT,
} from './catalog.mjs';
import {
  acquireLiveResource,
  runChildCommand,
  runVerification,
} from './execute.mjs';
import { materializeExecutionPlan } from './plan.mjs';
import { reportContainsForbiddenSecrets, SECRET_SENTINEL } from './report.mjs';

function dbPlan(profile, options = {}) {
  const subject = resolveSubject('package', '@offscreen/db', REPO_ROOT);
  assert.equal(subject.ok, true);
  const built = buildVerificationPlan({
    subject: subject.subject,
    profile,
    live: options.live ?? false,
    section: options.section,
  });
  assert.equal(built.ok, true);
  return built.plan;
}

test('source-only path never calls live resource adapter', async () => {
  let acquireCalls = 0;
  const adapters = {
    postgres: {
      acquire: async () => {
        acquireCalls += 1;
        return {
          publicFacts: {},
          privateHandle: {},
          release: async () => {},
        };
      },
    },
  };
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const result = await runVerification(dbPlan('standard'), {
    repoRoot,
    adapters,
  });
  assert.equal(result.ok, true);
  assert.equal(acquireCalls, 0);
  assert.ok(
    result.report.scenarios.every((row) =>
      ['NOT-RUN', 'BLOCKED'].includes(row.status),
    ),
  );
});

test('injected adapter failure still releases and marks cleanup failure', async () => {
  let released = false;
  const adapters = {
    postgres: {
      acquire: async () => ({
        publicFacts: { profile: 'single' },
        privateHandle: {},
        release: async () => {
          released = true;
          throw new Error('cleanup exploded');
        },
      }),
    },
  };
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const plan = dbPlan('standard', { live: true, section: 'admission' });
  const result = await runVerification(plan, {
    repoRoot,
    adapters,
    runScenario: async () => ({
      status: 'PASS',
      reason: null,
      durationMs: 1,
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(released, true);
  assert.ok(result.report.cleanup.some((row) => row.status === 'FAIL'));
  assert.equal(result.exitCode, 1);
});

test('sibling sections continue after independent failure', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const plan = dbPlan('standard', { live: true });
  const adapters = {
    postgres: {
      acquire: async () => ({
        publicFacts: { profile: 'single' },
        privateHandle: {},
        release: async () => {},
      }),
    },
  };
  const result = await runVerification(plan, {
    repoRoot,
    adapters,
    runScenario: async ({ section }) => {
      if (section.id === 'source') {
        return { status: 'PASS', durationMs: 1 };
      }
      if (section.id === 'admission') {
        return { status: 'FAIL', reason: 'admission busted', durationMs: 1 };
      }
      return { status: 'PASS', durationMs: 1 };
    },
  });
  const admission = result.report.scenarios.filter(
    (row) => row.sectionId === 'admission',
  );
  assert.ok(admission.every((row) => row.status === 'FAIL'));
  const transactions = result.report.scenarios.filter(
    (row) => row.sectionId === 'transactions',
  );
  assert.ok(transactions.length > 0);
  assert.ok(transactions.every((row) => row.status === 'PASS'));
});

test('blocked dependencies after failed prerequisite', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const materialized = materializeExecutionPlan({
    subject: { kind: 'package', manifestName: '@offscreen/db' },
    profile: 'standard',
    live: false,
    mode: 'source',
    sections: [
      { id: 'source', tier: 'SOURCE', plannedStatus: 'PLANNED' },
      { id: 'admission', tier: 'LIVE', plannedStatus: 'NOT-RUN' },
    ],
  });
  assert.equal(materialized.ok, true);
  const result = await runVerification(materialized.plan, {
    repoRoot,
    runScenario: async ({ section }) => {
      if (section.id === 'source') {
        return { status: 'FAIL', reason: 'build failed', durationMs: 1 };
      }
      return { status: 'PASS', durationMs: 1 };
    },
  });
  const blocked = result.report.scenarios.filter(
    (row) => row.sectionId === 'admission',
  );
  assert.ok(blocked.every((row) => row.status === 'BLOCKED'));
});

test('runChildCommand maps timeout to public TIMEOUT', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const outcome = await runChildCommand(
    process.execPath,
    ['-e', 'setTimeout(() => {}, 5000)'],
    {
      cwd: repoRoot,
      timeoutMs: 50,
      run: (await import('../../../infra/verification/diagnostic-engine.mjs'))
        .runCommand,
    },
  );
  assert.equal(outcome.status, 'TIMEOUT');
  assert.equal(outcome.reasonCode, 'timeout');
});

test('all selected scenario ids are emitted', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const plan = dbPlan('source');
  const result = await runVerification(plan, { repoRoot });
  const ids = result.report.scenarios.map((row) => row.scenarioId).sort();
  assert.deepEqual(ids, ['DB-S01', 'DB-S02']);
});

test('interrupted run yields incomplete report', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const plan = dbPlan('source');
  const executed = await runVerification(plan, {
    repoRoot,
    runScenario: async ({ runContext }) => {
      runContext.interrupted = true;
      return {
        status: 'NOT-RUN',
        reason: 'interrupted',
        reasonCode: 'interrupted',
      };
    },
  });
  assert.equal(executed.report.complete, false);
  assert.equal(executed.report.scenarios[1]?.status, 'NOT-RUN');
});

test('malformed child results are sanitized and secrets excluded', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-exec-'));
  const plan = dbPlan('source');
  const result = await runVerification(plan, {
    repoRoot,
    runScenario: async () => ({
      status: 'WEIRD',
      reason: SECRET_SENTINEL,
      detail: 'raw stderr should not survive',
      durationMs: 5,
      childReportPath: 'https://evil.example/report.json',
    }),
  });
  assert.equal(result.report.scenarios[0].status, 'FAIL');
  assert.equal(reportContainsForbiddenSecrets(result.report), false);
  assert.ok(!JSON.stringify(result.report).includes('SUPERSECRET'));
});

test('acquireLiveResource refuses non-live context', async () => {
  await assert.rejects(
    async () =>
      acquireLiveResource(
        { kind: 'postgres', profile: 'single' },
        { live: false },
        {},
      ),
    /without --live/,
  );
});
