import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const root = path.resolve(import.meta.dirname, '..', '..');

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} exited with ${result.status}`);
  }
  return options.capture ? result.stdout.trim() : '';
}

/** Reuse the pnpm program that launched the root script; avoids .cmd spawning quirks on Windows. */
export function runPnpm(args, options = {}) {
  const pnpmProgram = process.env.npm_execpath;
  if (!pnpmProgram) {
    throw new Error(
      'Run this helper through its documented pnpm root command.',
    );
  }
  return run(process.execPath, [pnpmProgram, ...args], options);
}

/** Tests and maintenance never inherit credentials or a live-execution opt-in. */
export function providerFreeEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  delete environment.OPENROUTER_API_KEY;
  delete environment.STORYTELLER_EXECUTION_JSON;
  environment.STORYTELLER_LIVE_ENABLED = 'false';
  return environment;
}

export function dockerExecutable() {
  const candidates =
    process.platform === 'win32'
      ? [
          'docker.exe',
          'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
        ]
      : ['docker'];
  for (const candidate of candidates) {
    const found = spawnSync(
      candidate,
      ['version', '--format', '{{.Client.Version}}'],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        shell: false,
      },
    );
    if (!found.error && found.status === 0) return candidate;
    if (path.isAbsolute(candidate) && !existsSync(candidate)) continue;
  }
  throw new Error(
    'Docker CLI was not found. See docs/development.md#local-dependencies before repairing Docker Desktop.',
  );
}

export function fail(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
