import { Buffer } from 'node:buffer';
import {
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';

import { readPlatformProfile } from '../common/profile.mjs';
import { ownedChildResult, startOwnedChild } from './forward.mjs';

export const DEFAULT_LOCK_WAIT_SEC = 30;
export const DEFAULT_KILL_GRACE_MS = 5_000;
export const OBSERVABILITY_SERVICE = 'observability';
const LOCK_PHASE_MS = 10_000;
const PENDING_LIMIT = 256 * 1024;
const TUPLE_FIELDS = [
  'profileId',
  'contextName',
  'clusterName',
  'port',
  'dockerContext',
  'dockerControlPlaneId',
  'dockerEndpointHost',
  'caSha256',
  'kubeSystemUid',
  'baselineUid',
  'targetNamespaceUid',
];

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

/**
 * @param {string} contextName
 */
function assertProfileContext(contextName) {
  if (typeof contextName !== 'string' || contextName.length === 0) {
    throw new Error('refused: observability context is not a profile context');
  }
  const allowed = [
    readPlatformProfile('dev').contextName,
    readPlatformProfile('release').contextName,
  ];
  if (!allowed.includes(contextName)) {
    throw new Error('refused: observability context is not a profile context');
  }
}

/**
 * @param {import('node:fs').Stats} stat
 * @param {boolean} expectDirectory
 */
function assertOwnerOnly(stat, expectDirectory) {
  if (expectDirectory ? !stat.isDirectory() : !stat.isFile()) {
    throw new Error('refused: unexpected observability custody node type');
  }
  if (stat.isSymbolicLink()) {
    throw new Error('refused: observability custody path is a symlink');
  }
  if (stat.uid !== process.getuid()) {
    throw new Error('refused: observability custody path has unexpected owner');
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error('refused: observability custody path is not owner-private');
  }
}

/**
 * @param {string} value
 * @param {number} max
 */
function boundedText(value, max) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= max &&
    ![...value].some((character) => character.charCodeAt(0) <= 31)
  );
}

/**
 * @param {unknown} value
 */
function stable(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stable(item)).join(',')}]`;
  }
  if (value != null && typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * @param {unknown} value
 */
function isUtcStamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

/**
 * @param {unknown} tuple
 * @param {string} contextName
 * @param {string} phase
 */
function validateTuple(tuple, contextName, phase) {
  if (tuple == null || typeof tuple !== 'object' || Array.isArray(tuple)) {
    throw new Error('refused: observability tuple is invalid');
  }
  const value = /** @type {Record<string, unknown>} */ (tuple);
  const keys = Object.keys(value);
  if (
    keys.length !== TUPLE_FIELDS.length ||
    TUPLE_FIELDS.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error('refused: observability tuple is invalid');
  }
  const profileId = value.profileId;
  if (profileId !== 'dev' && profileId !== 'release') {
    throw new Error('refused: observability tuple is invalid');
  }
  const profile = readPlatformProfile(profileId);
  if (
    value.contextName !== contextName ||
    value.contextName !== profile.contextName ||
    value.clusterName !== profile.clusterName ||
    !Number.isInteger(value.port) ||
    value.port < 1 ||
    value.port > 65535
  ) {
    throw new Error('refused: observability tuple is invalid');
  }
  for (const key of [
    'dockerContext',
    'dockerControlPlaneId',
    'dockerEndpointHost',
    'kubeSystemUid',
    'baselineUid',
  ]) {
    if (!boundedText(value[key], 256)) {
      throw new Error('refused: observability tuple is invalid');
    }
  }
  if (
    typeof value.caSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.caSha256)
  ) {
    throw new Error('refused: observability tuple is invalid');
  }
  const uid = value.targetNamespaceUid;
  const uidOk = typeof uid === 'string' && boundedText(uid, 128);
  if (phase === 'namespace') {
    if (uid != null && !uidOk) {
      throw new Error('refused: observability tuple is invalid');
    }
  } else if (!uidOk) {
    throw new Error('refused: observability namespace is not bound');
  }
  return {
    profileId,
    contextName: value.contextName,
    clusterName: value.clusterName,
    port: value.port,
    dockerContext: value.dockerContext,
    dockerControlPlaneId: value.dockerControlPlaneId,
    dockerEndpointHost: value.dockerEndpointHost,
    caSha256: value.caSha256,
    kubeSystemUid: value.kubeSystemUid,
    baselineUid: value.baselineUid,
    targetNamespaceUid: uid == null ? null : uid,
  };
}

/**
 * @param {unknown} record
 * @param {string} contextName
 */
function classifyPending(record, contextName) {
  if (record == null || typeof record !== 'object' || Array.isArray(record)) {
    return 'invalid';
  }
  const value = /** @type {Record<string, unknown>} */ (record);
  if (value.schema === undefined) {
    const keys = Object.keys(value);
    const legacy = [
      'operationId',
      'service',
      'context',
      'phase',
      'tuple',
      'start',
    ];
    const legacyOk =
      keys.length === legacy.length &&
      legacy.every((key) => keys.includes(key)) &&
      typeof value.operationId === 'string' &&
      value.operationId.length > 0 &&
      value.service === OBSERVABILITY_SERVICE &&
      value.context === contextName &&
      typeof value.phase === 'string' &&
      value.phase.length > 0 &&
      typeof value.start === 'string' &&
      value.tuple != null &&
      typeof value.tuple === 'object' &&
      !Array.isArray(value.tuple);
    return legacyOk ? 'legacy' : 'invalid';
  }
  try {
    validateStoredEnsure(value, contextName);
    return 'ensure';
  } catch {
    return 'invalid';
  }
}

/**
 * @param {Record<string, unknown>} value
 * @param {string} contextName
 */
function validateStoredEnsure(value, contextName) {
  const keys = Object.keys(value);
  const expected = [
    'schema',
    'operationId',
    'service',
    'context',
    'start',
    'operation',
    'phase',
    'tuple',
    'details',
  ];
  if (
    keys.length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key)) ||
    value.schema !== 2 ||
    value.operation !== 'ensure' ||
    value.service !== OBSERVABILITY_SERVICE ||
    value.context !== contextName ||
    typeof value.operationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.operationId,
    ) ||
    !isUtcStamp(value.start) ||
    typeof value.phase !== 'string' ||
    !boundedText(value.phase, 64) ||
    value.details == null ||
    typeof value.details !== 'object' ||
    Array.isArray(value.details) ||
    Object.keys(value.details).length !== 0
  ) {
    throw new Error('refused: observability pending record is invalid');
  }
  validateTuple(value.tuple, contextName, value.phase);
}

/**
 * @param {string} phase
 */
function assertPhase(phase) {
  if (typeof phase !== 'string' || !boundedText(phase, 64)) {
    throw new Error('refused: observability phase is invalid');
  }
}

/**
 * @param {unknown} details
 */
function assertEmptyDetails(details) {
  if (details == null) {
    return;
  }
  if (
    typeof details !== 'object' ||
    Array.isArray(details) ||
    Object.keys(details).length !== 0
  ) {
    throw new Error('refused: ensure details must be empty');
  }
}

/**
 * @param {string} pendingPath
 * @param {string} contextName
 */
function inspectPending(pendingPath, contextName) {
  const parent = dirname(pendingPath);
  let parentStat;
  try {
    parentStat = lstatSync(parent);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {
        pending: false,
        valid: true,
        kind: 'absent',
        record: null,
        identity: null,
      };
    }
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  }
  if (
    parentStat.isSymbolicLink() ||
    !parentStat.isDirectory() ||
    parentStat.uid !== process.getuid() ||
    (parentStat.mode & 0o077) !== 0
  ) {
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  }

  let fd;
  try {
    fd = openSync(pendingPath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return {
        pending: false,
        valid: true,
        kind: 'absent',
        record: null,
        identity: null,
      };
    }
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  }
  try {
    const before = fstatSync(fd);
    const pathBefore = lstatSync(pendingPath);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.size > PENDING_LIMIT ||
      before.uid !== process.getuid() ||
      (before.mode & 0o077) !== 0 ||
      pathBefore.isSymbolicLink() ||
      pathBefore.dev !== before.dev ||
      pathBefore.ino !== before.ino ||
      pathBefore.nlink !== 1
    ) {
      return {
        pending: true,
        valid: false,
        kind: 'invalid',
        record: null,
        identity: null,
      };
    }
    const buffer = Buffer.alloc(before.size);
    let offset = 0;
    while (offset < buffer.length) {
      const read = readSync(fd, buffer, offset, buffer.length - offset, offset);
      if (read === 0) {
        break;
      }
      offset += read;
    }
    const after = fstatSync(fd);
    const pathAfter = lstatSync(pendingPath);
    if (
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.mode !== before.mode ||
      pathAfter.dev !== before.dev ||
      pathAfter.ino !== before.ino ||
      pathAfter.nlink !== 1 ||
      offset !== before.size
    ) {
      return {
        pending: true,
        valid: false,
        kind: 'invalid',
        record: null,
        identity: null,
      };
    }
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
      return {
        pending: true,
        valid: false,
        kind: 'invalid',
        record: null,
        identity: null,
      };
    }
    const kind = classifyPending(parsed, contextName);
    if (kind === 'invalid') {
      return {
        pending: true,
        valid: false,
        kind,
        record: null,
        identity: null,
      };
    }
    return {
      pending: true,
      valid: true,
      kind,
      record: parsed,
      identity: { dev: before.dev, ino: before.ino },
    };
  } catch {
    return {
      pending: true,
      valid: false,
      kind: 'invalid',
      record: null,
      identity: null,
    };
  } finally {
    closeSync(fd);
  }
}

/**
 * @param {string} contextName
 * @param {{ stateRoot?: string }} [deps]
 * @returns {{ pending: boolean, valid: boolean }}
 */
export function readPending(contextName, deps = {}) {
  assertProfileContext(contextName);
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const { pendingPath } = custodyPaths(stateRoot, contextName);
  const inspected = inspectPending(pendingPath, contextName);
  return { pending: inspected.pending, valid: inspected.valid };
}

/**
 * @param {number} fd
 * @param {string} lockPath
 */
function assertLockIdentity(fd, lockPath) {
  const opened = fstatSync(fd);
  assertOwnerOnly(opened, false);
  const pathStat = lstatSync(lockPath);
  if (pathStat.isSymbolicLink()) {
    throw new Error('refused: observability lock path is a symlink');
  }
  if (
    opened.dev !== pathStat.dev ||
    opened.ino !== pathStat.ino ||
    pathStat.nlink !== 1 ||
    opened.nlink !== 1
  ) {
    throw new Error(
      'refused: observability lock file identity mismatch or replacement detected',
    );
  }
}

/**
 * @param {string} directory
 * @param {{ dev: number, ino: number }} identity
 */
function assertDirectoryIdentity(directory, identity) {
  const stat = lstatSync(directory);
  if (stat.isSymbolicLink()) {
    throw new Error('refused: observability lock directory is a symlink');
  }
  assertOwnerOnly(stat, true);
  if (stat.dev !== identity.dev || stat.ino !== identity.ino) {
    throw new Error('refused: observability lock directory identity changed');
  }
}

/**
 * @param {string} directory
 * @param {{ fault?: string | null }} [deps]
 */
function syncDirectory(directory, deps = {}) {
  if (deps.fault === 'fsync') {
    deps.fault = null;
    throw new Error('refused: observability directory fsync failed');
  }
  const fd = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/**
 * @param {number} fd
 * @param {{ fault?: string | null }} [deps]
 */
function syncFile(fd, deps = {}) {
  if (deps.fault === 'fsync') {
    deps.fault = null;
    throw new Error('refused: observability file fsync failed');
  }
  fsyncSync(fd);
}

/**
 * @param {string} pendingPath
 * @param {Record<string, unknown>} record
 * @param {{ fault?: string | null }} deps
 */
function createPending(pendingPath, record, deps) {
  const body = Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
  const fd = openSync(
    pendingPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeSync(fd, body);
    syncFile(fd, deps);
  } finally {
    closeSync(fd);
  }
  syncDirectory(dirname(pendingPath), deps);
}

/**
 * @param {string} pendingPath
 * @param {Record<string, unknown>} record
 * @param {{ dev: number, ino: number }} owned
 * @param {string} contextName
 * @param {{ fault?: string | null }} deps
 */
function replacePending(
  pendingPath,
  previous,
  replacement,
  owned,
  contextName,
  deps,
) {
  const current = inspectPending(pendingPath, contextName);
  if (
    current.kind !== 'ensure' ||
    current.identity?.dev !== owned.dev ||
    current.identity?.ino !== owned.ino ||
    stable(current.record) !== stable(previous)
  ) {
    throw new Error('refused: observability pending record changed');
  }
  const tempPath = join(
    dirname(pendingPath),
    `.${OBSERVABILITY_SERVICE}-${randomUUID()}.tmp`,
  );
  const body = Buffer.from(`${JSON.stringify(replacement)}\n`, 'utf8');
  let tempIdentity = null;
  const fd = openSync(
    tempPath,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW |
      constants.O_WRONLY,
    0o600,
  );
  try {
    writeSync(fd, body);
    syncFile(fd, deps);
    tempIdentity = { dev: fstatSync(fd).dev, ino: fstatSync(fd).ino };
  } catch (error) {
    closeSync(fd);
    removeUnusedTemp(tempPath, tempIdentity);
    throw error;
  }
  closeSync(fd);
  const again = inspectPending(pendingPath, contextName);
  if (
    again.kind !== 'ensure' ||
    again.identity?.dev !== owned.dev ||
    again.identity?.ino !== owned.ino ||
    stable(again.record) !== stable(previous)
  ) {
    removeUnusedTemp(tempPath, tempIdentity);
    throw new Error('refused: observability pending record changed');
  }
  if (deps.fault === 'rename') {
    deps.fault = null;
    removeUnusedTemp(tempPath, tempIdentity);
    throw new Error('refused: observability pending rename failed');
  }
  try {
    renameSync(tempPath, pendingPath);
  } catch (error) {
    removeUnusedTemp(tempPath, tempIdentity);
    throw error;
  }
  syncDirectory(dirname(pendingPath), deps);
  const verified = inspectPending(pendingPath, contextName);
  if (
    verified.kind !== 'ensure' ||
    stable(verified.record) !== stable(replacement)
  ) {
    throw new Error('refused: observability pending record changed');
  }
  return verified.identity;
}

/**
 * @param {string} tempPath
 * @param {{ dev: number, ino: number } | null} identity
 */
function removeUnusedTemp(tempPath, identity) {
  if (identity == null) {
    return;
  }
  try {
    const stat = lstatSync(tempPath);
    if (
      stat.isSymbolicLink() ||
      stat.dev !== identity.dev ||
      stat.ino !== identity.ino
    ) {
      return;
    }
    unlinkSync(tempPath);
  } catch {
    // An ambiguous temp name is left in place rather than deleting a replacement.
  }
}

/**
 * @param {number} lockDeadline
 * @param {() => number} now
 * @param {number} killGraceMs
 * @param {number} lockWaitSec
 */
function flockWaitSeconds(lockDeadline, now, killGraceMs, lockWaitSec) {
  const availableMs = Math.floor(lockDeadline - now() - killGraceMs);
  if (availableMs <= 0) {
    return null;
  }
  const clamped = Math.min(availableMs, Math.floor(lockWaitSec * 1000));
  if (clamped <= 0) {
    return null;
  }
  return (clamped / 1000).toFixed(3);
}

/**
 * @param {string} contextName
 * @param {string} lockPath
 * @param {string} mode
 * @param {{
 *   now?: () => number,
 *   deadline?: number,
 *   signal?: AbortSignal,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 * }} deps
 */
async function acquireLockFd(contextName, lockPath, mode, deps) {
  const lockDirectory = dirname(lockPath);
  mkdirSync(lockDirectory, { recursive: true, mode: 0o700 });
  const directoryStat = lstatSync(lockDirectory);
  if (directoryStat.isSymbolicLink()) {
    throw new Error('refused: observability lock directory is a symlink');
  }
  assertOwnerOnly(directoryStat, true);
  const directoryIdentity = { dev: directoryStat.dev, ino: directoryStat.ino };
  let fd;
  try {
    fd = openSync(
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
      throw new Error('refused: observability lock path is a symlink', {
        cause: error,
      });
    }
    throw error;
  }
  const now = deps.now ?? (() => performance.now());
  const killGraceMs = deps.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const lockWaitSec = deps.lockWaitSec ?? DEFAULT_LOCK_WAIT_SEC;
  const phaseStart = now();
  const lockDeadline = Math.min(
    deps.deadline ?? phaseStart + LOCK_PHASE_MS,
    phaseStart + LOCK_PHASE_MS,
  );
  try {
    assertLockIdentity(fd, lockPath);
    assertDirectoryIdentity(lockDirectory, directoryIdentity);
    const seconds = flockWaitSeconds(
      lockDeadline,
      now,
      killGraceMs,
      lockWaitSec,
    );
    if (seconds == null) {
      throw new Error('refused: observability lock wait is exhausted');
    }
    const held = startOwnedChild(
      'flock',
      [mode === 'shared' ? '--shared' : '--exclusive', '--wait', seconds, '3'],
      {
        fds: [fd],
        deadline: lockDeadline,
        now,
        signal: deps.signal,
        killGraceMs,
      },
    );
    const outcome = await held.outcome;
    if (outcome.closeUnconfirmed) {
      throw Object.assign(
        new Error('refused: observability lock close unconfirmed'),
        { retainFd: true },
      );
    }
    await held.closed;
    if (!outcome.ok) {
      throw new Error(
        'refused: observability lock unavailable after waiting for exclusive flock',
      );
    }
    assertLockIdentity(fd, lockPath);
    assertDirectoryIdentity(lockDirectory, directoryIdentity);
    return { fd, directoryIdentity };
  } catch (error) {
    if (!(
      error &&
      typeof error === 'object' &&
      'retainFd' in error &&
      error.retainFd
    )) {
      closeSync(fd);
    }
    throw error;
  }
}

/**
 * @param {string} contextName
 * @param {{
 *   mode?: 'exclusive' | 'shared',
 *   now?: () => number,
 *   deadline?: number,
 *   stateRoot?: string,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 *   signal?: AbortSignal,
 *   fault?: string | null,
 * }} [deps]
 */
export async function acquireCustody(contextName, deps = {}) {
  assertProfileContext(contextName);
  const mode = deps.mode ?? 'exclusive';
  if (mode !== 'exclusive' && mode !== 'shared') {
    throw new Error('refused: observability lock mode is invalid');
  }
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const paths = custodyPaths(stateRoot, contextName);
  const before = readPending(contextName, { stateRoot });
  if (before.pending && !before.valid) {
    throw new Error(
      'refused: stale observability pending blocks mutations (invalid receipt)',
    );
  }
  if (before.pending && before.valid) {
    throw new Error(
      'refused: observability pending receipt already exists for this context',
    );
  }
  const locked = await acquireLockFd(contextName, paths.lockPath, mode, deps);
  try {
    const after = readPending(contextName, { stateRoot });
    if (after.pending && !after.valid) {
      throw new Error(
        'refused: stale observability pending blocks mutations (invalid receipt)',
      );
    }
    if (after.pending && after.valid) {
      throw new Error(
        'refused: observability pending receipt already exists for this context',
      );
    }
    return createHandle({
      contextName,
      mode,
      fd: locked.fd,
      pendingPath: paths.pendingPath,
      lockDirectory: paths.lockDirectory,
      directoryIdentity: locked.directoryIdentity,
      deps,
    });
  } catch (error) {
    closeSync(locked.fd);
    throw error;
  }
}

/**
 * @param {string} contextName
 * @param {{
 *   now?: () => number,
 *   deadline?: number,
 *   stateRoot?: string,
 *   lockWaitSec?: number,
 *   killGraceMs?: number,
 *   signal?: AbortSignal,
 * }} [deps]
 */
export async function acquireProofCustody(contextName, deps = {}) {
  assertProfileContext(contextName);
  const stateRoot = deps.stateRoot ?? resolveProductionStateRoot();
  const { lockDirectory } = custodyPaths(stateRoot, contextName);
  const lockPath = join(
    lockDirectory,
    `${contextName}-${OBSERVABILITY_SERVICE}-proof.lock`,
  );
  const locked = await acquireLockFd(contextName, lockPath, 'exclusive', deps);
  return createHandle({
    contextName,
    mode: 'proof',
    fd: locked.fd,
    pendingPath: null,
    lockDirectory,
    directoryIdentity: locked.directoryIdentity,
    deps,
  });
}

/**
 * @param {{
 *   contextName: string,
 *   mode: 'exclusive' | 'shared' | 'proof',
 *   fd: number,
 *   pendingPath: string | null,
 *   lockDirectory: string,
 *   directoryIdentity: { dev: number, ino: number },
 *   deps: { fault?: string | null },
 * }} input
 */
function createHandle(input) {
  let cancellationLatch = false;
  let authorityFailed = false;
  let closed = false;
  let closeUnconfirmed = false;
  /** @type {Record<string, unknown> | null} */
  let ownedRecord = null;
  /** @type {{ dev: number, ino: number } | null} */
  let ownedIdentity = null;
  /** @type {{ closed: Promise<unknown> } | null} */
  let activeChild = null;
  let activeSettled = true;

  const refuseClosed = () => {
    if (closed) {
      throw new Error('refused: observability custody is closed');
    }
  };
  const latch = (error) => {
    authorityFailed = true;
    throw error;
  };
  const requireMutable = () => {
    refuseClosed();
    if (input.mode !== 'exclusive' || input.pendingPath == null) {
      throw new Error('refused: shared observability custody cannot mutate');
    }
    if (cancellationLatch) {
      throw new Error('refused: observability custody is cancelled');
    }
    if (authorityFailed || closeUnconfirmed) {
      throw new Error('refused: observability custody authority failed');
    }
    assertLockIdentity(input.fd, lockPathFor(input));
    assertDirectoryIdentity(input.lockDirectory, input.directoryIdentity);
  };

  const handle = {
    fd: input.fd,
    mode: input.mode,
    pendingPath: input.pendingPath,
    lockDirectory: input.lockDirectory,
    get cancelled() {
      return cancellationLatch;
    },
    cancel() {
      cancellationLatch = true;
      if (activeChild && !activeSettled) {
        activeChild.stop();
      }
    },
    trackChild(child) {
      refuseClosed();
      activeChild = child;
      activeSettled = false;
      child.closed.then(() => {
        if (activeChild === child) {
          activeSettled = true;
        }
      });
    },
    noteCloseUnconfirmed() {
      closeUnconfirmed = true;
      authorityFailed = true;
    },
    close() {
      if (closed) {
        return;
      }
      if (activeChild && !activeSettled) {
        throw new Error('refused: observability owned child is still active');
      }
      closeSync(input.fd);
      closed = true;
    },
  };

  if (input.mode !== 'exclusive') {
    return handle;
  }

  Object.assign(handle, {
    assertOwnPending() {
      requireMutable();
      if (
        ownedRecord == null ||
        ownedIdentity == null ||
        input.pendingPath == null
      ) {
        return latch(
          new Error('refused: observability pending record is not owned'),
        );
      }
      const inspected = inspectPending(input.pendingPath, input.contextName);
      if (
        inspected.kind !== 'ensure' ||
        inspected.identity?.dev !== ownedIdentity.dev ||
        inspected.identity?.ino !== ownedIdentity.ino ||
        stable(inspected.record) !== stable(ownedRecord)
      ) {
        return latch(
          new Error('refused: observability pending record changed'),
        );
      }
      return globalThis.structuredClone(ownedRecord);
    },
    begin(request) {
      requireMutable();
      if (ownedRecord != null) {
        throw new Error(
          'refused: observability pending receipt already established',
        );
      }
      const existing = inspectPending(input.pendingPath, input.contextName);
      if (existing.pending) {
        throw new Error('refused: pending path already exists');
      }
      assertEmptyDetails(request.details);
      if (request.operation != null && request.operation !== 'ensure') {
        throw new Error('refused: observability operation is not ensure');
      }
      assertPhase(request.phase);
      const tuple = validateTuple(
        request.tuple,
        input.contextName,
        request.phase,
      );
      const record = {
        schema: 2,
        operationId: randomUUID(),
        service: OBSERVABILITY_SERVICE,
        context: input.contextName,
        start: new Date().toISOString(),
        operation: 'ensure',
        phase: request.phase,
        tuple,
        details: {},
      };
      try {
        createPending(input.pendingPath, record, input.deps);
        const inspected = inspectPending(input.pendingPath, input.contextName);
        if (
          inspected.kind !== 'ensure' ||
          stable(inspected.record) !== stable(record)
        ) {
          throw new Error('refused: observability pending record changed');
        }
        ownedRecord = globalThis.structuredClone(record);
        ownedIdentity = inspected.identity;
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
    advance(request) {
      requireMutable();
      if (ownedRecord == null || ownedIdentity == null) {
        return latch(
          new Error(
            'refused: observability pending advance before durable receipt exists',
          ),
        );
      }
      assertEmptyDetails(request.details);
      assertPhase(request.phase);
      const tuple = validateTuple(
        request.tuple,
        input.contextName,
        request.phase,
      );
      const previous = /** @type {Record<string, unknown>} */ (
        ownedRecord.tuple
      );
      for (const key of TUPLE_FIELDS) {
        if (key === 'targetNamespaceUid') {
          continue;
        }
        if (stable(previous[key]) !== stable(tuple[key])) {
          return latch(
            new Error('refused: observability tuple identity changed'),
          );
        }
      }
      if (
        stable(previous.targetNamespaceUid) !== stable(tuple.targetNamespaceUid)
      ) {
        const binding =
          previous.targetNamespaceUid == null &&
          typeof tuple.targetNamespaceUid === 'string' &&
          request.phase === 'namespace';
        if (!binding) {
          return latch(
            new Error('refused: observability namespace binding changed'),
          );
        }
      }
      const next = {
        ...ownedRecord,
        phase: request.phase,
        tuple,
        details: {},
      };
      try {
        const identity = replacePending(
          input.pendingPath,
          ownedRecord,
          next,
          ownedIdentity,
          input.contextName,
          input.deps,
        );
        ownedRecord = globalThis.structuredClone(next);
        ownedIdentity = identity;
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
    clear() {
      requireMutable();
      if (
        ownedRecord == null ||
        ownedIdentity == null ||
        input.pendingPath == null
      ) {
        return latch(
          new Error('refused: observability pending record is not owned'),
        );
      }
      const inspected = inspectPending(input.pendingPath, input.contextName);
      if (
        inspected.kind !== 'ensure' ||
        inspected.identity?.dev !== ownedIdentity.dev ||
        inspected.identity?.ino !== ownedIdentity.ino ||
        stable(inspected.record) !== stable(ownedRecord)
      ) {
        return latch(
          new Error('refused: observability pending record changed'),
        );
      }
      try {
        unlinkSync(input.pendingPath);
        syncDirectory(input.lockDirectory, input.deps);
        const after = inspectPending(input.pendingPath, input.contextName);
        if (after.pending || !after.valid) {
          throw new Error('refused: observability pending record remained');
        }
        ownedRecord = null;
        ownedIdentity = null;
      } catch (error) {
        authorityFailed = true;
        throw error;
      }
    },
  });
  return handle;
}

/**
 * @param {{ mode: string, lockDirectory: string, contextName: string }} input
 */
function lockPathFor(input) {
  const suffix = input.mode === 'proof' ? '-proof' : '';
  return join(
    input.lockDirectory,
    `${input.contextName}-${OBSERVABILITY_SERVICE}${suffix}.lock`,
  );
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{
 *   custody: ReturnType<Awaited<typeof acquireCustody>> & {
 *     trackChild?: (child: ReturnType<typeof startOwnedChild>) => void,
 *     noteCloseUnconfirmed?: () => void,
 *     assertOwnPending?: () => unknown,
 *   },
 *   now?: () => number,
 *   deadline?: number,
 *   timeoutMs?: number,
 *   signal?: AbortSignal,
 *   killGraceMs?: number,
 * }} deps
 */
export async function runMutation(command, args, deps) {
  const { custody } = deps;
  if (
    custody.mode !== 'exclusive' ||
    typeof custody.assertOwnPending !== 'function'
  ) {
    throw new Error(
      'refused: mutation requires exclusive observability custody',
    );
  }
  const now = deps.now ?? (() => performance.now());
  const killGraceMs = deps.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  const timeoutMs = deps.timeoutMs ?? 60_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    return ownedChildResult(false, { attempted: false, timedOut: true });
  }
  if (custody.cancelled) {
    return ownedChildResult(false, { cancelled: true, attempted: false });
  }
  const started = now();
  const allocationEnd = started + timeoutMs;
  const workerDeadline = deps.deadline ?? allocationEnd;
  if (allocationEnd > workerDeadline) {
    return ownedChildResult(false, { timedOut: true, attempted: false });
  }
  custody.assertOwnPending();
  if (deps.signal?.aborted) {
    custody.cancel();
    return ownedChildResult(false, { cancelled: true, attempted: false });
  }
  const onAbort = () => {
    custody.cancel();
  };
  deps.signal?.addEventListener('abort', onAbort, { once: true });
  const child = startOwnedChild(command, args, {
    fds: [custody.fd],
    deadline: Math.min(workerDeadline, allocationEnd),
    now,
    signal: deps.signal,
    killGraceMs,
  });
  custody.trackChild?.(child);
  try {
    const outcome = await child.outcome;
    if (outcome.closeUnconfirmed) {
      custody.noteCloseUnconfirmed?.();
      return outcome;
    }
    await child.closed;
    return outcome;
  } finally {
    deps.signal?.removeEventListener('abort', onAbort);
  }
}
