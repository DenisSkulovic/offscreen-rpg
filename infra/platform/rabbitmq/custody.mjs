import { execFileSync, spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import process from 'node:process';

import {
  assertPlatformTarget,
  readPlatformObject,
  RELEASE_BASELINE_NAMESPACE,
} from '../common/commands.mjs';
import { DEV_BASELINE_NAMESPACE } from '../../clusters/kind/manager/dev-bootstrap.mjs';

export const RABBITMQ_ENSURE_BUDGET_MS = 900_000;
export const RABBITMQ_REPORTING_RESERVE_MS = 5_000;
export const RABBITMQ_LOCK_WAIT_SEC = 30;
export const RABBITMQ_LOCK_ACQUIRE_MS = 35_000;
export const RABBITMQ_API_TIMEOUT_MS = 10_000;
export const STAGE_DEPENDENCY_CEILING_MS = 240_000;
export const STAGE_BROKER_CEILING_MS = 420_000;

export const REFUSED_RABBITMQ_RUNNER_ENV_KEYS = [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS_VERIFY',
  'KUBECONFIG',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'ALL_PROXY',
  'NO_PROXY',
];

/** @typedef {'dev' | 'release'} RabbitmqProfileId */

/**
 * @param {string} [cwd]
 */
export function resolveGitCommonDirectory(cwd = process.cwd()) {
  const rel = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd,
    encoding: 'utf8',
  }).trim();
  return resolve(cwd, rel);
}

/** Refuse ambient Docker, proxy, and kubeconfig overrides before native I/O. */
export function assertRabbitmqRunnerEnv() {
  for (const key of REFUSED_RABBITMQ_RUNNER_ENV_KEYS) {
    const value = process.env[key];
    if (value != null && String(value).length > 0) {
      throw new Error(`rabbitmq runner env refused: ${key}`);
    }
  }
}

/**
 * @param {import('node:fs').Stats} stat
 * @param {boolean} directory
 */
function assertOwnerPrivate(stat, directory) {
  if (directory ? !stat.isDirectory() : !stat.isFile()) {
    throw new Error('refused: unexpected rabbitmq custody node type');
  }
  if (stat.uid !== process.getuid()) {
    throw new Error('refused: unexpected rabbitmq custody owner');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('refused: rabbitmq custody path is not owner-private');
  }
}

/**
 * @param {number} openedFd
 * @param {string} lockPath
 */
export function assertLockFileIdentity(openedFd, lockPath) {
  const fdStat = fstatSync(openedFd);
  assertOwnerPrivate(fdStat, false);
  const pathStat = lstatSync(lockPath);
  if (pathStat.isSymbolicLink()) {
    throw new Error('refused: rabbitmq lock path is a symlink');
  }
  if (
    fdStat.ino !== pathStat.ino ||
    fdStat.dev !== pathStat.dev ||
    pathStat.nlink !== 1
  ) {
    throw new Error('refused: rabbitmq lock file identity mismatch');
  }
}

/**
 * @param {string} commonDir
 * @param {string} contextName
 */
export function rabbitmqLockPaths(commonDir, contextName) {
  const lockDirectory = resolve(commonDir, '.offscreen', 'platform-locks');
  return {
    lockDirectory,
    lockPath: resolve(lockDirectory, `${contextName}-rabbitmq.lock`),
  };
}

/**
 * @param {string} commonDir
 */
function createOperationDirectory(commonDir) {
  const parent = resolve(commonDir, '.offscreen', 'operations');
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const parentStat = lstatSync(parent);
  if (parentStat.isSymbolicLink()) {
    throw new Error('refused: rabbitmq operations parent is a symlink');
  }
  assertOwnerPrivate(parentStat, true);
  const operationDir = mkdtempSync(resolve(parent, 'rabbitmq-'));
  const operationStat = lstatSync(operationDir);
  if (operationStat.isSymbolicLink()) {
    throw new Error('refused: rabbitmq operation directory is a symlink');
  }
  assertOwnerPrivate(operationStat, true);
  return operationDir;
}

/**
 * @param {string} contextName
 * @param {{ commonDir?: string, lockWaitSec?: number, lockAcquireMs?: number }} [deps]
 */
export function acquireRabbitmqLock(contextName, deps = {}) {
  assertRabbitmqRunnerEnv();
  const commonDir = deps.commonDir ?? resolveGitCommonDirectory();
  const { lockDirectory, lockPath } = rabbitmqLockPaths(commonDir, contextName);
  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const directoryStat = lstatSync(lockDirectory);
  if (directoryStat.isSymbolicLink()) {
    throw new Error('refused: rabbitmq lock directory is a symlink');
  }
  assertOwnerPrivate(directoryStat, true);

  const operationDir = createOperationDirectory(commonDir);
  const lockFd = openSync(
    lockPath,
    constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
    0o600,
  );

  try {
    assertLockFileIdentity(lockFd, lockPath);
    const lockWaitSec = deps.lockWaitSec ?? RABBITMQ_LOCK_WAIT_SEC;
    const lockAcquireMs = deps.lockAcquireMs ?? RABBITMQ_LOCK_ACQUIRE_MS;
    const flockResult = spawnSync(
      'flock',
      ['-x', '-w', String(lockWaitSec), '3'],
      {
        stdio: ['ignore', 'ignore', 'ignore', lockFd],
        timeout: lockAcquireMs,
        killSignal: 'SIGKILL',
      },
    );
    if (flockResult.error) {
      throw new Error(
        `refused: flock unavailable (${flockResult.error.code ?? 'error'})`,
      );
    }
    if (flockResult.status !== 0) {
      throw new Error('refused: rabbitmq lock unavailable after flock wait');
    }
    assertLockFileIdentity(lockFd, lockPath);
  } catch (error) {
    closeSync(lockFd);
    try {
      rmSync(operationDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup when lock setup fails.
    }
    throw error;
  }

  return {
    lockFd,
    lockPath,
    operationDir,
    operationId: randomUUID(),
    release() {
      closeSync(lockFd);
      try {
        rmSync(operationDir, { recursive: true, force: true });
      } catch {
        // Leave operation residue for operator inspection.
      }
    },
  };
}

/**
 * @param {bigint} deadlineNs
 */
export function remainingBudgetMs(deadlineNs) {
  const now = process.hrtime.bigint();
  const remaining = deadlineNs - now;
  if (remaining <= 0n) {
    return 0;
  }
  return Number(remaining / 1_000_000n);
}

/**
 * @param {bigint} overallDeadlineNs
 */
export function workerDeadlineNs(overallDeadlineNs) {
  return overallDeadlineNs - BigInt(RABBITMQ_REPORTING_RESERVE_MS) * 1_000_000n;
}

/**
 * @param {number} lockFd
 */
export function assertInheritedLockFd(lockFd) {
  if (!Number.isInteger(lockFd) || lockFd < 0) {
    throw new Error('refused: missing inherited rabbitmq lock fd');
  }
  const fdStat = fstatSync(lockFd);
  assertOwnerPrivate(fdStat, false);
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {import('./inventory.mjs').PlatformRun} run
 */
export function readBaselineNamespaceUid(profileId, run) {
  const baselineName =
    profileId === 'dev' ? DEV_BASELINE_NAMESPACE : RELEASE_BASELINE_NAMESPACE;
  const baseline = readPlatformObject(
    { profileId, resource: 'namespace', name: baselineName },
    { run },
  );
  if (baseline.state !== 'present') {
    throw new Error('baseline namespace unreadable or absent');
  }
  const uid = baseline.object?.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('baseline namespace uid missing');
  }
  return uid;
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {string} expectedUid
 * @param {import('./inventory.mjs').PlatformRun} run
 */
export function assertBaselineNamespaceUid(profileId, expectedUid, run) {
  const uid = readBaselineNamespaceUid(profileId, run);
  if (uid !== expectedUid) {
    throw new Error('refused: baseline namespace uid mismatch');
  }
}

/**
 * @param {RabbitmqProfileId} profileId
 * @param {import('./inventory.mjs').PlatformRun} run
 */
export function assertRabbitmqInstallTarget(profileId, run) {
  assertRabbitmqRunnerEnv();
  assertPlatformTarget(profileId, { run });
}

/**
 * @typedef {{
 *   ok: boolean,
 *   status: number | null,
 *   stdout: string,
 *   stderr: string,
 *   timedOut: boolean,
 *   missing: boolean,
 *   signal: NodeJS.Signals | null,
 *   ambiguous: boolean,
 * }} BoundedCommandResult
 */

/**
 * @param {number} lockFd
 * @param {bigint} deadlineNs
 * @param {string} command
 * @param {string[]} args
 * @param {{ input?: string, timeoutMs?: number, env?: NodeJS.ProcessEnv }} [options]
 */
export function runBoundedWithLockFd(
  lockFd,
  deadlineNs,
  command,
  args,
  options = {},
) {
  const remaining = remainingBudgetMs(deadlineNs);
  const timeoutMs = Math.min(
    options.timeoutMs ?? RABBITMQ_API_TIMEOUT_MS,
    remaining,
    RABBITMQ_API_TIMEOUT_MS,
  );
  if (timeoutMs < 1) {
    return {
      ok: false,
      status: null,
      stdout: '',
      stderr: '',
      timedOut: true,
      missing: false,
      signal: 'SIGKILL',
      ambiguous: true,
    };
  }
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    input: options.input,
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    stdio: ['pipe', 'pipe', 'pipe', lockFd],
    env: options.env ?? process.env,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  const timedOut =
    result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGKILL';
  const missing = result.error?.code === 'ENOENT';
  const status = result.status ?? null;
  const ambiguous =
    timedOut || missing || status == null || Boolean(result.error);
  return {
    ok: !ambiguous && status === 0,
    status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut,
    missing,
    signal: result.signal ?? null,
    ambiguous,
  };
}
