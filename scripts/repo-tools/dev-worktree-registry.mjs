import { createHash } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

export const REGISTRY_VERSION = 1;
export const REGISTRY_VERSION_V2 = 2;
export const DEV_CLUSTER_NAME = 'kind-offscreen-dev';
export const REGISTRY_V1_BACKUP = 'owners.json.v1-backup';
export const REGISTRY_CUTOVER_RECEIPT = 'owners.json.v2-cutover.json';
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

/** @typedef {{
 *   version: 2,
 *   nextSequence: number,
 *   environmentsById: Record<string, DevWorktreeOwnerRecord>,
 *   defaultEnvironmentByCheckout: Record<string, string>,
 * }} DevEnvironmentRegistryV2 */

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
/**
 * @param {string} registryRoot
 * @returns {unknown}
 */
export function readRegistryJson(registryRoot) {
  const file = registryFilePath(registryRoot);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw refusal('registry-corrupt', `Dev worktree registry is unreadable: ${file}`);
  }
}

export function readRegistry(registryRoot) {
  const parsed = readRegistryJson(registryRoot);
  if (parsed === null) return emptyRegistry();
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw refusal('registry-corrupt', 'Dev worktree registry is not an object.');
  }
  const version = /** @type {{ version?: unknown }} */ (parsed).version;
  if (version === REGISTRY_VERSION_V2) {
    throw refusal('registry-version', 'Registry v2 cannot be read by the v1 owner API.');
  }
  if (version !== REGISTRY_VERSION) {
    throw refusal('registry-version', `Unsupported registry version: ${String(version)}`);
  }
  return emptyRegistry(/** @type {DevWorktreeRegistrySnapshot} */ (parsed));
}

/**
 * @param {string} registryRoot
 * @returns {DevEnvironmentRegistryV2}
 */
export function readRegistryV2(registryRoot) {
  const parsed = readRegistryJson(registryRoot);
  if (parsed === null) {
    return { version: REGISTRY_VERSION_V2, nextSequence: 1, environmentsById: {}, defaultEnvironmentByCheckout: {} };
  }
  return validateRegistryV2(parsed);
}

/**
 * @param {string} registryRoot
 * @param {DevWorktreeRegistrySnapshot | DevEnvironmentRegistryV2} snapshot
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

/**
 * @param {unknown} value
 * @returns {value is DevWorktreeOwnerRecord}
 */
function isOwnerShape(value) {
  if (!value || typeof value !== 'object') return false;
  const record = /** @type {DevWorktreeOwnerRecord} */ (value);
  return typeof record.slotId === 'string'
    && typeof record.worktreePath === 'string'
    && typeof record.cluster === 'string'
    && typeof record.namespace === 'string'
    && record.ports !== null
    && typeof record.ports === 'object';
}

/**
 * @param {DevWorktreeOwnerRecord} record
 */
function assertOwnerIdentity(record) {
  if (!isDnsSafeSlotId(record.slotId)) {
    throw refusal('invalid-slot-id', `Slot id is not DNS-safe: ${record.slotId}`);
  }
  if (!isAbsolute(record.worktreePath)) {
    throw refusal('invalid-checkout', `Checkout path is not absolute: ${record.worktreePath}`);
  }
  if (record.cluster !== DEV_CLUSTER_NAME) {
    throw refusal('invalid-cluster', `Cluster is not the dev cluster: ${record.cluster}`);
  }
  if (record.namespace !== deriveDevNamespace(record.slotId)) {
    throw refusal('invalid-namespace', `Namespace does not match slot ${record.slotId}: ${record.namespace}`);
  }
  for (const port of Object.values(record.ports)) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw refusal('invalid-port', `Port bundle contains an invalid port for ${record.slotId}.`);
    }
  }
}

/**
 * Strict v1 snapshot. Malformed records are refusals, never replaced.
 *
 * @param {unknown} raw
 * @returns {DevWorktreeRegistrySnapshot}
 */
export function validateRegistryV1(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw refusal('registry-corrupt', 'Registry v1 snapshot is not an object.');
  }
  const snapshot = /** @type {DevWorktreeRegistrySnapshot} */ (raw);
  if (snapshot.version !== REGISTRY_VERSION) {
    throw refusal('registry-version', `Unsupported registry version: ${String(snapshot.version)}`);
  }
  if (!Number.isInteger(snapshot.nextSequence) || snapshot.nextSequence < 1) {
    throw refusal('registry-corrupt', 'Registry nextSequence is invalid.');
  }
  if (!snapshot.ownersByWorktree || typeof snapshot.ownersByWorktree !== 'object' || Array.isArray(snapshot.ownersByWorktree)) {
    throw refusal('registry-corrupt', 'Registry ownersByWorktree is missing.');
  }
  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Set<number>} */
  const ports = new Set();
  for (const [key, record] of Object.entries(snapshot.ownersByWorktree)) {
    if (!isOwnerShape(record)) {
      throw refusal('registry-corrupt', `Owner record for ${key} is malformed.`);
    }
    if (key !== record.worktreePath) {
      throw refusal('invalid-checkout', `Checkout key ${key} does not match ${record.worktreePath}.`);
    }
    assertOwnerIdentity(record);
    if (ids.has(record.slotId)) {
      throw refusal('duplicate-environment', `Duplicate environment id: ${record.slotId}`);
    }
    ids.add(record.slotId);
    const unique = new Set(Object.values(record.ports));
    for (const port of unique) {
      if (ports.has(port)) {
        throw refusal('duplicate-port', `Port ${port} is reserved by more than one environment.`);
      }
      ports.add(port);
    }
    const sequence = Number(record.slotId.slice(4));
    if (sequence >= snapshot.nextSequence) {
      throw refusal('registry-corrupt', `nextSequence ${snapshot.nextSequence} does not follow ${record.slotId}.`);
    }
  }
  return snapshot;
}

/**
 * @param {unknown} raw
 * @returns {DevEnvironmentRegistryV2}
 */
export function validateRegistryV2(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw refusal('registry-corrupt', 'Registry v2 snapshot is not an object.');
  }
  const snapshot = /** @type {DevEnvironmentRegistryV2} */ (raw);
  if (snapshot.version !== REGISTRY_VERSION_V2) {
    throw refusal('registry-version', `Unsupported registry version: ${String(snapshot.version)}`);
  }
  if (!Number.isInteger(snapshot.nextSequence) || snapshot.nextSequence < 1) {
    throw refusal('registry-corrupt', 'Registry nextSequence is invalid.');
  }
  if (!snapshot.environmentsById || typeof snapshot.environmentsById !== 'object' || Array.isArray(snapshot.environmentsById)) {
    throw refusal('registry-corrupt', 'environmentsById is missing.');
  }
  if (!snapshot.defaultEnvironmentByCheckout || typeof snapshot.defaultEnvironmentByCheckout !== 'object' || Array.isArray(snapshot.defaultEnvironmentByCheckout)) {
    throw refusal('registry-corrupt', 'defaultEnvironmentByCheckout is missing.');
  }
  /** @type {Set<number>} */
  const ports = new Set();
  for (const [id, record] of Object.entries(snapshot.environmentsById)) {
    if (!isOwnerShape(record)) {
      throw refusal('registry-corrupt', `Environment ${id} is malformed.`);
    }
    if (id !== record.slotId) {
      throw refusal('duplicate-environment', `Environment key ${id} does not match slot ${record.slotId}.`);
    }
    assertOwnerIdentity(record);
    const unique = new Set(Object.values(record.ports));
    for (const port of unique) {
      if (ports.has(port)) throw refusal('duplicate-port', `Port ${port} is reserved by more than one environment.`);
      ports.add(port);
    }
  }
  /** @type {Set<string>} */
  const defaults = new Set();
  for (const [checkout, slotId] of Object.entries(snapshot.defaultEnvironmentByCheckout)) {
    if (!isAbsolute(checkout)) throw refusal('invalid-checkout', `Default checkout is not absolute: ${checkout}`);
    const record = snapshot.environmentsById[slotId];
    if (!record) throw refusal('invalid-checkout', `Default ${slotId} is not an environment.`);
    if (record.worktreePath !== checkout) {
      throw refusal('invalid-checkout', `Default checkout ${checkout} does not match ${slotId}.`);
    }
    if (defaults.has(checkout)) throw refusal('invalid-checkout', `Checkout ${checkout} has more than one default.`);
    defaults.add(checkout);
  }
  return snapshot;
}

/**
 * @param {DevWorktreeRegistrySnapshot} snapshot
 * @returns {DevEnvironmentRegistryV2}
 */
export function convertRegistryV1ToV2(snapshot) {
  const v1 = validateRegistryV1(snapshot);
  /** @type {DevEnvironmentRegistryV2} */
  const v2 = {
    version: REGISTRY_VERSION_V2,
    nextSequence: v1.nextSequence,
    environmentsById: {},
    defaultEnvironmentByCheckout: {},
  };
  for (const [checkout, record] of Object.entries(v1.ownersByWorktree)) {
    v2.environmentsById[record.slotId] = {
      slotId: record.slotId,
      worktreePath: record.worktreePath,
      cluster: record.cluster,
      namespace: record.namespace,
      ports: { ...record.ports },
      processIdentity: record.processIdentity ? { ...record.processIdentity } : null,
      resourceUids: { ...record.resourceUids },
      lease: record.lease ? { ...record.lease } : null,
    };
    v2.defaultEnvironmentByCheckout[checkout] = record.slotId;
  }
  return validateRegistryV2(v2);
}

/**
 * @param {string} registryRoot
 * @returns {string}
 */
export function liveDevRegistryRoot() {
  const fromEnv = process.env.OFFSCREEN_DEV_WORKTREE_REGISTRY?.trim();
  if (fromEnv) return resolve(fromEnv);
  return join(homedir(), '.local', 'state', 'offscreen-rpg', 'dev-worktree-registry');
}

/**
 * @param {string} registryRoot
 * @param {string} liveRoot
 */
function assertNotLiveRegistry(registryRoot, liveRoot) {
  const left = existsSync(registryRoot) ? realpathSync(registryRoot) : resolve(registryRoot);
  const right = existsSync(liveRoot) ? realpathSync(liveRoot) : resolve(liveRoot);
  if (left === right) {
    throw refusal('live-migration-refused', 'Refusing to migrate the live host dev registry in this task.');
  }
}

/**
 * Explicit v1→v2 cutover. Does not run unless authorizeCutover is true,
 * and never against the live host root during FU01.
 *
 * @param {string} registryRoot
 * @param {{
 *   authorizeCutover?: boolean,
 *   liveRoot?: string,
 *   copyFile?: (from: string, to: string) => void,
 *   writeSnapshot?: (root: string, snapshot: DevEnvironmentRegistryV2) => void,
 * }} [options]
 * @returns {DevEnvironmentRegistryV2}
 */
export function migrateRegistryV1ToV2(registryRoot, options = {}) {
  const liveRoot = options.liveRoot ?? liveDevRegistryRoot();
  const copyFile = options.copyFile ?? copyFileSync;
  const writeSnapshot = options.writeSnapshot ?? writeRegistry;
  return withRegistryLock({ registryRoot }, () => {
    assertNotLiveRegistry(registryRoot, liveRoot);
    const raw = readRegistryJson(registryRoot);
    if (raw === null) throw refusal('registry-corrupt', 'No v1 registry exists to migrate.');
    const original = readFileSync(registryFilePath(registryRoot), 'utf8');
    const v1 = validateRegistryV1(raw);
    const v2 = convertRegistryV1ToV2(v1);
    if (options.authorizeCutover !== true) {
      throw refusal('migration-unauthorized', 'Registry cutover requires explicit authorization.');
    }
    const file = registryFilePath(registryRoot);
    const backup = join(registryRoot, REGISTRY_V1_BACKUP);
    try {
      copyFile(file, backup);
    } catch (error) {
      throw refusal('backup-failed', `Registry backup failed: ${/** @type {Error} */ (error).message}`);
    }
    try {
      writeSnapshot(registryRoot, v2);
    } catch (error) {
      writeFileSync(file, original, 'utf8');
      throw refusal('registry-write-failed', `Registry v2 write failed: ${/** @type {Error} */ (error).message}`);
    }
    const written = readRegistryJson(registryRoot);
    return validateRegistryV2(written);
  });
}

/**
 * Live host cutover. Separate from migrateRegistryV1ToV2 so the FU01 live
 * refusal stays intact. Requires an already-passing preflight and explicit
 * authorization. Does not stop processes or change workload state.
 *
 * @param {string} registryRoot
 * @param {{ ok?: boolean, sessionsVerified?: boolean }} preflight
 * @param {{ authorizeLiveCutover?: boolean }} [options]
 */
export function cutoverAuthorizedLiveRegistry(registryRoot, preflight, options = {}) {
  if (options.authorizeLiveCutover !== true) {
    throw refusal('migration-unauthorized', 'Live registry cutover requires explicit authorization.');
  }
  if (!preflight || preflight.ok !== true || preflight.sessionsVerified !== true) {
    throw refusal('cutover-preflight-failed', 'Live cutover requires a passing session preflight.');
  }
  const liveRoot = liveDevRegistryRoot();
  const left = existsSync(registryRoot) ? realpathSync(registryRoot) : resolve(registryRoot);
  const right = existsSync(liveRoot) ? realpathSync(liveRoot) : resolve(liveRoot);
  if (left !== right) {
    throw refusal('live-migration-refused', 'Authorized live cutover only applies to the real host registry.');
  }
  return withRegistryLock({ registryRoot }, () => {
    const file = registryFilePath(registryRoot);
    const original = readFileSync(file, 'utf8');
    const raw = JSON.parse(original);
    const v1 = validateRegistryV1(raw);
    const v2 = convertRegistryV1ToV2(v1);
    validateRegistryV2(v2);
    const backup = join(registryRoot, REGISTRY_V1_BACKUP);
    if (existsSync(backup)) {
      throw refusal('backup-failed', 'A v1 backup already exists; refusing to overwrite it.');
    }
    try {
      copyFileSync(file, backup);
    } catch (error) {
      throw refusal('backup-failed', `Registry backup failed: ${/** @type {Error} */ (error).message}`);
    }
    try {
      writeRegistry(registryRoot, v2);
    } catch (error) {
      writeFileSync(file, original, 'utf8');
      throw refusal('registry-write-failed', `Registry v2 write failed: ${/** @type {Error} */ (error).message}`);
    }
    const written = readFileSync(file, 'utf8');
    const receipt = {
      cutoverAt: new Date().toISOString(),
      v2Sha256: createHash('sha256').update(written).digest('hex'),
      backup,
      slotIds: Object.keys(v2.environmentsById),
      recovery: 'Restore owners.json.v1-backup only through rollbackLiveRegistryCutover while the v2 hash still matches this receipt.',
    };
    writeFileSync(join(registryRoot, REGISTRY_CUTOVER_RECEIPT), `${JSON.stringify(receipt)}\n`, 'utf8');
    return validateRegistryV2(JSON.parse(written));
  });
}

/**
 * Restores the v1 backup only when the current file is still the cutover v2.
 *
 * @param {string} registryRoot
 */
export function rollbackLiveRegistryCutover(registryRoot) {
  return withRegistryLock({ registryRoot }, () => {
    const receiptPath = join(registryRoot, REGISTRY_CUTOVER_RECEIPT);
    if (!existsSync(receiptPath)) {
      throw refusal('cutover-receipt-missing', 'No cutover receipt; refusing to restore a backup.');
    }
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    const file = registryFilePath(registryRoot);
    const current = readFileSync(file, 'utf8');
    const hash = createHash('sha256').update(current).digest('hex');
    if (hash !== receipt.v2Sha256) {
      throw refusal('rollback-refused', 'Registry changed after cutover; refusing to overwrite it with the v1 backup.');
    }
    const backup = join(registryRoot, REGISTRY_V1_BACKUP);
    writeFileSync(file, readFileSync(backup, 'utf8'), 'utf8');
    return validateRegistryV1(JSON.parse(readFileSync(file, 'utf8')));
  });
}

/**
 * @param {DevEnvironmentRegistryV2} snapshot
 * @param {string} slotId
 * @returns {DevWorktreeOwnerRecord}
 */
export function lookupEnvironment(snapshot, slotId) {
  const record = snapshot.environmentsById[slotId];
  if (!record) throw refusal('unknown-environment', `Unknown environment id: ${slotId}`);
  return record;
}

/**
 * @param {DevEnvironmentRegistryV2} snapshot
 * @param {string} checkout
 * @returns {DevWorktreeOwnerRecord | null}
 */
export function lookupDefaultEnvironment(snapshot, checkout) {
  const slotId = snapshot.defaultEnvironmentByCheckout[checkout];
  if (!slotId) return null;
  return lookupEnvironment(snapshot, slotId);
}

/**
 * @param {DevEnvironmentRegistryV2} snapshot
 * @returns {DevWorktreeOwnerRecord[]}
 */
export function listEnvironments(snapshot) {
  return Object.values(snapshot.environmentsById);
}

/**
 * @param {DevEnvironmentRegistryV2} snapshot
 * @returns {Set<number>}
 */
export function collectReservedPortsV2(snapshot) {
  /** @type {Set<number>} */
  const ports = new Set();
  for (const record of Object.values(snapshot.environmentsById)) {
    for (const value of Object.values(record.ports)) ports.add(value);
  }
  return ports;
}