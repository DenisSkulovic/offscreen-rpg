import { performance } from 'node:perf_hooks';

import { runChildCommand } from '../../../../runner/execute.mjs';

/**
 * @param {{ repoRoot: string, run?: Function }} input
 */
export async function ensureDbPackageBuilt(input) {
  const started = performance.now();
  const outcome = await runChildCommand(
    'pnpm',
    ['-w', 'exec', 'turbo', 'run', 'build', '--filter=@offscreen/db...'],
    {
      cwd: input.repoRoot,
      timeoutMs: 120_000,
      run: input.run,
    },
  );
  return {
    ...outcome,
    reasonCode: outcome.reasonCode ?? outcome.reason ?? 'build-failed',
    durationMs:
      typeof outcome.durationMs === 'number' && outcome.durationMs > 0
        ? outcome.durationMs
        : Math.max(0, Math.floor(performance.now() - started)),
  };
}

/**
 * @param {{ scenarioId: string, repoRoot: string, run?: Function }} input
 */
export async function runSourceScenario(input) {
  const { scenarioId, repoRoot } = input;
  if (scenarioId === 'DB-S02') {
    return {
      status: 'NOT-RUN',
      reason: 'frozen-registry-check-not-in-t01',
      reasonCode: 'not-implemented-scenario',
      durationMs: 0,
    };
  }
  if (scenarioId !== 'DB-S01') {
    return {
      status: 'NOT-RUN',
      reason: 'unknown-scenario',
      reasonCode: 'unknown-scenario',
      durationMs: 0,
    };
  }

  const buildOutcome = await ensureDbPackageBuilt({
    repoRoot,
    run: input.run,
  });
  if (buildOutcome.status !== 'PASS') {
    return {
      ...buildOutcome,
      reasonCode:
        buildOutcome.reasonCode ?? buildOutcome.reason ?? 'build-failed',
    };
  }

  const started = performance.now();
  const testOutcome = await runChildCommand(
    'pnpm',
    ['--filter', '@offscreen/db', 'test'],
    {
      cwd: repoRoot,
      timeoutMs: 120_000,
      run: input.run,
    },
  );
  return {
    ...testOutcome,
    reasonCode: testOutcome.reasonCode ?? testOutcome.reason,
    durationMs:
      typeof testOutcome.durationMs === 'number' && testOutcome.durationMs > 0
        ? testOutcome.durationMs
        : Math.max(0, Math.floor(performance.now() - started)),
  };
}
