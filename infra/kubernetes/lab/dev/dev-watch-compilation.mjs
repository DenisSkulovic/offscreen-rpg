#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { markDevWatchedCompilation } from './dev-watched-compilation-receipt.mjs';

const [phase, role, compiledEntryPath] = process.argv.slice(2);
if (!phase || !role || !compiledEntryPath) {
  process.stderr.write(
    'usage: dev-watch-compilation.mjs <success|failure> <role> <compiled-entry-path>\n',
  );
  process.exitCode = 1;
} else if (phase === 'failure') {
  markDevWatchedCompilation({ phase: 'failure', role, compiledEntryPath });
} else if (phase === 'success') {
  markDevWatchedCompilation({ phase: 'success', role, compiledEntryPath });
  const result = spawnSync(
    process.execPath,
    ['--env-file-if-exists=../../.env', compiledEntryPath],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        OFFSCREEN_DEV_WATCHED_COMPILATION: '1',
      },
    },
  );
  process.exit(result.status ?? 1);
} else {
  process.stderr.write(`unknown phase: ${phase}\n`);
  process.exitCode = 1;
}