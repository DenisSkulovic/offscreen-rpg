/**
 * Cheap Lab inspect/evidence CLI — no Nest/DB/browser.
 *
 * Usage: pnpm chamber:inspect -- <scenarioId> [--seed=N] [--lane=bench-policy]
 */
import {
  createLabWorkbenchService,
  LabWorkbenchError,
} from '@offscreen/application/developer-tools';
import { LauncherFlagError, parseLabCliArgs } from './modes/cli-flags.js';

async function main(argv: string[]): Promise<number> {
  let args;
  try {
    args = parseLabCliArgs(argv);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  }

  if (args.list) {
    process.stderr.write(
      'Usage: chamber:inspect -- <scenarioId> [--seed=N] [--lane=bench-policy]\n',
    );
    return 2;
  }

  const lab = createLabWorkbenchService({
    gitCommit: 'local-cli',
    dirty: true,
  });
  try {
    const opened = lab.open({
      ownerId: 'cli-local',
      scenarioId: args.scenarioId!,
      scenarioVersion: args.version,
      lane: args.lane,
      seed: args.seed,
    });
    await lab.command({
      ownerId: 'cli-local',
      runId: opened.runId,
      command: { kind: 'load' },
    });
    const inspected = await lab.command({
      ownerId: 'cli-local',
      runId: opened.runId,
      command: {
        kind: 'inspect',
        facets: ['summary', 'clock', 'items', 'activity'],
      },
    });
    const finalized = await lab.command({
      ownerId: 'cli-local',
      runId: opened.runId,
      command: { kind: 'finalize' },
    });
    const observation =
      inspected.kind === 'step' ? inspected.result?.observation ?? null : null;
    const evidence =
      finalized.kind === 'finalize' && finalized.capsule
        ? {
            evidenceId: finalized.capsule.evidenceId,
            replayCommand: finalized.replayCommand,
            markdown: finalized.markdown,
          }
        : null;
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          runId: opened.runId,
          observation,
          evidence,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  } catch (error) {
    const message =
      error instanceof LabWorkbenchError || error instanceof LauncherFlagError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`);
    return 1;
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  },
);
