/**
 * Focused code-craft check for new/changed TypeScript in the current worktree.
 * No network, providers, or repository mutation. Existing untouched debt is excluded.
 *
 * pnpm repo:code-quality:changed --base undertaking/storyteller-workshop
 * pnpm repo:code-quality:changed --base undertaking/storyteller-workshop --list
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root } from './process.mjs';

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw Error(`${command} ${args.slice(0, 3).join(' ')}: ${result.stderr?.trim() || result.stdout?.trim() || 'failed'}`);
  }
  return result.stdout;
}
function git(args) { return run('git', args); }
function splitPaths(output) { return output.split('\0').filter(Boolean); }

export function selectChangedTypeScript(base, gitOutput, fileExists = existsSync) {
  const paths = new Set([
    ...splitPaths(gitOutput.committed),
    ...splitPaths(gitOutput.staged),
    ...splitPaths(gitOutput.unstaged),
    ...splitPaths(gitOutput.untracked),
  ]);
  return [...paths].filter(p =>
    !p.startsWith('../') &&
    !path.isAbsolute(p) &&
    !p.split('/').includes('..') &&
    /\.tsx?$/.test(p) &&
    fileExists(path.join(root, p))
  ).sort();
}

export function main(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--base');
  const base = index >= 0 ? argv[index + 1] : null;
  if (!base || argv.some((arg, i) => arg.startsWith('--') && arg !== '--base' && arg !== '--list')) {
    console.error('Usage: pnpm repo:code-quality:changed --base <integration-branch> [--list]');
    return 2;
  }
  try {
    // Require the named local ref. Do not silently fall back to main, origin or an old SHA.
    git(['rev-parse', '--verify', `refs/heads/${base}`]);
    const files = selectChangedTypeScript(base, {
      committed: git(['diff', '--name-only', '--diff-filter=ACMR', '-z', `refs/heads/${base}...HEAD`]),
      staged: git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']),
      unstaged: git(['diff', '--name-only', '--diff-filter=ACMR', '-z']),
      untracked: git(['ls-files', '--others', '--exclude-standard', '-z']),
    });
    if (argv.includes('--list')) {
      files.forEach(p => console.log(p));
      return 0;
    }
    if (files.length === 0) {
      console.log('Code quality: no changed TypeScript files.');
      return 0;
    }
    console.log(`Checking ${files.length} changed TypeScript files against ${base}`);
    const pnpmProgram = process.env.npm_execpath;
    if (!pnpmProgram) throw Error('Run via pnpm repo:code-quality:changed (npm_execpath missing)');
    const commands = [
      ['prettier', '--check', '--', ...files],
      ['eslint', '--config', 'eslint.quality.config.mjs', '--max-warnings', '0', '--', ...files],
    ];
    for (const cmd of commands) {
      const result = spawnSync(process.execPath, [pnpmProgram, 'exec', ...cmd], {
        cwd: root, encoding: 'utf8', shell: false, stdio: 'inherit',
      });
      if (result.error) throw result.error;
      if (result.status !== 0) return result.status ?? 1;
    }
    console.log('Changed-file formatting and quality lint PASS; typecheck/tests still required separately.');
    return 0;
  } catch (error) {
    console.error('Changed-file quality NOT VERIFIED:', error.message);
    return 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
