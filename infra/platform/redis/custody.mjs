import { spawn, spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { clearTimeout, setTimeout } from 'node:timers';

import { readPlatformProfile } from '../common/profile.mjs';

/** @typedef {'dev' | 'release'} RedisProfileId */

export const DEFAULT_BUDGET_MS = 600_000;
export const DEFAULT_WRITE_RESERVE_MS = 360_000;
export const DEFAULT_LOCK_WAIT_SEC = 30;
export const DEFAULT_KILL_GRACE_MS = 5_000;

/**
 * Production state root is fixed; callers may pass deps.stateRoot in tests only.
 * @returns {string}
 */
export function resolveProductionStateRoot() {
  return join(homedir(), '.local', 'state', 'offscreen-rpg');
}

function assertOwnerOnly(stat, expectDirectory) {
  if (expectDirectory ? !stat.isDirectory() : !stat.isFile()) {
    throw new Error('refused: unexpected redis custody node type');
  }
  if (stat.uid !== process.getuid()) {
    throw new Error('refused: redis custody path has unexpected owner');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('refused: redis custody path is not owner-private');
  }
}

function assertLockIdentity(openedFd, lockPath) {
  const fdStat = fstatSync(openedFd);
  assertOwnerOnly(fdStat, false);
  const pathStat = lstatSync(lockPath);
  if (pathStat.isSymbolicLink()) {
    throw new Error('refused: redis lock path is a symlink');
  }
  if (
    fdStat.ino !== pathStat.ino ||
    fdStat.dev !== pathStat.dev ||
    pathStat.nlink !== 1
  ) {
    throw new Error(
      'refused: redis lock file identity mismatch or replacement detected',
    );
  }
}

/**
 * @param {string} stateRoot
 * @param {string} contextName
 */
function lockPaths(stateRoot, contextName) {
  const lockDirectory = join(stateRoot, 'platform-locks');
  return {
    lockDirectory,
    lockPath: join(lockDirectory, `${contextName}-redis.lock`),
    pendingPath: join(lockDirectory, `${contextName}-redis.pending`),
  };
}

/**
 * @param {string} pendingPath
 */
function readPendingReceipt(pendingPath) {
  try {
    const stat = lstatSync(pendingPath);
    if (stat.isSymbolicLink()) {
      return { ok: false, reason: 'pending is a symlink' };
    }
    if (!stat.isFile()) {
      return { ok: false, reason: 'pending is not a regular file' };
    }
    assertOwnerOnly(stat, false);
    const body = readFileSync(pendingPath, 'utf8');
    const parsed = JSON.parse(body);
    if (
      typeof parsed.operationId !== 'string' ||
      typeof parsed.profile !== 'string' ||
      typeof parsed.context !== 'string' ||
      typeof parsed.phase !== 'string' ||
      typeof parsed.start !== 'string'
    ) {
      return { ok: false, reason: 'pending receipt is malformed' };
    }
    return { ok: true, receipt: parsed };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'pending unreadable',
    };
  }
}

/**
 * @param {string} lockDirectory
 */
function fsyncDirectory(lockDirectory) {
  const dirFd = openSync(
    lockDirectory,
    constants.O_RDONLY | constants.O_DIRECTORY,
  );
  try {
    fsyncSync(dirFd);
  } finally {
    closeSync(dirFd);
  }
}

/**
 * @param {string} pendingPath
 * @param {{ operationId: string, profile: string, context: string, phase: string, start: string }} receipt
 */
function writePendingReceipt(pendingPath, receipt) {
  const body = `${JSON.stringify(receipt)}\n`;
  const fd = openSync(
    pendingPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
    0o600,
  );
  try {
    writeFileSync(fd, body, { encoding: 'utf8' });
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  fsyncDirectory(dirname(pendingPath));
}

/**
 * @param {*} value
 */
function isSuccessResult(value) {
  return (
    value !== undefined &&
    value !== null &&
    typeof value === 'object' &&
    value.ok === true
  );
}

/**
 * @param {RedisProfileId} profileId
 * @param {(ctx: {
 *   runWrite: (command: 'helm' | 'kubectl', args: string[], options?: { input?: string, timeoutMs?: number }) => Promise<RunWriteResult> | RunWriteResult,
 *   remainingMs: () => number,
 *   beginPending: (phase: string) => void,
 *   finishPending: () => void,
 * }) => Promise<unknown> | unknown} operation
 * @param {{
 *   stateRoot?: string,
 *   now?: () => number,
 *   budgetMs?: number,
 *   writeReserveMs?: number,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 *   spawn?: typeof spawnSync,
 * }=} deps
 */
export async function withRedisMutation(profileId, operation, deps = {}) {
  const profile = readPlatformProfile(profileId);
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const now = deps.now ?? (() => performance.now());
  const budgetMs = deps.budgetMs ?? DEFAULT_BUDGET_MS;
  const writeReserveMs = deps.writeReserveMs ?? DEFAULT_WRITE_RESERVE_MS;
  const lockWaitSec = deps.lockWaitSec ?? DEFAULT_LOCK_WAIT_SEC;
  const killGraceMs = deps.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const spawnImpl = deps.spawn ?? spawnSync;

  const deadline = now() + budgetMs;
  const remainingMs = () => Math.max(0, Math.floor(deadline - now()));

  const { lockDirectory, lockPath, pendingPath } = lockPaths(
    stateRoot,
    profile.contextName,
  );

  if (existsSync(pendingPath)) {
    const existing = readPendingReceipt(pendingPath);
    if (!existing.ok) {
      throw new Error(
        `refused: stale redis pending blocks mutations (${existing.reason})`,
      );
    }
    throw new Error(
      'refused: redis pending receipt already exists for this context',
    );
  }

  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const directoryStat = lstatSync(lockDirectory);
  if (directoryStat.isSymbolicLink()) {
    throw new Error('refused: redis lock directory is a symlink');
  }
  assertOwnerOnly(directoryStat, true);

  let lockFd;
  const activeChildren = [];
  let shuttingDownChildren = false;
  let pendingEstablished = false;
  let operationId;

  const awaitActiveChildren = async () => {
    while (activeChildren.length > 0) {
      await Promise.all(
        activeChildren.map(
          (child) =>
            new Promise((resolve) => {
              if (child.killed || child.exitCode !== null) {
                resolve();
                return;
              }
              child.once('exit', resolve);
            }),
        ),
      );
    }
  };

  const terminateActiveChildren = () => {
    if (shuttingDownChildren) {
      return;
    }
    shuttingDownChildren = true;
    for (const child of activeChildren) {
      if (child.exitCode === null && !child.killed) {
        child.kill('SIGTERM');
      }
    }
    const grace = killGraceMs;
    setTimeout(() => {
      for (const child of activeChildren) {
        if (child.exitCode === null && !child.killed) {
          child.kill('SIGKILL');
        }
      }
    }, grace);
  };

  const onSignal = () => {
    terminateActiveChildren();
  };

  process.once('SIGTERM', onSignal);
  process.once('SIGINT', onSignal);

  try {
    if (remainingMs() < 1) {
      throw new Error(
        'refused: redis mutation budget exhausted before lock acquisition',
      );
    }

    lockFd = openSync(
      lockPath,
      constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
      0o600,
    );
    assertLockIdentity(lockFd, lockPath);

    // 1. Hold one open file description; flock and mutation children inherit fd 3.
    const flockResult = spawnSync(
      'flock',
      ['--exclusive', '--wait', String(lockWaitSec), '3'],
      { stdio: ['ignore', 'pipe', 'pipe', lockFd] },
    );
    if (flockResult.error) {
      throw new Error(
        `refused: flock unavailable (${flockResult.error.code ?? 'error'})`,
      );
    }
    if (flockResult.status !== 0) {
      throw new Error(
        'refused: redis lock unavailable after waiting for exclusive flock',
      );
    }

    operationId = randomUUID();

    const beginPending = (phase) => {
      if (pendingEstablished) {
        throw new Error(
          'refused: redis pending receipt already established for this operation',
        );
      }
      if (existsSync(pendingPath)) {
        const occupied = lstatSync(pendingPath);
        if (occupied.isSymbolicLink()) {
          throw new Error('refused: pending path is a symlink');
        }
        if (occupied.isDirectory()) {
          throw new Error('refused: pending path occupied by a directory');
        }
        throw new Error('refused: pending path already exists');
      }
      try {
        writePendingReceipt(pendingPath, {
          operationId,
          profile: profileId,
          context: profile.contextName,
          phase: String(phase),
          start: new Date().toISOString(),
        });
        pendingEstablished = true;
      } catch (error) {
        if (existsSync(pendingPath)) {
          try {
            unlinkSync(pendingPath);
          } catch {
            // Preserve the original refusal if cleanup also fails.
          }
        }
        throw new Error(
          `refused: redis pending receipt creation failed (${error instanceof Error ? error.message : 'error'})`,
          { cause: error },
        );
      }
    };

    const finishPending = () => {
      if (!pendingEstablished) {
        return;
      }
      if (existsSync(pendingPath)) {
        unlinkSync(pendingPath);
        fsyncDirectory(lockDirectory);
      }
      pendingEstablished = false;
    };

    /**
     * @param {'helm' | 'kubectl'} command
     * @param {string[]} args
     * @param {{ input?: string, timeoutMs?: number }=} options
     * @returns {Promise<{
     *   ok: boolean,
     *   status: number | null,
     *   stdout: string,
     *   stderr: string,
     *   timedOut?: boolean,
     *   signal?: string | null,
     *   missing?: boolean,
     * }>}
     */
    const runWrite = async (command, args, options = {}) => {
      if (!pendingEstablished) {
        throw new Error(
          'refused: runWrite called before redis pending receipt exists',
        );
      }
      if (command !== 'helm' && command !== 'kubectl') {
        throw new Error('refused: runWrite allows only helm or kubectl');
      }
      if (remainingMs() < writeReserveMs) {
        throw new Error(
          'refused: runWrite denied because redis mutation budget reserve is exhausted',
        );
      }

      const timeoutMs = Math.min(
        options.timeoutMs ?? remainingMs(),
        remainingMs(),
      );
      if (timeoutMs < 1) {
        throw new Error('refused: runWrite denied with no remaining budget');
      }

      if (deps.spawn) {
        const injected = spawnImpl(command, args, {
          input: options.input,
          encoding: 'utf8',
          timeout: timeoutMs,
          stdio: ['pipe', 'pipe', 'pipe', lockFd],
          windowsHide: true,
        });
        if (injected && typeof injected.then === 'function') {
          return injected;
        }
        return /** @type {import('node:child_process').SpawnSyncReturns<string>} */ (
          injected
        );
      }

      // Mutation children inherit the lock fd as descriptor 3; no shell or detached processes.
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe', lockFd],
        windowsHide: true,
      });
      activeChildren.push(child);

      if (options.input !== undefined) {
        child.stdin?.write(options.input);
        child.stdin?.end();
      }

      return await new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
          if (child.exitCode === null && !child.killed) {
            child.kill('SIGKILL');
          }
        }, timeoutMs);

        child.stdout?.on('data', (chunk) => {
          stdout += String(chunk);
        });
        child.stderr?.on('data', (chunk) => {
          stderr += String(chunk);
        });

        const finalize = (payload) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          const index = activeChildren.indexOf(child);
          if (index >= 0) {
            activeChildren.splice(index, 1);
          }
          resolve(payload);
        };

        child.on('error', (error) => {
          finalize({
            ok: false,
            status: null,
            stdout,
            stderr,
            missing: error.code === 'ENOENT',
          });
        });

        child.on('exit', (status, signal) => {
          finalize({
            ok: status === 0,
            status,
            stdout,
            stderr,
            signal: signal ?? null,
            timedOut: signal === 'SIGKILL' && remainingMs() <= 0,
          });
        });
      });
    };

    beginPending('mutation');

    const result = await Promise.resolve(
      operation({
        runWrite,
        remainingMs,
        beginPending,
        finishPending,
      }),
    );

    if (isSuccessResult(result)) {
      finishPending();
    }

    await awaitActiveChildren();
    return result;
  } finally {
    process.removeListener('SIGTERM', onSignal);
    process.removeListener('SIGINT', onSignal);
    await awaitActiveChildren().catch(() => {});
    if (lockFd !== undefined) {
      closeSync(lockFd);
    }
  }
}
