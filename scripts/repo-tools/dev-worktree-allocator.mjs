import { createServer } from 'node:net';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REGISTRY_VERSION,
  REGISTRY_VERSION_V2,
  allocateNextSequence,
  collectReservedPorts,
  collectReservedPortsV2,
  deriveDevNamespace,
  encodeDnsSafeSlotId,
  isAllocatorRefusal,
  isDnsSafeSlotId,
  listEnvironments,
  lookupDefaultEnvironment,
  lookupEnvironment,
  mutateRegistry,
  readRegistry,
  readRegistryV2,
  refusal,
  withRegistryLock,
  writeRegistry,
} from './dev-worktree-registry.mjs';

/** @typedef {import('./dev-worktree-registry.mjs').DevWorktreeRegistrySnapshot} DevWorktreeRegistrySnapshot */
/** @typedef {import('./dev-worktree-registry.mjs').DevWorktreeOwnerRecord} DevWorktreeOwnerRecord */

export const DEV_CLUSTER_NAME = 'kind-offscreen-dev';
export const DEFAULT_PORT_BUNDLE_SIZE = 4;
export const DEFAULT_PORT_RANGE = Object.freeze({
  start: 13_100,
  end: 19_990,
});

/** @typedef {{
 *   game: number,
 *   control: number,
 *   tilt: number,
 *   spare: number,
 * }} DevPortBundle */

/** @typedef {{
 *   canonicalizePath?: (worktreePath: string) => string,
 *   isPortAvailable?: (port: number) => boolean,
 *   readProcessIdentity?: (pid: number) => { startTimeJiffies: number } | null,
 *   cluster?: string,
 *   portRange?: { start: number, end: number },
 *   bundleSize?: number,
 *   lockTimeoutMs?: number,
 * }} DevWorktreeAllocatorDeps */

/**
 * @returns {{ supported: boolean, api: string }}
 */
export function getProcessIdentitySupport() {
  if (process.platform === 'linux' && existsSync(`/proc/${process.pid}`)) {
    return { supported: true, api: 'linux:/proc/<pid>/stat:starttime' };
  }
  if (process.platform === 'darwin') {
    return { supported: false, api: 'darwin:process-identity-unimplemented' };
  }
  if (process.platform === 'win32') {
    return { supported: false, api: 'win32:process-identity-unimplemented' };
  }
  return { supported: false, api: `${process.platform}:process-identity-unimplemented` };
}

/**
 * @param {number} pid
 * @returns {{ startTimeJiffies: number } | null}
 */
export function readLinuxProcessStartTime(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const support = getProcessIdentitySupport();
  if (!support.supported) return null;
  const statPath = `/proc/${pid}/stat`;
  if (!existsSync(statPath)) return null;
  const raw = readFileSync(statPath, 'utf8');
  const close = raw.lastIndexOf(')');
  if (close < 0) return null;
  const rest = raw.slice(close + 2).split(' ');
  const startTimeJiffies = Number(rest[19]);
  if (!Number.isFinite(startTimeJiffies)) return null;
  return { startTimeJiffies };
}

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function probeLoopbackPortBindable(port) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', (error) => {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EADDRINUSE') {
        resolvePort(false);
        return;
      }
      reject(error);
    });
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      server.close(() => resolvePort(true));
    });
  });
}

/**
 * @param {number} port
 * @returns {boolean}
 */
export function probeLoopbackPortBindableSync(port) {
  try {
    const server = createServer();
    server.listen({ host: '127.0.0.1', port, exclusive: true });
    server.close();
    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EADDRINUSE') {
      return false;
    }
    throw error;
  }
}

/**
 * @param {number} slotIndex
 * @param {{ start: number, end: number }} range
 * @param {number} bundleSize
 * @returns {DevPortBundle | null}
 */
export function planPortBundleForSlotIndex(slotIndex, range, bundleSize = DEFAULT_PORT_BUNDLE_SIZE) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0) return null;
  if (!Number.isInteger(bundleSize) || bundleSize < 4) return null;
  if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.end < range.start) return null;
  const base = range.start + slotIndex * bundleSize;
  const bundle = {
    game: base,
    control: base + 1,
    tilt: base + 2,
    spare: base + 3,
  };
  const last = base + bundleSize - 1;
  if (last > range.end || bundle.spare > range.end) return null;
  const distinct = new Set(portBundleValues(bundle));
  if (distinct.size !== 4) return null;
  return bundle;
}

/**
 * @param {{ pid: number, startTimeJiffies: number }} lease
 * @param {(pid: number) => { startTimeJiffies: number } | null} readProcessIdentity
 */
function processIdentityMatchesLease(lease, readProcessIdentity) {
  const current = readProcessIdentity(lease.pid);
  if (!current) return false;
  return current.startTimeJiffies === lease.startTimeJiffies;
}

/**
 * @param {DevPortBundle} bundle
 * @returns {number[]}
 */
export function portBundleValues(bundle) {
  return [bundle.game, bundle.control, bundle.tilt, bundle.spare];
}

/**
 * @param {DevPortBundle} left
 * @param {DevPortBundle} right
 * @returns {boolean}
 */
export function portBundlesDisjoint(left, right) {
  const a = new Set(portBundleValues(left));
  for (const value of portBundleValues(right)) {
    if (a.has(value)) return false;
  }
  return true;
}

/**
 * @param {DevWorktreeAllocatorDeps} [deps]
 * @returns {Required<Pick<DevWorktreeAllocatorDeps,
 *   'canonicalizePath' | 'isPortAvailable' | 'readProcessIdentity' | 'cluster' | 'portRange' | 'bundleSize'>>}
 *   & Pick<DevWorktreeAllocatorDeps, 'lockTimeoutMs'>
 */
export function resolveAllocatorDeps(deps = {}) {
  if (deps.cluster !== undefined && deps.cluster !== DEV_CLUSTER_NAME) {
    throw refusal('invalid-cluster', `Cluster is not the dev cluster: ${deps.cluster}`);
  }
  const identity = deps.readProcessIdentity ?? readLinuxProcessStartTime;
  return {
    canonicalizePath: deps.canonicalizePath ?? ((worktreePath) => {
      try {
        return realpathSync(resolve(worktreePath));
      } catch {
        throw refusal('invalid-worktree', `Worktree path does not resolve: ${worktreePath}`);
      }
    }),
    isPortAvailable: deps.isPortAvailable ?? probeLoopbackPortBindableSync,
    readProcessIdentity: identity,
    cluster: deps.cluster ?? DEV_CLUSTER_NAME,
    portRange: deps.portRange ?? DEFAULT_PORT_RANGE,
    bundleSize: deps.bundleSize ?? DEFAULT_PORT_BUNDLE_SIZE,
    lockTimeoutMs: deps.lockTimeoutMs,
  };
}

/**
 * @param {DevWorktreeRegistrySnapshot} snapshot
 * @param {{ start: number, end: number }} range
 * @param {number} bundleSize
 * @param {(port: number) => boolean} isPortAvailable
 * @returns {DevPortBundle}
 */
export function selectPortBundle(snapshot, range, bundleSize, isPortAvailable) {
  const reserved = collectReservedPorts(snapshot);
  const maxSlots = Math.floor((range.end - range.start + 1) / bundleSize);
  for (let slotIndex = 0; slotIndex < maxSlots; slotIndex += 1) {
    const bundle = planPortBundleForSlotIndex(slotIndex, range, bundleSize);
    if (!bundle) break;
    const ports = portBundleValues(bundle);
    if (ports.some((port) => reserved.has(port))) continue;
    if (ports.some((port) => !isPortAvailable(port))) continue;
    return bundle;
  }
  throw refusal('exhausted-port-range', 'No free loopback port bundle remains in the configured range.');
}

/**
 * @param {string} worktreePath
 * @param {string} registryRoot
 * @param {DevWorktreeAllocatorDeps} [deps]
 */
export function allocateDevWorktreeOwner(worktreePath, registryRoot, deps = {}) {
  const resolved = resolveAllocatorDeps(deps);
  const canonical = resolved.canonicalizePath(worktreePath);

  return mutateRegistry(
    registryRoot,
    (snapshot) => {
      if (snapshot.version !== REGISTRY_VERSION) {
        throw refusal('registry-version', `Unsupported registry version: ${snapshot.version}`);
      }

      const existing = snapshot.ownersByWorktree[canonical];
      if (existing) {
        assertOwnerMatchesWorktree(existing, canonical);
        ensurePortsStillOwned(existing, resolved.isPortAvailable);
        return existing;
      }

      const sequence = allocateNextSequence(snapshot);
      const slotId = encodeDnsSafeSlotId(sequence);
      if (!isDnsSafeSlotId(slotId)) {
        throw refusal('invalid-slot-id', `Allocated slot id is not DNS-safe: ${slotId}`);
      }
      const ports = selectPortBundle(snapshot, resolved.portRange, resolved.bundleSize, resolved.isPortAvailable);

      /** @type {DevWorktreeOwnerRecord} */
      const record = {
        slotId,
        worktreePath: canonical,
        cluster: resolved.cluster,
        namespace: deriveDevNamespace(slotId),
        ports,
        processIdentity: null,
        resourceUids: {},
        lease: null,
      };
      snapshot.ownersByWorktree[canonical] = record;
      return record;
    },
    { lockTimeoutMs: resolved.lockTimeoutMs },
  );
}

/**
 * @param {DevWorktreeOwnerRecord} record
 * @param {string} canonicalWorktree
 */
export function assertOwnerMatchesWorktree(record, canonicalWorktree) {
  if (record.worktreePath !== canonicalWorktree) {
    throw refusal('wrong-worktree', 'The requested worktree does not match the stored owner record.');
  }
}

/**
 * @param {DevWorktreeOwnerRecord} record
 * @param {(port: number) => boolean} isPortAvailable
 * @param {(pid: number) => { startTimeJiffies: number } | null} [readProcessIdentity]
 */
export function ensurePortsStillOwned(record, isPortAvailable, readProcessIdentity = readLinuxProcessStartTime) {
  const uniquePorts = [...new Set(portBundleValues(record.ports))];
  for (const port of uniquePorts) {
    if (isPortAvailable(port)) continue;
    if (record.lease === null || !processIdentityMatchesLease(record.lease, readProcessIdentity)) {
      throw refusal('foreign-listener', `127.0.0.1:${port} is occupied by a foreign listener.`);
    }
  }
}

/**
 * @param {{
 *   owner: DevWorktreeOwnerRecord,
 *   pid: number,
 *   resourceUids?: Record<string, string>,
 *   ownerLabels?: Record<string, string>,
 *   expectedOwnerLabel?: string,
 * }} input
 * @param {DevWorktreeAllocatorDeps} [deps]
 */
export function attachDevWorktreeProcess(input, deps = {}) {
  const resolvedDeps = resolveAllocatorDeps(deps);
  const identity = resolvedDeps.readProcessIdentity(input.pid);
  if (!identity) {
    const support = getProcessIdentitySupport();
    if (!support.supported) {
      throw refusal('unsupported-process-identity', `Cannot validate process identity on this platform (${support.api}).`);
    }
    throw refusal('invalid-process', `Process ${input.pid} is not running or not observable.`);
  }

  const resourceUids = input.resourceUids ?? {};
  for (const [name, uid] of Object.entries(resourceUids)) {
    const prior = input.owner.resourceUids[name];
    if (prior && prior !== uid) {
      throw refusal('resource-uid-mismatch', `Resource ${name} UID does not match the owner record.`);
    }
  }
  if (input.expectedOwnerLabel && input.ownerLabels) {
    const observed = input.ownerLabels['offscreen.dev/owner'];
    if (observed && observed !== input.expectedOwnerLabel) {
      throw refusal('owner-label-mismatch', 'Kubernetes owner label does not match this worktree owner.');
    }
  }

  input.owner.processIdentity = { pid: input.pid, startTimeJiffies: identity.startTimeJiffies };
  input.owner.lease = {
    pid: input.pid,
    startTimeJiffies: identity.startTimeJiffies,
    acquiredAt: new Date().toISOString(),
  };
  input.owner.resourceUids = { ...input.owner.resourceUids, ...resourceUids };
  return input.owner;
}

/**
 * Persist a process lease so a later allocation recognizes this worktree's listener.
 *
 * @param {string} worktreePath
 * @param {string} registryRoot
 * @param {number} pid
 * @param {DevWorktreeAllocatorDeps} [deps]
 */
export function persistDevWorktreeLease(worktreePath, registryRoot, pid, deps = {}) {
  const resolved = resolveAllocatorDeps(deps);
  const canonical = resolved.canonicalizePath(worktreePath);
  return mutateRegistry(
    registryRoot,
    (snapshot) => {
      const owner = snapshot.ownersByWorktree[canonical];
      if (!owner) {
        throw refusal('missing-owner', `No dev owner is registered for ${canonical}.`);
      }
      return attachDevWorktreeProcess({ owner, pid }, deps);
    },
    { lockTimeoutMs: resolved.lockTimeoutMs },
  );
}

/**
 * @param {{
 *   owner: DevWorktreeOwnerRecord,
 *   pid: number,
 *   resourceUids?: Record<string, string>,
 *   ownerLabels?: Record<string, string>,
 *   expectedOwnerLabel?: string,
 * }} input
 * @param {DevWorktreeAllocatorDeps} [deps]
 */
export function reconcileStaleDevWorktreeProcess(input, deps = {}) {
  const resolvedDeps = resolveAllocatorDeps(deps);
  if (!input.owner.lease) {
    throw refusal('missing-lease', 'Cannot reconcile a stale process without a stored lease.');
  }

  const live = resolvedDeps.readProcessIdentity(input.pid);
  if (!live) {
    return reconcileStaleWithoutLiveProcess(input);
  }

  if (live.startTimeJiffies !== input.owner.lease.startTimeJiffies) {
    throw refusal(
      'stale-pid-reused',
      `PID ${input.pid} was reused by another process; refusing reclaim without killing it.`,
    );
  }

  if (input.pid !== input.owner.lease.pid) {
    throw refusal('wrong-worktree', 'The requested process does not belong to this worktree owner.');
  }

  return input.owner;
}

/**
 * @param {{
 *   owner: DevWorktreeOwnerRecord,
 *   resourceUids?: Record<string, string>,
 *   ownerLabels?: Record<string, string>,
 *   expectedOwnerLabel?: string,
 * }} input
 */
export function reconcileStaleWithoutLiveProcess(input) {
  for (const [name, uid] of Object.entries(input.resourceUids ?? {})) {
    const prior = input.owner.resourceUids[name];
    if (prior && prior !== uid) {
      throw refusal('resource-uid-mismatch', `Resource ${name} UID does not match the owner record.`);
    }
  }
  if (input.expectedOwnerLabel && input.ownerLabels) {
    const observed = input.ownerLabels['offscreen.dev/owner'];
    if (observed && observed !== input.expectedOwnerLabel) {
      throw refusal('owner-label-mismatch', 'Kubernetes owner label does not match this worktree owner.');
    }
  }

  input.owner.lease = null;
  input.owner.processIdentity = null;
  return input.owner;
}

/**
 * @param {string} registryRoot
 * @returns {DevWorktreeOwnerRecord[]}
 */
export function listDevWorktreeOwners(registryRoot) {
  const snapshot = readRegistry(registryRoot);
  return Object.values(snapshot.ownersByWorktree);
}

/**
 * Allocate another environment id. An existing checkout default stays unless
 * `setAsDefault` is true and no default exists, or `replaceDefault` is true.
 *
 * @param {string} checkoutPath
 * @param {string} registryRoot
 * @param {DevWorktreeAllocatorDeps & { setAsDefault?: boolean, replaceDefault?: boolean }} [deps]
 */
export function allocateIndependentEnvironment(checkoutPath, registryRoot, deps = {}) {
  const resolved = resolveAllocatorDeps(deps);
  const canonical = resolved.canonicalizePath(checkoutPath);
  return withRegistryLock({ registryRoot, lockTimeoutMs: resolved.lockTimeoutMs }, () => {
    const snapshot = readRegistryV2(registryRoot);
    if (snapshot.version !== REGISTRY_VERSION_V2) {
      throw refusal('registry-version', `Unsupported registry version: ${snapshot.version}`);
    }
    const sequence = snapshot.nextSequence;
    snapshot.nextSequence = sequence + 1;
    const slotId = encodeDnsSafeSlotId(sequence);
    if (snapshot.environmentsById[slotId]) {
      throw refusal('slot-id-collision', `DNS-safe slot id collision: ${slotId}`);
    }
    const reservedView = {
      version: REGISTRY_VERSION,
      nextSequence: snapshot.nextSequence,
      ownersByWorktree: Object.fromEntries(
        Object.values(snapshot.environmentsById).map((record) => [record.slotId, record]),
      ),
    };
    const ports = selectPortBundle(
      reservedView,
      resolved.portRange,
      resolved.bundleSize,
      resolved.isPortAvailable,
    );
    /** @type {DevWorktreeOwnerRecord} */
    const record = {
      slotId,
      worktreePath: canonical,
      cluster: resolved.cluster,
      namespace: deriveDevNamespace(slotId),
      ports,
      processIdentity: null,
      resourceUids: {},
      lease: null,
    };
    snapshot.environmentsById[slotId] = record;
    const currentDefault = snapshot.defaultEnvironmentByCheckout[canonical];
    if (!currentDefault && deps.setAsDefault === true) {
      snapshot.defaultEnvironmentByCheckout[canonical] = slotId;
    } else if (currentDefault && deps.replaceDefault === true) {
      snapshot.defaultEnvironmentByCheckout[canonical] = slotId;
    }
    writeRegistry(registryRoot, snapshot);
    return record;
  });
}

/**
 * @param {string} registryRoot
 * @param {string} slotId
 */
export function getEnvironment(registryRoot, slotId) {
  return lookupEnvironment(readRegistryV2(registryRoot), slotId);
}

/**
 * @param {string} registryRoot
 * @param {string} checkoutPath
 * @param {DevWorktreeAllocatorDeps} [deps]
 */
export function getDefaultEnvironment(registryRoot, checkoutPath, deps = {}) {
  const canonical = resolveAllocatorDeps(deps).canonicalizePath(checkoutPath);
  return lookupDefaultEnvironment(readRegistryV2(registryRoot), canonical);
}

/**
 * @param {string} registryRoot
 */
export function listIndependentEnvironments(registryRoot) {
  return listEnvironments(readRegistryV2(registryRoot));
}

export { collectReservedPortsV2 };

export { isAllocatorRefusal, encodeDnsSafeSlotId, isDnsSafeSlotId, deriveDevNamespace };