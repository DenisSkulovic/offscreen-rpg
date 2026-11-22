import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const REGISTRY_VERSION = 1;
export const REGISTRY_FILENAME = 'owners.json';
export const LOCK_FILENAME = 'owners.lock';

/** @typedef {{
 *   slotId: string,
 *   worktreePath: string,
 *   cluster: string,
 *   namespace: string,
 *   ports: { game: number, control: number, tilt: number, spare: number },
 *   processIdentity: { pid: number, startTimeJiffies: number } | null,
 *   resourceUids: Record<string, string>,
 *   lease: { pid: number, startTimeJiffies: number, acquiredAt: string } | null,
 * }} DevWorktreeOwnerRecord */

/** @typedef {{
 *   version: number,
 *   nextSequence: number,
 *   ownersByWorktree: Record<string, DevWorktreeOwnerRecord>,
 * }} DevWorktreeRegistrySnapshot */

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * @param {number} sequence
 * @returns {string}
 */
export function encodeDnsSafeSlotId(sequence) {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid slot sequence: ${sequence}`);
  }
  const id = `dev-${sequence}`;
  if (!isDnsSafeSlotId(id)) {
    throw new Error(`Encoded slot id is not DNS-safe: ${id}`);
  }
  return id;
}

/**
 * @param {string} slotId
 * @returns {boolean}
 */
export function isDnsSafeSlotId(slotId) {
  return typeof slotId === 'string' && DNS_LABEL.test(slotId);
}

/**
 * @param {string} slotId
 * @returns {string}
 */
export function deriveDevNamespace(slotId) {
  return `offscreen-${slotId}`;
}

/**
 * @param {DevWorktreeRegistrySnapshot | null | undefined} snapshot
 * @returns {DevWorktreeRegistrySnapshot}
 */
export function emptyRegistry(snapshot) {
  if (snapshot && typeof snapshot === 'object') {
    return {
      version: REGISTRY_VERSION,
      nextSequence: Number.isInteger(snapshot.nextSequence) ? snapshot.nextSequence : 1,
      ownersByWorktree: { ...(snapshot.ownersByWorktree ?? {}) },
    };
  }
  return { version: REGISTRY_VERSION, nextSequence: 1, ownersByWorktree: {} };
}

/**
 * @param {string} registryRoot
 * @returns {string}
 */
export function registryFilePath(registryRoot) {
  return join(registryRoot, REGISTRY_FILENAME);
}

/**
 * @param {string} registryRoot
 * @returns {string}
 */
export function lockFilePath(registryRoot) {
  return join(registryRoot, LOCK_FILENAME);
}

/**
 * @param {string} registryRoot
 * @returns {DevWorktreeRegistrySnapshot}
 */
export function readRegistry(registryRoot) {
  const file = registryFilePath(registryRoot);
  if (!existsSync(file)) {
    return emptyRegistry();
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return emptyRegistry(parsed);
  } catch {
    throw refusal('registry-corrupt', `Dev worktree registry is unreadable: ${file}`);
  }
}

/**
 * @param {string} registryRoot
 * @param {DevWorktreeRegistrySnapshot} snapshot
 */
export function writeRegistry(registryRoot, snapshot) {
  mkdirSync(registryRoot, { recursive: true });
  const file = registryFilePath(registryRoot);
  const tmp = `${file}.tmp-${process.pid}`;
  const payload = `${JSON.stringify(snapshot)}\n`;
  writeFileSync(tmp, payload, 'utf8');
  renameSync(tmp, file);
}

/**
 * @param {string} id
 * @param {string} message
 * @returns {Error & { id: string }}
 */
export function refusal(id, message) {
  const err = new Error(message);
  // @ts-expect-error branded refusal
  err.id = id;
  // @ts-expect-error branded refusal
  err.refusal = true;
  return err;
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAllocatorRefusal(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
  // @ts-expect-error refusal marker
    error.refusal === true &&
  // @ts-expect-error refusal marker
    typeof error.id === 'string'
  );
}

/**
 * @param {DevWorktreeRegistrySnapshot} snapshot
 * @param {string} slotId
 */
export function assertSlotIdUnused(snapshot, slotId) {
  for (const record of Object.values(snapshot.ownersByWorktree)) {
    if (record.slotId === slotId) {
      throw refusal('slot-id-collision', `DNS-safe slot id collision: ${slotId}`);
    }
  }
}

/**
 * @param {DevWorktreeRegistrySnapshot} snapshot
 * @returns {number}
 */
export function allocateNextSequence(snapshot) {
  const sequence = snapshot.nextSequence;
  snapshot.nextSequence = sequence + 1;
  const slotId = encodeDnsSafeSlotId(sequence);
  assertSlotIdUnused(snapshot, slotId);
  return sequence;
}

/**
 * @param {{
 *   registryRoot: string,
 *   staleLockMs?: number,
 *   lockTimeoutMs?: number,
 *   sleepMs?: (ms: number) => void,
 * }} options
 * @param {() => void} fn
 */
export function withRegistryLock(options, fn) {
  const staleLockMs = options.staleLockMs ?? 60_000;
  const lockTimeoutMs = options.lockTimeoutMs ?? 5_000;
  const sleepMs = options.sleepMs ?? ((ms) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      // busy wait keeps the helper sync for allocator use
    }
  });
  mkdirSync(options.registryRoot, { recursive: true });
  const lockPath = lockFilePath(options.registryRoot);
  const deadline = Date.now() + lockTimeoutMs;

  while (Date.now() < deadline) {
    try {
      const fd = openSync(lockPath, 'wx');
      writeFileSync(fd, `${JSON.stringify({ pid: process.pid, at: Date.now() })}\n`, 'utf8');
      closeSync(fd);
      try {
        return fn();
      } finally {
        try {
          unlinkSync(lockPath);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') {
        throw error;
      }
      try {
        const raw = readFileSync(lockPath, 'utf8');
        const lock = JSON.parse(raw);
        const age = Date.now() - Number(lock?.at ?? 0);
        if (age > staleLockMs) {
          unlinkSync(lockPath);
          continue;
        }
      } catch {
        try {
          unlinkSync(lockPath);
        } catch {
          // ignore
        }
      }
      sleepMs(15);
    }
  }

  throw refusal('registry-lock-timeout', 'Timed out waiting for the dev worktree registry lock.');
}

/**
 * @param {DevWorktreeRegistrySnapshot} snapshot
 * @returns {Set<number>}
 */
export function collectReservedPorts(snapshot) {
  /** @type {Set<number>} */
  const ports = new Set();
  for (const record of Object.values(snapshot.ownersByWorktree)) {
    for (const value of Object.values(record.ports)) {
      ports.add(value);
    }
  }
  return ports;
}

/**
 * @param {string} registryRoot
 * @param {(snapshot: DevWorktreeRegistrySnapshot) => DevWorktreeOwnerRecord} mutator
 * @param {{ staleLockMs?: number, lockTimeoutMs?: number, sleepMs?: (ms: number) => void }} [lockOptions]
 * @returns {DevWorktreeOwnerRecord}
 */
export function mutateRegistry(registryRoot, mutator, lockOptions = {}) {
  return withRegistryLock({ registryRoot, ...lockOptions }, () => {
    const snapshot = readRegistry(registryRoot);
    const record = mutator(snapshot);
    writeRegistry(registryRoot, snapshot);
    return record;
  });
}