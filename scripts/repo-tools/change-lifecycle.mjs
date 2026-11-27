#!/usr/bin/env node
/**
 * Local Change join and worktree retirement.
 *
 * The lock is an exclusive flock(1) on
 * <git-common-dir>/offscreen-joins/<target>.lock. It covers one target ref:
 * the integration index, the merge, and any shared ledger write in that join.
 * It is not a service. Agents that bypass this command are not protected.
 *
 * node scripts/repo-tools/change-lifecycle.mjs integrate --change OBS-D02 \
 *   --target integration/observability-developer \
 *   --recorded-target integration/observability-developer \
 *   --integration-cwd <linked-target-checkout> --change-cwd <linked-change-checkout> \
 *   --design observability-developer --grandfather integration/observability-developer \
 *   --indispensable pass --design-acceptance pending --permit-source-join
 */
/* global console, process */
import { spawnSync } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedDesignTarget } from './change-branch-guard.mjs';

const SCRIPT = fileURLToPath(import.meta.url);

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
function flag(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
}
function flags(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name) values.push(args[index + 1] ?? '');
  }
  return values;
}
function refOk(value) {
  return (
    Boolean(value) &&
    /^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(value) &&
    !value.includes('..')
  );
}
function changeIdOk(value) {
  return /^[A-Za-z][A-Za-z0-9-]*$/.test(value ?? '');
}
function sleep(ms) {
  if (!ms) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function gitError(error) {
  return `${error.stderr ?? ''}`.trim() || error.message;
}
function isAncestor(ancestor, descendant, cwd) {
  try {
    git(['merge-base', '--is-ancestor', ancestor, descendant], cwd);
    return true;
  } catch {
    return false;
  }
}
function linked(cwd) {
  const gitDir = path.resolve(cwd, git(['rev-parse', '--git-dir'], cwd));
  const commonDir = path.resolve(
    cwd,
    git(['rev-parse', '--git-common-dir'], cwd),
  );
  return { gitDir, commonDir, linked: gitDir !== commonDir };
}
function cleanStatus(cwd) {
  return git(['status', '--porcelain'], cwd);
}
function branchName(cwd) {
  return git(['symbolic-ref', '--quiet', '--short', 'HEAD'], cwd);
}

export function joinLockPath(commonDir, target) {
  const safe = target.replace(/[^A-Za-z0-9._-]/g, '_');
  return path.join(commonDir, 'offscreen-joins', `${safe}.lock`);
}

export function assessJoin({
  recordedTarget,
  requestedTarget,
  design = null,
  grandfather = null,
  indispensable,
  designAcceptance = 'na',
  permitSourceJoin = false,
  designClosure = false,
  constituent = true,
}) {
  if (!refOk(recordedTarget) || !refOk(requestedTarget))
    return {
      allow: false,
      reason: 'Specify a recorded target and the requested target.',
    };
  if (requestedTarget !== recordedTarget)
    return {
      allow: false,
      reason: `Wrong integration target: requested ${requestedTarget}, recorded ${recordedTarget}.`,
    };
  if (indispensable !== 'pass')
    return {
      allow: false,
      reason: `Indispensable Change-level proof is ${indispensable ?? 'missing'}; integration is refused and the worktree stays.`,
    };
  const expected = expectedDesignTarget({ design, grandfather });
  if (design && constituent && requestedTarget === 'main')
    return {
      allow: false,
      reason: `Constituent Change cannot integrate into main. Design ${design} joins ${expected}; design-level closure owns main.`,
    };
  if (design && constituent && expected && requestedTarget !== expected)
    return {
      allow: false,
      reason: `Design ${design} integrates to ${expected}, not '${requestedTarget}'.`,
    };
  if (design && !constituent) {
    if (!designClosure)
      return {
        allow: false,
        reason:
          'Design closure is the only route that integrates an implementation branch.',
      };
    if (designAcceptance !== 'passed')
      return {
        allow: false,
        reason:
          'Design acceptance has not passed; final integration into main is refused.',
      };
    if (expected && requestedTarget === expected)
      return {
        allow: false,
        reason:
          'Design closure joins the implementation branch into main, not into itself.',
      };
    return { allow: true, mode: 'merge', reason: 'Design acceptance passed.' };
  }
  if (design && designAcceptance === 'pending' && !permitSourceJoin)
    return {
      allow: false,
      reason:
        'Design acceptance is pending and this design does not permit an isolated source join.',
    };
  if (design)
    return { allow: true, mode: 'merge', reason: 'Change-level gate passed.' };
  return {
    allow: true,
    mode: 'squash',
    reason: 'Standalone Change keeps the squash join.',
  };
}

function assertAssessment(options) {
  const verdict = assessJoin(options);
  if (!verdict.allow) throw Error(verdict.reason);
  return verdict;
}

function trace(tracePath, line) {
  if (tracePath) appendFileSync(tracePath, `${line}\n`);
}

function integrateUnlocked(options) {
  const verdict = assertAssessment(options);
  if (!changeIdOk(options.change) && options.constituent !== false)
    throw Error('Specify --change <Change ID>');
  if (!options.integrationCwd || !options.changeCwd)
    throw Error('Specify --integration-cwd and --change-cwd');
  const integration = linked(options.integrationCwd);
  const change = linked(options.changeCwd);
  if (!integration.linked || !change.linked)
    throw Error(
      'Primary checkout detected: join from linked worktrees; do not switch the user checkout.',
    );
  if (integration.commonDir !== change.commonDir)
    throw Error(
      'The Change worktree and the integration checkout are not the same repository.',
    );
  const integrationBranch = branchName(options.integrationCwd);
  if (integrationBranch !== options.requestedTarget)
    throw Error(
      `Integration checkout is on '${integrationBranch}', not '${options.requestedTarget}'.`,
    );
  const dirtyIntegration = cleanStatus(options.integrationCwd);
  if (dirtyIntegration)
    throw Error(
      `Integration checkout is dirty: ${dirtyIntegration.split('\n')[0]}`,
    );
  const sourceBranch = branchName(options.changeCwd);
  if (options.constituent === false) {
    const expected = expectedDesignTarget({
      design: options.design,
      grandfather: options.grandfather,
    });
    if (sourceBranch !== expected)
      throw Error(
        `Design closure integrates ${expected}, not '${sourceBranch}'.`,
      );
    if (sourceBranch.startsWith('change/'))
      throw Error(
        'Design closure integrates the implementation branch, not a constituent Change branch.',
      );
    const dirtySource = cleanStatus(options.changeCwd);
    if (dirtySource)
      throw Error(
        `Implementation checkout is dirty: ${dirtySource.split('\n')[0]}`,
      );
  } else {
    const prefix = `change/${options.change.toLowerCase()}-`;
    if (!sourceBranch.toLowerCase().startsWith(prefix))
      throw Error(
        `Expected dedicated ${prefix}<slug>, found '${sourceBranch}'.`,
      );
    const dirtyChange = cleanStatus(options.changeCwd);
    if (dirtyChange)
      throw Error(`Change worktree is dirty: ${dirtyChange.split('\n')[0]}`);
  }
  const previous = git(['rev-parse', 'HEAD'], options.integrationCwd);
  for (const ancestor of options.requireAncestors ?? []) {
    if (!isAncestor(ancestor, previous, options.integrationCwd))
      throw Error(
        `Predecessor ${ancestor.slice(0, 12)} is not on ${options.requestedTarget}. Use the latest target that contains it.`,
      );
  }
  trace(options.tracePath, `${process.pid} enter`);
  sleep(options.holdMs ?? 0);
  const sourceSha = git(['rev-parse', 'HEAD'], options.changeCwd);
  try {
    if (verdict.mode === 'squash') {
      git(['merge', '--squash', sourceBranch], options.integrationCwd);
      const staged = git(
        ['diff', '--cached', '--name-only'],
        options.integrationCwd,
      );
      if (staged) {
        git(
          [
            'commit',
            '-m',
            `integrate(${options.change}): squash ${sourceBranch} onto ${options.requestedTarget}`,
          ],
          options.integrationCwd,
        );
      }
    } else if (!isAncestor(sourceSha, previous, options.integrationCwd)) {
      git(
        [
          'merge',
          '--no-ff',
          '--no-edit',
          '-m',
          `merge(${options.change ?? options.design}): integrate ${sourceBranch} into ${options.requestedTarget}`,
          sourceBranch,
        ],
        options.integrationCwd,
      );
    }
  } catch (error) {
    try {
      git(['merge', '--abort'], options.integrationCwd);
    } catch {
      /* no merge in progress */
    }
    throw new Error(
      `Join refused: merge failed and was aborted. ${gitError(error)}`,
      { cause: error },
    );
  }
  if (options.ledgerAppend) {
    const ledger = path.join(
      options.integrationCwd,
      options.ledgerFile ?? 'LEDGER',
    );
    const current = existsSync(ledger) ? readFileSync(ledger, 'utf8') : '';
    sleep(options.holdMs ?? 0);
    writeFileSync(ledger, `${current}${options.ledgerAppend}\n`);
    git(['add', '--', path.basename(ledger)], options.integrationCwd);
    git(
      [
        'commit',
        '-m',
        `ledger(${options.change ?? options.design}): record join`,
      ],
      options.integrationCwd,
    );
  }
  const targetSha = git(['rev-parse', 'HEAD'], options.integrationCwd);
  if (!isAncestor(previous, targetSha, options.integrationCwd))
    throw Error(
      'Join moved the target off its previous revision. Refusing to continue.',
    );
  if (
    verdict.mode === 'merge' &&
    !isAncestor(sourceSha, targetSha, options.integrationCwd)
  )
    throw Error('Join did not retain the Change revision on the target.');
  trace(options.tracePath, `${process.pid} leave`);
  return {
    mode: verdict.mode,
    previous,
    targetSha,
    sourceSha,
    sourceBranch,
    target: options.requestedTarget,
  };
}

function runLocked(options, relay) {
  const probe = options.integrationCwd ?? options.repoCwd ?? options.cwd;
  const { commonDir } = linked(probe);
  const lock = joinLockPath(
    commonDir,
    options.requestedTarget ?? options.target,
  );
  mkdirSync(path.dirname(lock), { recursive: true });
  const child = spawnSync(
    'flock',
    ['-x', '-w', '60', lock, process.execPath, SCRIPT, ...relay],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        OFFSCREEN_JOIN_LOCK_HELD: options.requestedTarget ?? options.target,
      },
    },
  );
  if (child.error) throw child.error;
  if (child.status !== 0)
    throw Error((child.stderr || child.stdout || 'join failed').trim());
  return JSON.parse(child.stdout);
}

export function integrateChange(options) {
  const normalized = {
    constituent: true,
    designAcceptance: 'na',
    permitSourceJoin: false,
    designClosure: false,
    requireAncestors: [],
    ...options,
    requestedTarget: options.requestedTarget ?? options.target,
  };
  if (process.env.OFFSCREEN_JOIN_LOCK_HELD === normalized.requestedTarget)
    return integrateUnlocked(normalized);
  return runLocked(normalized, [
    'integrate',
    '--json',
    JSON.stringify(normalized),
    '--lock-held',
  ]);
}

export function ensureDesignImplementationBranch({
  cwd,
  design,
  base = 'main',
  grandfather = null,
}) {
  const name = expectedDesignTarget({ design, grandfather });
  if (!name) throw Error('Specify --design <slug>');
  if (!refOk(base) && !/^[0-9a-f]{7,40}$/i.test(base))
    throw Error('Specify --base <branch or sha>');
  const baseSha = git(['rev-parse', '--verify', base], cwd);
  try {
    git(['rev-parse', '--verify', `refs/heads/${name}`], cwd);
    return {
      branch: name,
      created: false,
      sha: git(['rev-parse', `refs/heads/${name}`], cwd),
    };
  } catch {
    if (grandfather)
      throw Error(
        `Grandfathered ref ${name} does not exist. Do not invent a replacement branch.`,
      );
    git(['branch', name, baseSha], cwd);
    return {
      branch: name,
      created: true,
      sha: git(['rev-parse', `refs/heads/${name}`], cwd),
    };
  }
}

export function retireChangeWorktree({
  repoCwd,
  changeCwd,
  target,
  branch,
  landedSha = null,
}) {
  if (!refOk(target)) throw Error('Specify --target <integration branch>');
  const info = linked(changeCwd);
  if (!info.linked)
    throw Error('Primary checkout detected: do not retire the user checkout.');
  const dirty = cleanStatus(changeCwd);
  if (dirty)
    throw Error(`Dirty worktree cannot be retired: ${dirty.split('\n')[0]}`);
  const head = git(['rev-parse', 'HEAD'], changeCwd);
  const targetSha = git(
    ['rev-parse', '--verify', `refs/heads/${target}`],
    repoCwd,
  );
  const merged = isAncestor(head, targetSha, repoCwd);
  const squashLanded =
    Boolean(landedSha) &&
    isAncestor(landedSha, targetSha, repoCwd) &&
    git(['rev-parse', `${landedSha}^{tree}`], repoCwd) ===
      git(['rev-parse', 'HEAD^{tree}'], changeCwd);
  if (!merged && !squashLanded)
    throw Error('Unintegrated worktree cannot be retired.');
  const actual = branchName(changeCwd);
  if (branch && actual !== branch)
    throw Error(`Expected to retire ${branch}, found ${actual}.`);
  git(['worktree', 'remove', changeCwd], repoCwd);
  // Delete that exact ref. `branch -d` only looks at the current checkout, which is often main
  // while this Change landed on the design implementation branch. The ancestor or tree check above
  // is the custody proof; the old value stops a moved ref from being deleted.
  git(['update-ref', '-d', `refs/heads/${actual}`, head], repoCwd);
  return { retired: actual, target, targetSha };
}

function jsonOptions(args) {
  const raw = flag(args, '--json');
  if (!raw) return null;
  return JSON.parse(raw);
}

function print(value) {
  console.log(JSON.stringify(value));
}

export function main(args = process.argv.slice(2)) {
  try {
    const command = args[0];
    if (command === 'integrate') {
      const decoded = jsonOptions(args);
      if (decoded) {
        if (process.env.OFFSCREEN_JOIN_LOCK_HELD !== decoded.requestedTarget)
          throw Error('Refusing to integrate without the target lock.');
        print(integrateChange(decoded));
        return 0;
      }
      const options = {
        change: flag(args, '--change'),
        target: flag(args, '--target'),
        recordedTarget: flag(args, '--recorded-target'),
        integrationCwd: flag(args, '--integration-cwd'),
        changeCwd: flag(args, '--change-cwd'),
        design: flag(args, '--design'),
        grandfather: flag(args, '--grandfather'),
        indispensable: flag(args, '--indispensable'),
        designAcceptance: flag(args, '--design-acceptance') ?? 'na',
        permitSourceJoin: args.includes('--permit-source-join'),
        designClosure: args.includes('--design-closure'),
        constituent: !args.includes('--design-closure'),
        requireAncestors: flags(args, '--require-ancestor').filter(Boolean),
        holdMs: Number(flag(args, '--hold-ms') ?? 0),
        tracePath: flag(args, '--trace'),
        ledgerAppend: flag(args, '--ledger-append'),
      };
      print(integrateChange(options));
      return 0;
    }
    if (command === 'ensure-branch') {
      print(
        ensureDesignImplementationBranch({
          cwd: flag(args, '--cwd') ?? process.cwd(),
          design: flag(args, '--design'),
          base: flag(args, '--base') ?? 'main',
          grandfather: flag(args, '--grandfather'),
        }),
      );
      return 0;
    }
    if (command === 'retire') {
      print(
        retireChangeWorktree({
          repoCwd: flag(args, '--repo-cwd') ?? process.cwd(),
          changeCwd: flag(args, '--change-cwd'),
          target: flag(args, '--target'),
          branch: flag(args, '--branch'),
          landedSha: flag(args, '--landed-sha'),
        }),
      );
      return 0;
    }
    console.error(
      'Usage: change-lifecycle.mjs <integrate|ensure-branch|retire> [flags]',
    );
    return 2;
  } catch (error) {
    console.error(`CHANGE LIFECYCLE BLOCKED: ${error.message}`);
    return 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = main();
