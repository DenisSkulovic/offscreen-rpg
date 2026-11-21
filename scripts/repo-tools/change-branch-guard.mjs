#!/usr/bin/env node
/**
 * Zero-provider, read-only pre-edit check for a commissioned implementation Change.
 * Run before handing a T-ID to Cursor children. This is NOT a Git hook and does
 * not protect against agents which bypass it.
 *
 * node scripts/repo-tools/change-branch-guard.mjs --change WR03 --target undertaking/storyteller-workshop
 * Add --resume only when the integration target has advanced since the Change branched.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function flag(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1] ?? null;
}
export function checkChangeBranch({ cwd, change, target, resume = false }) {
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(change ?? ''))
    throw Error('Specify --change <Change ID>, e.g. WR03');
  if (!target || !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(target) || target.includes('..'))
    throw Error('Specify --target <actual reference branch>; do not assume main');
  // A dedicated branch in the primary checkout is NOT filesystem isolation.
  // Linked worktrees have a per-worktree git-dir distinct from the common dir.
  const gitDir = path.resolve(cwd, git(['rev-parse', '--git-dir'], cwd));
  const commonDir = path.resolve(cwd, git(['rev-parse', '--git-common-dir'], cwd));
  if (gitDir === commonDir) throw Error('Primary checkout detected: create a separate linked worktree; do not switch the user checkout.');
  const actual = git(['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd);
  const prefix = `change/${change.toLowerCase()}-`;
  if (!actual.toLowerCase().startsWith(prefix) || actual.length <= prefix.length)
    throw Error(`Expected dedicated ${prefix}<slug>, found '${actual}'. Do not edit the shared integration branch.`);
  if (actual === target) throw Error('Change branch must differ from integration target');
  const sha = git(['rev-parse', '--verify', 'HEAD'], cwd);
  const targetSha = git(['rev-parse', '--verify', `refs/heads/${target}`], cwd);
  const base = git(['merge-base', 'HEAD', `refs/heads/${target}`], cwd);
  if (!resume && base !== targetSha)
    throw Error(`Integration branch moved or Change branch started from a stale/wrong base (merge-base ${base.slice(0, 12)}, target ${targetSha.slice(0, 12)}). Reconcile the actual branch before new edits; never reset blindly. Use --resume only after reviewing target drift.`);
  return { branch: actual, sha, target, targetSha, base, targetAdvanced: base !== targetSha };
}
export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  try {
    const result = checkChangeBranch({
      cwd, change: flag(args, '--change'), target: flag(args, '--target'), resume: args.includes('--resume'),
    });
    console.log(`CHANGE BRANCH OK: ${result.branch} → ${result.target} | HEAD ${result.sha.slice(0, 12)}`);
    if (result.targetAdvanced) console.log('WARNING: reference branch has advanced; verify affected contracts and shared-file ownership before editing or integrating.');
    return 0;
  } catch (error) {
    console.error(`CHANGE BRANCH BLOCKED: ${error.message}`);
    return 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
