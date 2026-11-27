#!/usr/bin/env node
/**
 * Local fail-closed affected scope selection (DX12).
 * T01: pure scope classifier + plan JSON; no Turbo execution.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { isDocsPath } from './ci-change-scope.mjs';

const ALLOWED_TASKS = ['build', 'typecheck', 'test', 'test:fast'];
const DEFAULT_TASKS = ['build', 'typecheck', 'test'];

const ROOT_GLOBAL_EXACT = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.node-version',
  '.npmrc',
]);

function normalize(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function isRootGlobalInput(filePath) {
  const p = normalize(filePath);
  if (ROOT_GLOBAL_EXACT.has(p)) return true;
  if (/^tsconfig[^/]*\.json$/.test(p)) return true;
  if (/^eslint[^/]*\.mjs$/.test(p)) return true;
  if (p.startsWith('packages/config/')) return true;
  if (p.startsWith('.github/workflows/')) return true;
  if (p.startsWith('scripts/repo-tools/') && !isDocsPath(p)) return true;
  return false;
}

const GROUPED_PACKAGE_FAMILIES = 'domain|ai|commerce|platform|foundation';

export function isWorkspacePackageManifest(filePath) {
  const p = normalize(filePath);
  return new RegExp(
    `^(?:(?:apps|tools)/[^/]+|packages/(?:[^/]+|(?:${GROUPED_PACKAGE_FAMILIES})/[^/]+))/package\\.json$`,
  ).test(p);
}

export function isWorkspaceSourcePath(filePath) {
  const p = normalize(filePath);
  return (
    p.startsWith('apps/') ||
    p.startsWith('packages/') ||
    p.startsWith('tools/')
  );
}

/**
 * @param {string} filePath
 * @returns {'docs' | 'root-global' | 'workspace' | 'unknown'}
 */
export function classifyChangedPath(filePath) {
  const p = normalize(filePath);
  if (!p) {
    throw new Error(`STOP: safe path classification undefined for empty path`);
  }
  if (isDocsPath(p)) return 'docs';
  if (isRootGlobalInput(p)) return 'root-global';
  if (isWorkspaceSourcePath(p)) return 'workspace';
  return 'unknown';
}

/**
 * @param {object} input
 * @param {string[]} input.changedPaths
 * @param {boolean|string} [input.dirty]
 * @param {boolean} [input.baseIsAncestor]
 * @param {boolean|string|string[]} [input.missingRefs]
 * @param {string[]} [input.deletedPaths]
 * @param {{from: string, to: string}[]} [input.renamedPaths]
 */
export function decideAffectedScope({
  changedPaths,
  dirty = false,
  baseIsAncestor = true,
  missingRefs = false,
  deletedPaths = [],
  renamedPaths = [],
}) {
  if (missingRefs) {
    const reason =
      typeof missingRefs === 'string'
        ? missingRefs
        : Array.isArray(missingRefs)
          ? `missing git refs: ${missingRefs.join(', ')}`
          : 'missing git refs';
    return scopeResult('full', reason, []);
  }
  if (dirty) {
    const reason = typeof dirty === 'string' ? dirty : 'dirty or untracked worktree';
    return scopeResult('full', reason, []);
  }
  if (baseIsAncestor === false) {
    return scopeResult('full', 'base is not an ancestor of head', []);
  }

  const paths = [...new Set(changedPaths.map(normalize).filter(Boolean))];

  if (paths.length === 0) {
    return scopeResult('empty', 'clean diff', paths);
  }

  if (deletedPaths.some((p) => isWorkspacePackageManifest(p))) {
    return scopeResult('full', 'deleted package manifest', paths);
  }

  if (
    renamedPaths.some(
      (pair) =>
        isWorkspacePackageManifest(pair.from) ||
        isWorkspacePackageManifest(pair.to),
    )
  ) {
    return scopeResult('full', 'package rename', paths);
  }

  const kinds = paths.map((p) => classifyChangedPath(p));

  if (kinds.some((k) => k === 'root-global')) {
    return scopeResult('full', 'root or global toolchain input changed', paths);
  }
  if (kinds.some((k) => k === 'unknown')) {
    return scopeResult('full', 'unknown non-doc path outside workspace packages', paths);
  }
  if (kinds.every((k) => k === 'docs')) {
    return scopeResult('docs-only', 'documentation-only change', paths);
  }
  if (kinds.some((k) => k === 'workspace')) {
    return scopeResult('affected', 'workspace source change', paths);
  }

  throw new Error(
    `STOP: safe path classification undefined for paths: ${paths.join(', ')}`,
  );
}

/**
 * @param {'full' | 'docs-only' | 'affected' | 'empty'} mode
 * @param {string} reason
 * @param {string[]} paths
 */
function scopeResult(mode, reason, paths) {
  return { mode, reason, paths };
}

/**
 * @param {object} options
 * @param {string[]} options.tasks
 * @param {boolean} options.affected
 * @param {boolean} [options.dryJson]
 */
export function buildPnpmTurboArgs({ tasks, affected, dryJson = false }) {
  const args = ['exec', 'turbo', 'run', ...tasks];
  if (affected) args.push('--affected');
  if (dryJson) args.push('--dry=json');
  return args;
}

/**
 * @param {boolean} dryJson
 */
export function isTurboDryPlanInvocation(args, dryJson = true) {
  return dryJson ? args.includes('--dry=json') : !args.includes('--dry=json');
}

/**
 * @param {string} stdout
 */
export function parseTurboDryRunJson(stdout) {
  const trimmed = String(stdout ?? '').trim();
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart === -1) {
    return { ok: false, error: 'turbo dry-run output missing json object' };
  }
  try {
    const data = JSON.parse(trimmed.slice(jsonStart));
    const graphTasks = Array.isArray(data.tasks) ? data.tasks : [];
    const taskIds = graphTasks.map((task) => task.taskId).filter(Boolean);
    const packages = [
      ...new Set(graphTasks.map((task) => task.package).filter(Boolean)),
    ].sort();
    const selectedTaskIds = [...taskIds].sort();
    return {
      ok: true,
      taskIds: selectedTaskIds,
      packages,
      summary: {
        taskCount: selectedTaskIds.length,
        packages,
      },
    };
  } catch {
    return { ok: false, error: 'malformed turbo dry-run json' };
  }
}

/**
 * @param {object} options
 * @param {string[]} options.tasks
 * @param {'affected' | 'full'} options.turboMode
 * @param {string} options.resolvedBase
 * @param {string} options.resolvedHead
 * @param {(command: string, args: string[], opts: object) => object} options.invoke
 * @param {string} [options.cwd]
 */
export function queryTurboDryGraph({
  tasks,
  turboMode,
  resolvedBase,
  resolvedHead,
  invoke,
  cwd = process.cwd(),
}) {
  const affected = turboMode === 'affected';
  const args = buildPnpmTurboArgs({ tasks, affected, dryJson: true });
  const env =
    turboMode === 'affected'
      ? {
          ...process.env,
          TURBO_SCM_BASE: resolvedBase,
          TURBO_SCM_HEAD: resolvedHead,
        }
      : process.env;

  const result = invoke('pnpm', args, { cwd, encoding: 'utf8', env });
  if (!result.ok) {
    return {
      ok: false,
      turboMode,
      args,
      envKeys:
        turboMode === 'affected'
          ? { TURBO_SCM_BASE: resolvedBase, TURBO_SCM_HEAD: resolvedHead }
          : null,
      error: result.stderr?.trim() || result.message || 'turbo dry-run failed',
      parsed: null,
    };
  }

  const parsed = parseTurboDryRunJson(result.stdout);
  return {
    ok: parsed.ok,
    turboMode,
    args,
    envKeys:
      turboMode === 'affected'
        ? { TURBO_SCM_BASE: resolvedBase, TURBO_SCM_HEAD: resolvedHead }
        : null,
    error: parsed.ok ? null : parsed.error,
    parsed: parsed.ok ? parsed : null,
  };
}

/**
 * @param {object} options
 * @param {'full' | 'docs-only' | 'affected' | 'empty'} options.classifierMode
 * @param {string[]} options.tasks
 * @param {string} options.resolvedBase
 * @param {string} options.resolvedHead
 * @param {(command: string, args: string[], opts: object) => object} options.invoke
 * @param {string} [options.cwd]
 */
export function resolveTurboTaskSelection({
  classifierMode,
  tasks,
  resolvedBase,
  resolvedHead,
  invoke,
  cwd = process.cwd(),
}) {
  if (classifierMode === 'docs-only' || classifierMode === 'empty') {
    return {
      effectiveMode: classifierMode,
      reasonSuffix: null,
      turboMode: null,
      selectedTaskIds: [],
      selectedPackages: [],
      dryRun: null,
    };
  }

  let turboMode = classifierMode === 'affected' ? 'affected' : 'full';
  let dryRun = queryTurboDryGraph({
    tasks,
    turboMode,
    resolvedBase,
    resolvedHead,
    invoke,
    cwd,
  });

  let reasonSuffix = null;
  const zeroAffected =
    classifierMode === 'affected' &&
    dryRun.ok &&
    dryRun.parsed &&
    dryRun.parsed.taskIds.length === 0;
  const needsFullFallback =
    classifierMode === 'affected' &&
    (!dryRun.ok || zeroAffected);

  if (needsFullFallback) {
    if (!dryRun.ok) {
      reasonSuffix =
        dryRun.error === 'malformed turbo dry-run json'
          ? 'malformed turbo dry-run json; fell back to full'
          : 'turbo affected dry-run failed; fell back to full';
    } else {
      reasonSuffix = 'zero affected tasks; fell back to full';
    }
    turboMode = 'full';
    dryRun = queryTurboDryGraph({
      tasks,
      turboMode,
      resolvedBase,
      resolvedHead,
      invoke,
      cwd,
    });
  }

  const effectiveMode = needsFullFallback ? 'full' : classifierMode;
  const selectedTaskIds = dryRun.parsed?.taskIds ?? [];
  const selectedPackages = dryRun.parsed?.packages ?? [];

  return {
    effectiveMode,
    reasonSuffix,
    turboMode,
    selectedTaskIds,
    selectedPackages,
    dryRun: dryRun.parsed
      ? {
          turboMode: dryRun.turboMode,
          taskCount: dryRun.parsed.summary.taskCount,
          packages: dryRun.parsed.packages,
          ok: dryRun.ok,
        }
      : {
          turboMode: dryRun.turboMode,
          taskCount: 0,
          packages: [],
          ok: false,
          error: dryRun.error,
        },
  };
}

/**
 * @param {object} options
 * @param {string[]} options.tasks
 * @param {'affected' | 'full'} options.turboMode
 * @param {string} options.resolvedBase
 * @param {string} options.resolvedHead
 * @param {string} [options.cwd]
 */
export function executeTurboTasks({
  tasks,
  turboMode,
  resolvedBase,
  resolvedHead,
  cwd = process.cwd(),
}) {
  const affected = turboMode === 'affected';
  const args = buildPnpmTurboArgs({ tasks, affected, dryJson: false });
  const env =
    turboMode === 'affected'
      ? {
          ...process.env,
          TURBO_SCM_BASE: resolvedBase,
          TURBO_SCM_HEAD: resolvedHead,
        }
      : process.env;
  const result = spawnSync('pnpm', args, {
    cwd,
    env,
    shell: false,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

/**
 * @param {string[]} argv
 */
export function parseAffectedCliArgs(argv) {
  const allowedFlags = new Set(['--base', '--head', '--tasks', '--run', '--help']);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run' || arg === '--help') continue;
    if (arg.startsWith('--')) {
      if (!allowedFlags.has(arg)) {
        return { ok: false, error: `unexpected flag: ${arg}` };
      }
      if (arg === '--base' || arg === '--head' || arg === '--tasks') {
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) {
          return { ok: false, error: `missing value for ${arg}` };
        }
        i += 1;
      }
    }
  }

  if (argv.includes('--help')) {
    return { ok: true, help: true };
  }

  const baseIdx = argv.indexOf('--base');
  if (baseIdx === -1) {
    return { ok: false, error: 'required flag --base REF is missing' };
  }
  const base = argv[baseIdx + 1];
  const headIdx = argv.indexOf('--head');
  const head = headIdx === -1 ? 'HEAD' : argv[headIdx + 1];

  const tasksIdx = argv.indexOf('--tasks');
  let tasks = DEFAULT_TASKS;
  if (tasksIdx !== -1) {
    const raw = argv[tasksIdx + 1];
    tasks = raw.split(',').map((t) => t.trim()).filter(Boolean);
    const invalid = tasks.filter((t) => !ALLOWED_TASKS.includes(t));
    if (tasks.length === 0 || invalid.length > 0) {
      return {
        ok: false,
        error: `invalid --tasks; allowed: ${ALLOWED_TASKS.join(', ')}`,
      };
    }
  }

  return {
    ok: true,
    base,
    head,
    tasks,
    run: argv.includes('--run'),
  };
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, encoding?: string }} options
 */
export function defaultCommandInvoker(command, args, options = {}) {
  try {
    const stdout = execFileSync(command, args, {
      ...options,
      env: options.env ?? process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, stdout: String(stdout), status: 0 };
  } catch (error) {
    const err = /** @type {NodeJS.ErrnoException & { status?: number, stdout?: Buffer, stderr?: Buffer }} */ (
      error
    );
    return {
      ok: false,
      stdout: err.stdout ? String(err.stdout) : '',
      stderr: err.stderr ? String(err.stderr) : '',
      status: err.status ?? 1,
      message: err.message,
    };
  }
}

/**
 * @param {object} options
 * @param {string} options.base
 * @param {string} options.head
 * @param {(command: string, args: string[], opts: object) => { ok: boolean, stdout?: string, stderr?: string, status?: number, message?: string }} [options.invoke]
 * @param {string} [options.cwd]
 */
export function collectGitScopeState({ base, head, invoke = defaultCommandInvoker, cwd = process.cwd() }) {
  const baseVerify = invoke('git', ['rev-parse', '--verify', base], { cwd, encoding: 'utf8' });
  const headVerify = invoke('git', ['rev-parse', '--verify', head], { cwd, encoding: 'utf8' });

  const missing = [];
  if (!baseVerify.ok) missing.push(base);
  if (!headVerify.ok) missing.push(head);
  if (missing.length > 0) {
    return {
      resolvedBase: null,
      resolvedHead: null,
      scopeInput: {
        changedPaths: [],
        dirty: false,
        baseIsAncestor: true,
        missingRefs: `missing git refs: ${missing.join(', ')}`,
      },
    };
  }

  const resolvedBase = baseVerify.stdout.trim();
  const resolvedHead = headVerify.stdout.trim();

  const ancestor = invoke(
    'git',
    ['merge-base', '--is-ancestor', resolvedBase, resolvedHead],
    { cwd, encoding: 'utf8' },
  );
  const baseIsAncestor = ancestor.ok && ancestor.status === 0;

  const status = invoke(
    'git',
    ['status', '--porcelain', '--untracked-files=normal'],
    { cwd, encoding: 'utf8' },
  );
  if (!status.ok) {
    return {
      resolvedBase,
      resolvedHead,
      scopeInput: {
        changedPaths: [],
        dirty: 'git status failed',
        baseIsAncestor: true,
        missingRefs: false,
      },
    };
  }

  const dirty = status.stdout.trim().length > 0;
  const dirtyReason = dirty ? 'dirty or untracked worktree' : false;

  const diff = invoke(
    'git',
    ['diff', '--name-only', '--no-renames', `${resolvedBase}..${resolvedHead}`],
    { cwd, encoding: 'utf8' },
  );
  if (!diff.ok) {
    return {
      resolvedBase,
      resolvedHead,
      scopeInput: {
        changedPaths: [],
        dirty: 'git diff failed',
        baseIsAncestor,
        missingRefs: false,
      },
    };
  }

  const changedPaths = diff.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const deletedDiff = invoke(
    'git',
    [
      'diff',
      '--name-only',
      '--diff-filter=D',
      '--no-renames',
      `${resolvedBase}..${resolvedHead}`,
    ],
    { cwd, encoding: 'utf8' },
  );
  const deletedPaths = deletedDiff.ok
    ? deletedDiff.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const renameDiff = invoke(
    'git',
    ['diff', '--name-status', '--find-renames', `${resolvedBase}..${resolvedHead}`],
    { cwd, encoding: 'utf8' },
  );
  const renamedPaths = [];
  if (renameDiff.ok) {
    for (const line of renameDiff.stdout.split(/\r?\n/)) {
      const match = line.match(/^R\d+\s+(\S+)\s+(\S+)/);
      if (match) {
        renamedPaths.push({ from: match[1], to: match[2] });
      }
    }
  }

  return {
    resolvedBase,
    resolvedHead,
    scopeInput: {
      changedPaths,
      dirty: dirtyReason,
      baseIsAncestor,
      missingRefs: false,
      deletedPaths,
      renamedPaths,
    },
  };
}

/**
 * @param {object} plan
 */
export function formatPlanJson(plan) {
  return `${JSON.stringify(plan, null, 0)}\n`;
}

/**
 * @param {object} options
 * @param {string[]} [options.argv]
 * @param {string} [options.cwd]
 * @param {(command: string, args: string[], opts: object) => { ok: boolean, stdout?: string, stderr?: string, status?: number, message?: string }} [options.invoke]
 * @param {typeof executeTurboTasks} [options.executeTurbo]
 */
export function runAffectedCheckCli({
  argv = process.argv.slice(2),
  cwd = process.cwd(),
  invoke = defaultCommandInvoker,
  executeTurbo = executeTurboTasks,
} = {}) {
  const parsed = parseAffectedCliArgs(argv);
  if (!parsed.ok) {
    return { exitCode: 1, stdout: '', stderr: `${parsed.error}\n` };
  }
  if (parsed.help) {
    return {
      exitCode: 0,
      stdout:
        'Usage: node scripts/repo-tools/affected-check.mjs --base REF [--head REF] [--tasks build,typecheck,test] [--run]\n',
      stderr: '',
    };
  }

  const gitState = collectGitScopeState({
    base: parsed.base,
    head: parsed.head,
    invoke,
    cwd,
  });
  const scope = decideAffectedScope(gitState.scopeInput);
  const codeTasks =
    scope.mode === 'docs-only' || scope.mode === 'empty' ? [] : parsed.tasks;

  const resolvedBase = gitState.resolvedBase ?? parsed.base;
  const resolvedHead = gitState.resolvedHead ?? parsed.head;

  const turboSelection =
    codeTasks.length > 0
      ? resolveTurboTaskSelection({
          classifierMode: scope.mode,
          tasks: codeTasks,
          resolvedBase,
          resolvedHead,
          invoke,
          cwd,
        })
      : {
          effectiveMode: scope.mode,
          reasonSuffix: null,
          turboMode: null,
          selectedTaskIds: [],
          selectedPackages: [],
          dryRun: null,
        };

  const reason = turboSelection.reasonSuffix
    ? `${scope.reason}; ${turboSelection.reasonSuffix}`
    : scope.reason;

  const plan = {
    base: resolvedBase,
    head: resolvedHead,
    paths: scope.paths,
    mode: turboSelection.effectiveMode,
    reason,
    requestedTasks: parsed.tasks,
    selectedTaskIds: turboSelection.selectedTaskIds,
    selectedPackages: turboSelection.selectedPackages,
    codeTasks,
    turboMode: turboSelection.turboMode,
    dryRun: turboSelection.dryRun,
    run: false,
  };

  if (parsed.run) {
    plan.run = true;
  }

  const planJson = formatPlanJson(plan);

  if (parsed.run) {
    if (codeTasks.length === 0 || !turboSelection.turboMode) {
      return { exitCode: 0, stdout: planJson, stderr: '' };
    }
    const exitCode = executeTurbo({
      tasks: codeTasks,
      turboMode: turboSelection.turboMode,
      resolvedBase,
      resolvedHead,
      cwd,
    });
    return { exitCode, stdout: planJson, stderr: '' };
  }

  return { exitCode: 0, stdout: planJson, stderr: '' };
}

function main(argv = process.argv.slice(2)) {
  const result = runAffectedCheckCli({ argv });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.stdout) process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}

const thisFile = fileURLToPath(import.meta.url);
const invoked =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href ===
    pathToFileURL(thisFile).href;

if (invoked) {
  main();
}