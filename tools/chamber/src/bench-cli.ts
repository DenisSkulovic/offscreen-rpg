/**
 * Fast Chamber Bench CLI. Does not boot Nest/DB/Temporal/Next/browser.
 *
 * Usage: pnpm chamber:bench -- <scenarioId> [--seed=N] [--version=N]
 */
import { listBenchScenarios, runBenchScenario } from './lab/bench.js';

function readFlag(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function main(argv: string[]): number {
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const scenarioId = positional[0];
  if (!scenarioId || scenarioId === 'list') {
    const listed = listBenchScenarios();
    process.stdout.write(
      `${JSON.stringify({ lane: 'bench-policy', scenarios: listed }, null, 2)}\n`,
    );
    return scenarioId ? 0 : 2;
  }

  const seedRaw = readFlag(argv, 'seed');
  const versionRaw = readFlag(argv, 'version');
  const seed = seedRaw === undefined ? 141 : Number(seedRaw);
  const version = versionRaw === undefined ? 1 : Number(versionRaw);
  if (!Number.isInteger(seed) || !Number.isInteger(version) || version < 1) {
    process.stderr.write('Invalid --seed or --version\n');
    return 2;
  }

  const started = performance.now();
  const result = runBenchScenario({ scenarioId, version, seed });
  const elapsedMs = Math.round(performance.now() - started);
  process.stdout.write(
    `${JSON.stringify({ ...result, elapsedMs }, null, 2)}\n`,
  );
  return result.ok ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
