#!/usr/bin/env node
// Reachable production workspaces from one app manifest (runtime closure adapter).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { workspaceClosure } from '../common/workspace-graph.mjs';

export function productionWorkspaceClosure(root, appPath) {
  return workspaceClosure(root, appPath, { mode: 'runtime' });
}

function isCli() {
  const invoked = process.argv[1];
  if (!invoked) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
}

if (isCli()) {
  const appPath = process.argv[2];
  if (!appPath || process.argv.length !== 3) {
    console.error('usage: production-workspace-closure.mjs <app-path>');
    process.exit(2);
  }
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
  );
  try {
    const closure = productionWorkspaceClosure(root, appPath);
    process.stdout.write(`${closure.join('\n')}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}