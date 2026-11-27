// Invoked in a bounded subprocess for each local observation. No ensure/up/repair calls.
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  runPlatformCommand,
} from '../platform/common/commands.mjs';
import {
  verifyClusterNodesReady,
  verifyReleaseLocalPathProvisioner,
} from '../environments/infra-cli.mjs';
import { readKindProfile } from '../clusters/kind/manager/config.mjs';
import { observeSelectedServiceState } from '../environments/infra-cli.mjs';
import { parsePlatformServiceSelection } from '../environments/platform-plan.mjs';
import {
  INVENTORY_BUDGET_MS,
  OBSERVABILITY_ARTIFACT_BUDGET_MS,
  OBSERVABILITY_OBSERVATION_SUPERVISOR_MS,
  OBSERVABILITY_OBSERVATION_WORKER_MS,
  PREFLIGHT_BUDGET_MS,
} from '../platform/observability/identity.mjs';
import { observeObservability } from '../platform/observability/readiness.mjs';
import { buildWorkerReceipt } from '../platform/observability/install.mjs';
import { evaluateObservationReceipt } from '../platform/observability/receipt.mjs';
import { runCommand } from './diagnostic-engine.mjs';

export const OBSERVABILITY_SUPERVISOR_MS =
  OBSERVABILITY_OBSERVATION_SUPERVISOR_MS;
export const OBSERVABILITY_WORKER_BUDGET_MS =
  OBSERVABILITY_OBSERVATION_WORKER_MS;
export const PREFLIGHT_COMMAND_CAP_MS = 15_000;
export const INVENTORY_COMMAND_CAP_MS = 10_000;

const OBSERVATION_START_BUDGET_MS =
  OBSERVABILITY_ARTIFACT_BUDGET_MS + PREFLIGHT_BUDGET_MS + 10_000 + 30_000;

/**
 * @param {number} remainingMs
 * @param {number} phaseCapMs
 * @param {number} absoluteRemainingMs
 */
export function clampCommandTimeoutMs(
  remainingMs,
  phaseCapMs,
  absoluteRemainingMs,
) {
  return Math.max(
    0,
    Math.min(remainingMs, phaseCapMs, Math.max(0, absoluteRemainingMs)),
  );
}

/**
 * @param {{ now?: () => number }} [deps]
 */
export function createObservabilityDiagnosticBudget(deps = {}) {
  const now = deps.now ?? (() => performance.now());
  const started = now();
  const workerDeadline = started + OBSERVABILITY_WORKER_BUDGET_MS;
  const preflightDeadline = started + OBSERVATION_START_BUDGET_MS;
  const inventoryDeadline =
    started + OBSERVATION_START_BUDGET_MS + INVENTORY_BUDGET_MS;
  const remainingAbsolute = () => Math.max(0, workerDeadline - now());
  const remainingPreflight = () => Math.max(0, preflightDeadline - now());
  const remainingInventory = () => Math.max(0, inventoryDeadline - now());
  return {
    now,
    started,
    workerDeadline,
    preflightDeadline,
    inventoryDeadline,
    remainingAbsolute,
    remainingPreflight,
    remainingInventory,
    clampPreflight() {
      return clampCommandTimeoutMs(
        remainingPreflight(),
        PREFLIGHT_COMMAND_CAP_MS,
        remainingAbsolute(),
      );
    },
    clampInventory() {
      return clampCommandTimeoutMs(
        remainingInventory(),
        INVENTORY_COMMAND_CAP_MS,
        remainingAbsolute(),
      );
    },
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ allowAbsent?: boolean, onStdout?: (stdout: string) => void }} [options]
 * @param {{
 *   now?: () => number,
 *   run?: typeof runPlatformCommand,
 *   readPending?: (contextName: string) => { pending: boolean, valid: boolean },
 *   stateRoot?: string,
 *   observe?: typeof observeObservability,
 *   deadline?: number,
 * }} [deps]
 */
export function runObservabilityDiagnosticWorker(
  profileId,
  options = {},
  deps = {},
) {
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error('invalid profile');
  }
  const budget = createObservabilityDiagnosticBudget(deps);
  const observe = deps.observe ?? observeObservability;
  const absoluteCap = budget.started + OBSERVABILITY_WORKER_BUDGET_MS;
  const observeDeadline =
    deps.deadline == null ? absoluteCap : Math.min(deps.deadline, absoluteCap);
  const observation =
    budget.remainingAbsolute() <= 0
      ? {
          state: 'unreadable',
          reasonCode: 'deadline',
          pending: false,
          detail: 'deadline',
        }
      : observe(profileId, {
          run: deps.run,
          now: budget.now,
          readPending: deps.readPending,
          stateRoot: deps.stateRoot,
          deadline: observeDeadline,
        });
  const receipt = buildWorkerReceipt({
    ok: observation.state !== 'unreadable',
    profile: profileId,
    operation: 'status',
    state: observation.state ?? 'unreadable',
    reasonCode: observation.reasonCode ?? 'unreadable',
    mutation: 'none',
    completedPhases: [],
    pending: observation.pending === true,
  });
  const line = `${JSON.stringify(receipt)}\n`;
  if (options.onStdout) {
    options.onStdout(line);
  }
  const exitCode = observation.state === 'unreadable' ? 1 : 0;
  return {
    receipt,
    exitCode,
    timedOut: observation.reasonCode === 'deadline',
    allowAbsent: options.allowAbsent === true,
    observation,
  };
}

/**
 * @param {'dev' | 'release'} profile
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
function observeGeneric(profile, service, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  if (!['dev', 'release'].includes(profile)) {
    throw new Error('invalid profile');
  }
  const kind = readKindProfile(profile);
  if (
    process.env.DOCKER_HOST ||
    process.env.DOCKER_TLS_VERIFY ||
    process.env.DOCKER_CONTEXT
  ) {
    throw new Error('Docker endpoint override is not allowed');
  }
  const active = run('docker', ['context', 'show']);
  const contextName = active.stdout.trim();
  if (!active.ok || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(contextName)) {
    throw new Error('Docker context unavailable');
  }
  const context = run('docker', [
    'context',
    'inspect',
    contextName,
    '--format',
    '{{json .Endpoints.docker.Host}}',
  ]);
  const endpoint = context.ok ? JSON.parse(context.stdout) : null;
  if (
    typeof endpoint !== 'string' ||
    !/^(unix:\/\/\/|npipe:\/\/\/\/\.\/pipe\/)/.test(endpoint)
  ) {
    throw new Error('Docker context is not local');
  }
  const config = run('kubectl', [
    '--context',
    kind.contextName,
    'config',
    'view',
    '--minify',
    '-o',
    'json',
  ]);
  if (!config.ok) {
    throw new Error('explicit local kubeconfig unavailable');
  }
  const body = JSON.parse(config.stdout);
  if (
    body.users?.some((u) => u.user?.exec || u.user?.['auth-provider']) ||
    body.clusters?.some((c) => c.cluster?.['proxy-url'])
  ) {
    throw new Error('external authentication or proxy refused');
  }
  assertPlatformTarget(profile);
  if (service === 'cluster') {
    verifyClusterNodesReady(profile, run);
    if (profile === 'release') {
      verifyReleaseLocalPathProvisioner(run, kind.contextName);
    }
    const nodes = run('kind', ['get', 'nodes', '--name', kind.clusterName]);
    if (!nodes.ok || nodes.stdout.trim().split(/\s+/).length !== 2) {
      throw new Error('expected two Kind nodes');
    }
    return {
      status: 'PASS',
      reason: 'existing local cluster identity and readiness observed',
    };
  }
  if (!parsePlatformServiceSelection(profile, service).ok) {
    return { status: 'NOT-RUN', reason: 'unsupported service' };
  }
  const observed = observeSelectedServiceState(profile, service, { run });
  return {
    status:
      observed.state === 'installed'
        ? 'PASS'
        : observed.state === 'unsupported'
          ? 'NOT-RUN'
          : 'FAIL',
    reason: observed.state,
    detail: observed.detail ?? '',
  };
}

function parseArgv(argv) {
  const [profile, service, ...rest] = argv;
  let allowAbsent = false;
  if (service === 'observability') {
    for (const token of rest) {
      if (token === '--allow-absent') {
        if (profile !== 'release') {
          throw new Error('--allow-absent is release-only');
        }
        allowAbsent = true;
        continue;
      }
      throw new Error(`unknown observability argument: ${token}`);
    }
  } else if (rest.length > 0) {
    throw new Error('unexpected arguments');
  }
  return { profile, service, allowAbsent };
}

export function observe(argv, deps = {}) {
  const parsed = parseArgv(argv);
  const { profile, service, allowAbsent } = parsed;
  if (service === 'observability') {
    const worker = runObservabilityDiagnosticWorker(
      /** @type {'dev' | 'release'} */ (profile),
      { allowAbsent },
      deps,
    );
    const mapped = evaluateObservationReceipt(
      {
        code: worker.exitCode,
        stdout: `${JSON.stringify(worker.receipt)}\n`,
        stderr: '',
        reason: null,
        signal: null,
      },
      { allowAbsent, expectedProfile: profile },
    );
    return {
      status: mapped.status,
      reason: mapped.reason,
      receipt: worker.receipt,
    };
  }
  return observeGeneric(
    /** @type {'dev' | 'release'} */ (profile),
    service,
    deps,
  );
}

/**
 * @param {string} repoRoot
 * @param {string[]} argv
 * @param {{ timeoutMs?: number, run?: typeof runCommand }} [options]
 */
export function runObservabilityDiagnosticSubprocess(
  repoRoot,
  argv,
  options = {},
) {
  const cap = OBSERVABILITY_SUPERVISOR_MS;
  const timeoutMs = options.timeoutMs ?? cap;
  if (timeoutMs > cap) {
    throw new Error('observability supervisor timeout exceeds shared cap');
  }
  return runCommand(
    process.execPath,
    ['infra/verification/diagnostic-live.mjs', ...argv],
    {
      cwd: repoRoot,
      timeoutMs,
      env: options.env ?? process.env,
    },
  );
}

const IS_CLI_MAIN =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_CLI_MAIN) {
  try {
    const parsed = parseArgv(process.argv.slice(2));
    if (parsed.service === 'observability') {
      const worker = runObservabilityDiagnosticWorker(
        /** @type {'dev' | 'release'} */ (parsed.profile),
        {
          allowAbsent: parsed.allowAbsent,
          onStdout: (stdout) => process.stdout.write(stdout),
        },
      );
      process.exitCode = worker.exitCode;
    } else {
      process.stdout.write(
        `${JSON.stringify(observe(process.argv.slice(2)))}\n`,
      );
    }
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({
        status: 'FAIL',
        reason: 'local observation refused or failed',
        detail: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
  }
}
