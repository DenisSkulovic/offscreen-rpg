#!/usr/bin/env node
/**
 * Chaos lab controller — plan mode (dry-run) by default.
 * Execute mode performs one memoized graceful Pod delete when fully confirmed.
 */

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import { runPreflightPlan, LAB_CONTEXT_NAME } from './preflight.mjs';
import { evaluateTurn03LiveEligibility } from './turn03-proof-adapter.mjs';

const FORBIDDEN_DELETE_TOKENS = [
  '--force',
  '--grace-period',
  'scale',
  'StatefulSet',
  'namespace',
];

/** @type {Map<string, { ok: boolean, status: number | null, stderr: string, memo: true }>} */
const podDeleteMemo = new Map();

export function resetPodDeleteMemo() {
  podDeleteMemo.clear();
}

/**
 * @param {string} runId
 * @param {string} podUid
 */
function memoKey(runId, podUid) {
  return `${runId}\0${podUid}`;
}

/**
 * @param {string} namespace
 * @param {string} podName
 */
export function buildPodDeleteKubectlArgs(namespace, podName) {
  return [
    '--context',
    LAB_CONTEXT_NAME,
    '-n',
    namespace,
    'delete',
    'pod',
    podName,
    '--wait=false',
  ];
}

/**
 * @param {string[]} kubectlArgs args after the kubectl binary (includes --context)
 */
export function assertSafePodDeleteArgv(kubectlArgs) {
  const joined = kubectlArgs.join('\0');
  for (const token of FORBIDDEN_DELETE_TOKENS) {
    if (joined.includes(token)) {
      return { ok: false, reason: 'unsafe-delete-argv', detail: token };
    }
  }
  if (/--grace-period=0/.test(joined)) {
    return {
      ok: false,
      reason: 'unsafe-delete-argv',
      detail: '--grace-period=0',
    };
  }
  if (/[;|&$`<>]/.test(joined)) {
    return {
      ok: false,
      reason: 'unsafe-delete-argv',
      detail: 'shell-metacharacter',
    };
  }
  if (kubectlArgs[1] !== LAB_CONTEXT_NAME) {
    return {
      ok: false,
      reason: 'wrong-context',
      detail: kubectlArgs[1] ?? 'missing',
    };
  }
  return { ok: true };
}

/**
 * @param {string[]} argv
 */
export function parseControllerArgs(argv) {
  const out = {
    mode: 'plan',
    dryRun: true,
    execute: false,
    seed: undefined,
    maxEvents: 1,
    runId: undefined,
    releaseRef: undefined,
    confirmRunId: undefined,
    confirmPodUid: undefined,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        out.help = true;
        break;
      case '--mode':
        out.mode = argv[++i] ?? 'plan';
        break;
      case '--dry-run':
        out.dryRun = true;
        break;
      case '--no-dry-run':
        out.dryRun = false;
        break;
      case '--execute':
        out.execute = true;
        break;
      case '--seed':
        out.seed = argv[++i];
        break;
      case '--max-events':
        out.maxEvents = Number(argv[++i]);
        break;
      case '--run-id':
        out.runId = argv[++i];
        break;
      case '--release-ref':
        out.releaseRef = argv[++i];
        break;
      case '--confirm-run-id':
        out.confirmRunId = argv[++i];
        break;
      case '--confirm-pod-uid':
        out.confirmPodUid = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (out.execute || out.mode === 'execute') {
    out.dryRun = false;
  }

  return out;
}

/**
 * @param {string} reason
 * @param {string} [detail]
 * @param {ReturnType<typeof parseControllerArgs>} args
 */
function refusedExecutePlan(reason, detail, args) {
  return {
    schema: 'offscreen.chaos-plan.v1',
    status: 'refused',
    reason,
    detail: detail ?? null,
    mode: args.mode,
    dryRun: args.dryRun,
    runId: args.runId ?? null,
    seed: args.seed != null ? String(args.seed) : null,
    maxEvents: args.maxEvents ?? null,
  };
}

/**
 * @param {ReturnType<typeof parseControllerArgs>} args
 */
export function controllerOutcome(args) {
  if (args.help) {
    return { type: 'help' };
  }

  const wantsExecute = args.execute || args.mode === 'execute';

  if (wantsExecute) {
    if (!args.releaseRef) {
      return {
        type: 'refused',
        plan: refusedExecutePlan('missing-release-ref', undefined, args),
        exitCode: 2,
      };
    }
    if (!args.runId) {
      return {
        type: 'refused',
        plan: refusedExecutePlan('missing-run-id', undefined, args),
        exitCode: 2,
      };
    }
    return { type: 'execute', args };
  }

  if (args.mode !== 'plan') {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'mode-not-implemented',
        detail: args.mode,
      },
      exitCode: 2,
    };
  }
  if (!args.releaseRef) {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'missing-release-ref',
      },
      exitCode: 2,
    };
  }
  if (!args.runId) {
    return {
      type: 'refused',
      plan: {
        schema: 'offscreen.chaos-plan.v1',
        status: 'refused',
        reason: 'missing-run-id',
      },
      exitCode: 2,
    };
  }

  return { type: 'plan', args };
}

/** @param {string} text */
export function usage(text = '') {
  return `${text}Usage: chaos-controller.mjs plan \\
  --run-id <id> --seed <seed> --release-ref <path> [--max-events N]

Execute (one graceful Pod delete, lab context only):
  --execute|--mode execute --run-id <id> --confirm-run-id <same id> \\
  --confirm-pod-uid <planned pod uid> --seed <seed> --release-ref <path>

Defaults: --mode plan, --dry-run (read-only; no cluster mutations).
`.trim();
}

/**
 * @param {ReturnType<typeof parseControllerArgs>} parsed
 * @param {{
 *   execFile: (file: string, args: string[], opts?: object) => import('./preflight.mjs').ExecResult,
 *   turn03Report?: object | null,
 *   turn03Expected?: { releaseSha?: string, clusterUid?: string, imageDigests?: Record<string, string> },
 *   readMeminfo?: () => number | null,
 *   clusterLockExists?: () => boolean,
 *   readReleaseRef?: () => unknown,
 * }} options
 */
export function runExecuteChaos(parsed, options) {
  const { execFile } = options;

  if (parsed.maxEvents !== 1) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan(
        'max-events-not-one',
        String(parsed.maxEvents),
        parsed,
      ),
    };
  }

  if (!parsed.confirmRunId) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan('missing-confirm-run-id', undefined, parsed),
    };
  }
  if (!parsed.confirmPodUid) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan('missing-confirm-pod-uid', undefined, parsed),
    };
  }
  if (parsed.confirmRunId !== parsed.runId) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan('confirm-run-id-mismatch', undefined, parsed),
    };
  }

  const plan = runPreflightPlan({
    runId: parsed.runId,
    seed: parsed.seed,
    maxEvents: parsed.maxEvents,
    releaseRefPath: parsed.releaseRef,
    dryRun: false,
    mode: 'execute',
    execFile,
    readMeminfo: options.readMeminfo,
    clusterLockExists: options.clusterLockExists,
    readReleaseRef: options.readReleaseRef,
  });

  if (plan.status !== 'planned') {
    return { exitCode: 2, plan };
  }

  if (plan.cluster?.context !== LAB_CONTEXT_NAME) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan(
        'wrong-context',
        plan.cluster?.context ?? 'unknown',
        parsed,
      ),
    };
  }

  if (
    options.turn03Report === undefined ||
    options.turn03Expected === undefined
  ) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan(
        'turn03-not-eligible',
        'turn03-proof-missing',
        parsed,
      ),
    };
  }

  const eligibility = evaluateTurn03LiveEligibility({
    turn03Report: options.turn03Report ?? null,
    expected: options.turn03Expected ?? {},
    plan,
  });

  if (!eligibility.eligible) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan(
        'turn03-not-eligible',
        eligibility.reason,
        parsed,
      ),
    };
  }

  const plannedPodUid = plan.target?.podUid ?? '';
  if (plannedPodUid !== parsed.confirmPodUid) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan(
        'stale-pod-uid',
        plannedPodUid || 'unknown',
        parsed,
      ),
    };
  }

  const namespace = plan.target?.namespace ?? '';
  const podName = plan.target?.podName ?? '';
  if (!namespace || !podName) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan('incomplete-pod-target', undefined, parsed),
    };
  }

  const memoId = memoKey(parsed.runId, parsed.confirmPodUid);
  const cached = podDeleteMemo.get(memoId);
  if (cached) {
    return {
      exitCode: cached.ok ? 0 : 2,
      plan: {
        ...plan,
        liveEligibility: eligibility,
        execution: {
          status: cached.ok ? 'deleted' : 'delete-failed',
          memoHit: true,
          deleteStatus: cached.status,
        },
      },
    };
  }

  const kubectlArgs = buildPodDeleteKubectlArgs(namespace, podName);
  const argvCheck = assertSafePodDeleteArgv(kubectlArgs);
  if (!argvCheck.ok) {
    return {
      exitCode: 2,
      plan: refusedExecutePlan(argvCheck.reason, argvCheck.detail, parsed),
    };
  }

  const deleteResult = execFile('kubectl', kubectlArgs, { encoding: 'utf8' });
  podDeleteMemo.set(memoId, {
    ok: deleteResult.status === 0,
    status: deleteResult.status,
    stderr: deleteResult.stderr ?? '',
    memo: true,
  });

  return {
    exitCode: deleteResult.status === 0 ? 0 : 2,
    plan: {
      ...plan,
      liveEligibility: eligibility,
      execution: {
        status: deleteResult.status === 0 ? 'deleted' : 'delete-failed',
        memoHit: false,
        deleteStatus: deleteResult.status,
      },
    },
  };
}

/**
 * @param {{
 *   argv?: string[],
 *   execFile?: typeof defaultExecFile,
 *   write?: (chunk: string) => void,
 *   turn03Report?: object | null,
 *   turn03Expected?: { releaseSha?: string, clusterUid?: string, imageDigests?: Record<string, string> },
 *   readMeminfo?: () => number | null,
 *   clusterLockExists?: () => boolean,
 *   readReleaseRef?: () => unknown,
 * }} [options]
 */
export function runController(options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const write = options.write ?? ((c) => process.stdout.write(c));
  const execFile = options.execFile ?? defaultExecFile;

  let parsed;
  try {
    parsed = parseControllerArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    write(`${usage(message)}\n`);
    return { exitCode: 2, plan: null };
  }

  const outcome = controllerOutcome(parsed);
  if (outcome.type === 'help') {
    write(`${usage()}\n`);
    return { exitCode: 0, plan: null };
  }
  if (outcome.type === 'refused') {
    write(`${JSON.stringify(outcome.plan)}\n`);
    return { exitCode: outcome.exitCode ?? 2, plan: outcome.plan };
  }

  if (outcome.type === 'execute') {
    const result = runExecuteChaos(outcome.args, {
      execFile,
      turn03Report: options.turn03Report,
      turn03Expected: options.turn03Expected,
      readMeminfo: options.readMeminfo,
      clusterLockExists: options.clusterLockExists,
      readReleaseRef: options.readReleaseRef,
    });
    write(`${JSON.stringify(result.plan)}\n`);
    return { exitCode: result.exitCode, plan: result.plan };
  }

  const plan = runPreflightPlan({
    runId: parsed.runId,
    seed: parsed.seed,
    maxEvents: parsed.maxEvents,
    releaseRefPath: parsed.releaseRef,
    dryRun: parsed.dryRun,
    mode: parsed.mode,
    execFile,
    readMeminfo: options.readMeminfo,
    clusterLockExists: options.clusterLockExists,
    readReleaseRef: options.readReleaseRef,
  });

  if (
    options.turn03Report !== undefined ||
    options.turn03Expected !== undefined
  ) {
    plan.liveEligibility = evaluateTurn03LiveEligibility({
      turn03Report: options.turn03Report ?? null,
      expected: options.turn03Expected ?? {},
      plan,
    });
  }

  write(`${JSON.stringify(plan)}\n`);
  const exitCode = plan.status === 'planned' ? 0 : 2;
  return { exitCode, plan };
}

/** @param {string} file @param {string[]} args @param {object} [opts] */
function defaultExecFile(file, args, opts = {}) {
  const result = spawnSync(file, args, {
    encoding: 'utf8',
    ...opts,
  });
  return {
    argv: [file, ...args],
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

const entryPath = process.argv[1] ?? '';
if (entryPath.endsWith('controller.mjs')) {
  const { exitCode } = runController();
  process.exit(exitCode);
}
