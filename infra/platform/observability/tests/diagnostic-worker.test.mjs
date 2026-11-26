import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import {
  OBSERVABILITY_SUPERVISOR_MS,
  OBSERVABILITY_WORKER_BUDGET_MS,
  clampCommandTimeoutMs,
  createObservabilityDiagnosticBudget,
  runObservabilityDiagnosticSubprocess,
  runObservabilityDiagnosticWorker,
} from '../../../verification/diagnostic-live.mjs';
import { runCommand } from '../../../verification/diagnostic-engine.mjs';
import { evaluateObservationReceipt } from '../receipt.mjs';

const repoRoot = resolve(join(import.meta.dirname, '../../../../'));

test('clampCommandTimeoutMs enforces absolute deadline', () => {
  assert.equal(clampCommandTimeoutMs(20_000, 15_000, 5_000), 5_000);
  assert.equal(clampCommandTimeoutMs(0, 15_000, 20_000), 0);
});

test('fake clock clamps preflight and inventory timeouts', () => {
  let current = 0;
  const now = () => current;
  const budget = createObservabilityDiagnosticBudget({ now });
  assert.equal(budget.clampPreflight(), 15_000);
  current = budget.preflightDeadline - 5_000;
  assert.equal(budget.clampPreflight(), 5_000);
  current = budget.workerDeadline - 1;
  assert.equal(budget.remainingAbsolute(), 1);
  assert.equal(budget.clampInventory(), 0);
  current = budget.workerDeadline;
  assert.equal(budget.clampPreflight(), 0);
});

test('worker deadline exhaustion fails before observation', () => {
  let calls = 0;
  const late = runObservabilityDiagnosticWorker(
    'release',
    {},
    {
      now: () => {
        calls += 1;
        return calls === 1 ? 0 : OBSERVABILITY_WORKER_BUDGET_MS + 1;
      },
      observe: () => {
        throw new Error('must not observe after deadline');
      },
    },
  );
  assert.equal(late.receipt.reasonCode, 'deadline');
  assert.equal(late.exitCode, 1);
});

test('cleanup failure in worker observation yields unreadable receipt', () => {
  const worker = runObservabilityDiagnosticWorker(
    'dev',
    {},
    {
      observe: () => ({
        state: 'unreadable',
        reasonCode: 'cleanup-failed',
        pending: false,
        detail: 'cleanup failed',
      }),
    },
  );
  assert.equal(worker.receipt.ok, false);
  assert.equal(worker.receipt.reasonCode, 'cleanup-failed');
});

test('supervisor timeout rejects valid-looking worker receipt', () => {
  const stdout = `${JSON.stringify({
    schema: 1,
    operation: 'status',
    ok: true,
    state: 'ready',
    reasonCode: 'ready',
    mutation: 'none',
    completedPhases: [],
    pending: false,
  })}\n`;
  const mapped = evaluateObservationReceipt(
    {
      code: 0,
      stdout,
      stderr: '',
      reason: 'timeout',
      signal: 'SIGKILL',
    },
    { allowAbsent: false },
  );
  assert.equal(mapped.status, 'FAIL');
});

test('linux process-group cancellation leaves no surviving descendant', async (t) => {
  if (process.platform === 'win32') {
    t.skip('process group cancellation requires Linux');
  }
  const marker = `obs-worker-${process.pid}`;
  const result = await runCommand(
    process.execPath,
    ['-e', "process.on('SIGTERM',()=>{});setInterval(()=>{},50);"],
    { timeoutMs: 150 },
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  const processes = execSync('ps -eo args=', { encoding: 'utf8' });
  assert.equal(result.reason, 'timeout');
  assert.equal(processes.includes('setInterval(()=>{},50)'), false);
  assert.ok(marker.length > 0);
  assert.ok(
    OBSERVABILITY_SUPERVISOR_MS >= OBSERVABILITY_WORKER_BUDGET_MS + 15_000,
  );
});

test('diagnostic-live supervisor uses 360s budget constant', () => {
  assert.equal(OBSERVABILITY_SUPERVISOR_MS, 360_000);
  assert.equal(OBSERVABILITY_WORKER_BUDGET_MS, 345_000);
});

test('observability subprocess entrypoint remains bounded', async (t) => {
  if (process.platform === 'win32') {
    t.skip('subprocess budget fixture requires Linux');
  }
  const result = await runObservabilityDiagnosticSubprocess(
    repoRoot,
    ['release', 'observability'],
    { timeoutMs: 50 },
  );
  assert.equal(result.reason, 'timeout');
});
