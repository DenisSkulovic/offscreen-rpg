import { spawn } from 'node:child_process';
import { spawnSync } from 'node:child_process';
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

export const DEFAULT_LOCK_WAIT_SEC = 30;
export const DEFAULT_KILL_GRACE_MS = 5_000;
export const OBSERVABILITY_SERVICE = 'observability';

/**
 * @returns {string}
 */
export function resolveProductionStateRoot() {
  return join(homedir(), '.local', 'state', 'offscreen-rpg');
}

/**
 * @param {string} stateRoot
 * @param {string} contextName
 */
export function custodyPaths(stateRoot, contextName) {
  const lockDirectory = join(stateRoot, 'platform-locks');
  return {
    lockDirectory,
    lockPath: join(
      lockDirectory,
      `${contextName}-${OBSERVABILITY_SERVICE}.lock`,
    ),
    pendingPath: join(
      lockDirectory,
      `${contextName}-${OBSERVABILITY_SERVICE}.pending`,
    ),
  };
}

function assertOwnerOnly(stat, expectDirectory) {
  if (expectDirectory ? !stat.isDirectory() : !stat.isFile()) {
    throw new Error('refused: unexpected observability custody node type');
  }
  if (stat.uid !== process.getuid()) {
    throw new Error('refused: observability custody path has unexpected owner');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('refused: observability custody path is not owner-private');
  }
}

/**
 * @param {number} openedFd
 * @param {string} lockPath
 */
function assertLockIdentity(openedFd, lockPath) {
  const fdStat = fstatSync(openedFd);
  assertOwnerOnly(fdStat, false);
  const pathStat = lstatSync(lockPath);
  if (pathStat.isSymbolicLink()) {
    throw new Error('refused: observability lock path is a symlink');
  }
  if (
    fdStat.ino !== pathStat.ino ||
    fdStat.dev !== pathStat.dev ||
    pathStat.nlink !== 1
  ) {
    throw new Error(
      'refused: observability lock file identity mismatch or replacement detected',
    );
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
 * @param {unknown} record
 * @param {string} contextName
 */
function validatePendingRecord(record, contextName) {
  if (record == null || typeof record !== 'object') {
    return false;
  }
  const value = /** @type {Record<string, unknown>} */ (record);
  return (
    typeof value.phase === 'string' &&
    typeof value.context === 'string' &&
    value.context === contextName &&
    typeof value.service === 'string' &&
    value.service === OBSERVABILITY_SERVICE &&
    typeof value.start === 'string' &&
    typeof value.operationId === 'string' &&
    value.tuple != null &&
    typeof value.tuple === 'object' &&
    !Array.isArray(value.tuple)
  );
}

/**
 * Read-only pending inspection; creates no files or directories.
 * @param {string} contextName
 * @param {{ stateRoot?: string }} [deps]
 * @returns {{ pending: boolean, valid: boolean }}
 */
export function readPending(contextName, deps = {}) {
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const { pendingPath } = custodyPaths(stateRoot, contextName);
  try {
    const stat = lstatSync(pendingPath);
    if (stat.isSymbolicLink()) {
      return { pending: true, valid: false };
    }
    if (!stat.isFile()) {
      return { pending: true, valid: false };
    }
    try {
      assertOwnerOnly(stat, false);
    } catch {
      return { pending: true, valid: false };
    }
    const body = readFileSync(pendingPath, 'utf8');
    const parsed = JSON.parse(body);
    if (!validatePendingRecord(parsed, contextName)) {
      return { pending: true, valid: false };
    }
    return { pending: true, valid: true };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return { pending: false, valid: true };
    }
    return { pending: true, valid: false };
  }
}

/**
 * @param {string} pendingPath
 * @param {Record<string, unknown>} receipt
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
 * @param {string} pendingPath
 * @param {Record<string, unknown>} receipt
 */
function updatePendingReceipt(pendingPath, receipt) {
  const body = `${JSON.stringify(receipt)}\n`;
  const fd = openSync(pendingPath, constants.O_WRONLY | constants.O_TRUNC);
  try {
    writeFileSync(fd, body, { encoding: 'utf8' });
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  fsyncDirectory(dirname(pendingPath));
}

/**
 * @param {string} contextName
 * @param {{ now?: () => number, deadline?: number, stateRoot?: string, lockWaitSec?: number }} [deps]
 */
export async function acquireCustody(contextName, deps = {}) {
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const lockWaitSec = deps.lockWaitSec ?? DEFAULT_LOCK_WAIT_SEC;
  const { lockDirectory, lockPath, pendingPath } = custodyPaths(
    stateRoot,
    contextName,
  );

  const observed = readPending(contextName, { stateRoot });
  if (observed.pending && !observed.valid) {
    throw new Error(
      'refused: stale observability pending blocks mutations (invalid receipt)',
    );
  }
  if (observed.pending && observed.valid) {
    throw new Error(
      'refused: observability pending receipt already exists for this context',
    );
  }

  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const directoryStat = lstatSync(lockDirectory);
  if (directoryStat.isSymbolicLink()) {
    throw new Error('refused: observability lock directory is a symlink');
  }
  assertOwnerOnly(directoryStat, true);

  if (existsSync(lockPath)) {
    const existingLock = lstatSync(lockPath);
    if (existingLock.isSymbolicLink()) {
      throw new Error('refused: observability lock path is a symlink');
    }
  }

  let lockFd;
  try {
    lockFd = openSync(
      lockPath,
      constants.O_CREAT | constants.O_NOFOLLOW | constants.O_RDWR,
      0o600,
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'ELOOP' || error.code === 'EOPNOTSUPP')
    ) {
      throw new Error('refused: observability lock path is a symlink');
    }
    throw error;
  }

  let pendingEstablished = false;
  let cancellationLatch = false;
  /** @type {Record<string, unknown> | null} */
  let currentReceipt = null;

  try {
    assertLockIdentity(lockFd, lockPath);
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
        'refused: observability lock unavailable after waiting for exclusive flock',
      );
    }

    assertLockIdentity(lockFd, lockPath);
    const afterLock = readPending(contextName, { stateRoot });
    if (afterLock.pending && !afterLock.valid) {
      throw new Error(
        'refused: stale observability pending blocks mutations (invalid receipt)',
      );
    }
    if (afterLock.pending && afterLock.valid) {
      throw new Error(
        'refused: observability pending receipt already exists for this context',
      );
    }

    return {
      fd: lockFd,
      pendingPath,
      lockDirectory,
      get cancelled() {
        return cancellationLatch;
      },
      cancel() {
        cancellationLatch = true;
      },
      /**
       * @param {{ phase: string, tuple: Record<string, unknown> }} record
       */
      begin(record) {
        if (pendingEstablished) {
          throw new Error(
            'refused: observability pending receipt already established',
          );
        }
        if (existsSync(pendingPath)) {
          const occupied = lstatSync(pendingPath);
          if (occupied.isSymbolicLink()) {
            throw new Error('refused: pending path is a symlink');
          }
          throw new Error('refused: pending path already exists');
        }
        currentReceipt = {
          operationId: randomUUID(),
          service: OBSERVABILITY_SERVICE,
          context: contextName,
          phase: String(record.phase),
          tuple: record.tuple,
          start: new Date().toISOString(),
        };
        writePendingReceipt(pendingPath, currentReceipt);
        pendingEstablished = true;
      },
      /**
       * @param {{ phase: string, tuple: Record<string, unknown> }} record
       */
      advance(record) {
        if (!pendingEstablished || currentReceipt == null) {
          throw new Error(
            'refused: observability pending advance before durable receipt exists',
          );
        }
        currentReceipt = {
          ...currentReceipt,
          phase: String(record.phase),
          tuple: record.tuple,
        };
        updatePendingReceipt(pendingPath, currentReceipt);
      },
      clear() {
        if (!pendingEstablished) {
          return;
        }
        if (existsSync(pendingPath)) {
          unlinkSync(pendingPath);
          fsyncDirectory(lockDirectory);
        }
        pendingEstablished = false;
        currentReceipt = null;
      },
      close() {
        closeSync(lockFd);
      },
    };
  } catch (error) {
    closeSync(lockFd);
    throw error;
  }
}

/**
 * @param {import('node:child_process').ChildProcessWithoutNullStreams} child
 */
function awaitChildClose(child) {
  return new Promise((resolve) => {
    child.once('close', resolve);
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{
 *   custody: ReturnType<Awaited<typeof acquireCustody>>,
 *   now?: () => number,
 *   deadline?: number,
 *   timeoutMs?: number,
 *   signal?: AbortSignal,
 *   killGraceMs?: number,
 * }} deps
 */
export async function runMutation(command, args, deps) {
  const { custody } = deps;
  const now = deps.now ?? (() => performance.now());
  const killGraceMs = deps.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const deadline =
    deps.deadline ?? now() + (deps.timeoutMs ?? 60_000) + killGraceMs;

  if (custody.cancelled) {
    return {
      ok: false,
      stdout: '',
      exitCode: null,
      signal: null,
      timedOut: false,
    };
  }

  const remainingMs = () => Math.max(0, Math.floor(deadline - now()));
  const bound = deps.timeoutMs ?? remainingMs();
  const timeoutMs = Math.min(
    bound,
    Math.max(
      0,
      remainingMs() - (remainingMs() > killGraceMs ? killGraceMs : 0),
    ),
  );
  if (timeoutMs < 1) {
    return {
      ok: false,
      stdout: '',
      exitCode: null,
      signal: null,
      timedOut: true,
    };
  }

  if (custody.cancelled) {
    return {
      ok: false,
      stdout: '',
      exitCode: null,
      signal: null,
      timedOut: false,
    };
  }

  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe', custody.fd],
    windowsHide: true,
    detached: false,
    env: process.env,
  });

  return await new Promise((resolve) => {
    let stdout = '';
    let settled = false;
    let timedOut = false;
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let killTimer;

    const finalize = (payload) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (killTimer !== undefined) {
        clearTimeout(killTimer);
      }
      resolve(payload);
    };

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      if (child.exitCode === null && child.pid != null) {
        child.kill('SIGTERM');
        killTimer = setTimeout(() => {
          if (child.exitCode === null && child.pid != null) {
            child.kill('SIGKILL');
          }
        }, killGraceMs);
      }
    }, timeoutMs);

    child.on('error', (error) => {
      finalize({
        ok: false,
        stdout,
        exitCode: null,
        signal: null,
        timedOut: error.code === 'ETIMEDOUT' || timedOut,
      });
    });

    child.on('close', (code, signal) => {
      finalize({
        ok: code === 0,
        stdout,
        exitCode: code,
        signal: signal ?? null,
        timedOut: timedOut && (signal === 'SIGKILL' || signal === 'SIGTERM'),
      });
    });

    if (deps.signal) {
      deps.signal.addEventListener('abort', () => {
        custody.cancel();
      });
    }
  });
}
