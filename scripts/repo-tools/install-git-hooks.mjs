#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const force = process.argv.includes('--force');
try {
  const root = git(['rev-parse', '--show-toplevel']);
  let current = '';
  try {
    current = git(['config', '--local', '--get', 'core.hooksPath'], root);
  } catch (error) {
    if (error.status !== 1) throw error; // unset is normal
  }
  if (current && current !== '.githooks' && !force) {
    console.error('Existing core.hooksPath ('+current+') preserved. To replace deliberately: pnpm repo:hooks:install -- --force');
    process.exitCode = 1;
  } else if (!existsSync(join(root, '.githooks', 'commit-msg'))) {
    console.error('Missing tracked .githooks/commit-msg; refusing installation.');
    process.exitCode = 1;
  } else {
    git(['config', '--local', 'core.hooksPath', '.githooks'], root);
    console.log('Installed repo-local commit-msg hook (.githooks). No global Git config changed.');
  }
} catch (error) {
  console.error('Cannot install Git hooks:', error.message);
  process.exitCode = 1;
}
