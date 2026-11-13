/**
 * Cheap Lab scenario runner — no Nest/DB/Temporal/Next/browser.
 *
 * Usage: pnpm chamber:scenario -- <scenarioId> [--lane=bench-policy] [--seed=N]
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

  const lab = createLabWorkbenchService({
    gitCommit: 'local-cli',
    dirty: true,
  });

  if (args.list) {
    process.stdout.write(
      `${JSON.stringify(
        {
          lane: args.lane,
          scenarios: lab.listScenarios(),
          commands: lab.listCommands(),
        },
        null,
        2,
      )}\n`,
    );
    return args.scenarioId === 'list' ? 0 : 2;
  }

  const started = performance.now();
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
    await lab.command({
      ownerId: 'cli-local',
      runId: opened.runId,
      command: { kind: 'inspect', facets: ['summary', 'clock', 'items'] },
    });
    const finalized = await lab.command({
      ownerId: 'cli-local',
      runId: opened.runId,
      command: { kind: 'finalize' },
    });
    const elapsedMs = Math.round(performance.now() - started);
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          runId: opened.runId,
          scenarioId: args.scenarioId,
          lane: args.lane,
          seed: args.seed,
          replayCommand:
            finalized.kind === 'finalize' ? finalized.replayCommand : null,
          elapsedMs,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - started);
    const message =
      error instanceof LabWorkbenchError || error instanceof LauncherFlagError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    process.stdout.write(
      `${JSON.stringify({ ok: false, error: message, elapsedMs }, null, 2)}\n`,
    );
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
