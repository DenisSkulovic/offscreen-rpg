#!/usr/bin/env node
import { evaluateDevLoadedRuntimeReadiness } from './dev-watched-compilation-receipt.mjs';

const [role, compiledEntryPath] = process.argv.slice(2);
if (!role || !compiledEntryPath) {
  process.stderr.write(
    'usage: dev-loaded-runtime-status.mjs <role> <compiled-entry-path>\n',
  );
  process.exitCode = 1;
} else {
  const status = evaluateDevLoadedRuntimeReadiness({ role, compiledEntryPath });
  process.stdout.write(`${JSON.stringify(status)}\n`);
  process.exitCode = status.ready ? 0 : 1;
}