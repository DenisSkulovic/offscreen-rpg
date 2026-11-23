#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { markDevWatchedCompilation } from '../../infra/kubernetes/lab/dev/dev-watched-compilation-receipt.mjs';

const [role, entry, project] = process.argv.slice(2);
if (!role || !entry) {
  process.stderr.write('usage: dev-pod-compile-watch.mjs <role> <entry> [tsconfig]\n');
  process.exit(1);
}

const tscBase = ['exec', 'tsc', '--pretty', 'false', '--noEmitOnError'];
if (project) tscBase.push('-p', project);

function mark(phase) {
  markDevWatchedCompilation({
    phase,
    role,
    compiledEntryPath: entry,
    cwd: process.cwd(),
    environmentId: process.env.OFFSCREEN_DEV_SLOT,
  });
}

const first = spawnSync('pnpm', [...tscBase], { stdio: 'inherit' });
if (first.status !== 0) {
  mark('failure');
  process.exit(first.status ?? 1);
}
mark('success');

const runtime = spawn(
  process.execPath,
  ['--watch-path=dist', entry],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      OFFSCREEN_DEV_WATCHED_COMPILATION: '1',
      OFFSCREEN_DEV_COMPILED_ENTRY: resolve(process.cwd(), entry),
    },
  },
);

const watch = spawn('pnpm', [...tscBase, '--watch', '--preserveWatchOutput'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
watch.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  if (text.includes('error TS')) mark('failure');
  else if (text.includes('Found 0 errors')) mark('success');
});

function stop(code) {
  if (runtime.exitCode === null) runtime.kill('SIGTERM');
  if (watch.exitCode === null) watch.kill('SIGTERM');
  process.exit(code);
}
runtime.on('exit', (code) => stop(code ?? 1));
watch.on('exit', (code) => stop(code ?? 1));
