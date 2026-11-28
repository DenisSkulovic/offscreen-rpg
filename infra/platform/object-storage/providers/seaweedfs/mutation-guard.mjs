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
  readSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  assertPlatformTarget,
  readPlatformObject,
  RELEASE_BASELINE_NAMESPACE,
} from '../../../common/commands.mjs';
import { DEV_BASELINE_NAMESPACE } from '../../../../clusters/kind/manager/dev-bootstrap.mjs';
import { readPlatformProfile } from '../../../common/profile.mjs';

export const LOCK_WAIT_SECONDS = 30;
export const INSTALL_BUDGET_MS = 600_000;
export const HELM_WAIT_SECONDS = 180;

const CHILD_KILL_GRACE_MS = 5_000;
const OBJECT_STORE_PVC = 'object-store-data';
const OBJECT_STORE_POD_LABEL = 'app=object-store';
const PROOF_NONCE_LABEL = 'offscreen.dev/proof-nonce';

const ANCHORED_IDENTITY_FIELDS = Object.freeze([
  'contextName',
  'loopbackEndpoint',
  'kubeSystemUid',
  'baselineNamespaceUid',
  'targetNamespaceName',
]);

const IDENTITY_FIELDS = Object.freeze([
  ...ANCHORED_IDENTITY_FIELDS,
  'targetNamespaceUid',
  'targetNamespaceNonce',
  'podName',
  'podUid',
  'pvcName',
  'pvcUid',
  'pvName',
  'pvUid',
]);

const DEFAULT_STATE_ROOT = join(
  homedir(),
  '.local/state/offscreen-rpg/platform-locks',
);

function assertPrivate(stat, directory) {
  if (
    (directory ? !stat.isDirectory() : !stat.isFile()) ||
    stat.uid !== process.getuid() ||
    (stat.mode & 0o077) !== 0
  ) {
    throw new Error('Unsafe object storage lock location');
  }
}

/**
 * @param {string} stateRoot
 * @param {string} contextName
 */
export function resolveObjectStorageLockPaths(stateRoot, contextName) {
  return {
    lock: join(stateRoot, `${contextName}-object-storage.lock`),
    pending: join(stateRoot, `${contextName}-object-storage.pending.json`),
  };
}

function defaultStateRoot() {
  return DEFAULT_STATE_ROOT;
}

export function defaultObjectStorageStateRoot() {
  return DEFAULT_STATE_ROOT;
}

/**
 * @param {string} dir
 */
function fsyncDirectory(dir) {
  const opened = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY);
  try {
    fsyncSync(opened);
  } finally {
    closeSync(opened);
  }
}

/**
 * @param {string} path
 * @param {string} payload
 */
function writePendingDurable(path, payload) {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  assertPrivate(lstatSync(directory), true);
  if (existsSync(path)) {
    const existing = lstatSync(path);
    if (existing.isSymbolicLink()) {
      throw new Error('Object storage pending path is a symlink');
    }
    throw new Error('Object storage pending already exists');
  }
  const opened = openSync(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    const stat = fstatSync(opened);
    assertPrivate(stat, false);
    const named = lstatSync(path);
    if (
      stat.ino !== named.ino ||
      stat.dev !== named.dev ||
      named.isSymbolicLink()
    ) {
      throw new Error('Object storage pending identity mismatch');
    }
    const bytes = Buffer.from(payload, 'utf8');
    writeSync(opened, bytes, 0, bytes.length);
    fsyncSync(opened);
  } finally {
    closeSync(opened);
  }
  fsyncDirectory(directory);
}

/**
 * @param {string} path
 */
function clearPendingDurable(path) {
  if (!existsSync(path)) return;
  const directory = dirname(path);
  unlinkSync(path);
  fsyncDirectory(directory);
}

/**
 * @param {string} pendingPath
 */
function readExistingPending(pendingPath) {
  try {
    const stat = lstatSync(pendingPath);
    assertPrivate(stat, false);
    if (stat.nlink !== 1) {
      return { malformed: true };
    }
    const body = readFileSync(pendingPath, 'utf8');
    JSON.parse(body);
    return { present: true };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    return { malformed: true };
  }
}

/**
 * @param {string} lockPath
 * @param {number} waitMs
 */
function openAndAcquireLock(lockPath, waitMs) {
  const dir = dirname(lockPath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  assertPrivate(lstatSync(dir), true);
  const opened = openSync(
    lockPath,
    constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    const stat = fstatSync(opened);
    assertPrivate(stat, false);
    const named = lstatSync(lockPath);
    if (stat.ino !== named.ino || stat.dev !== named.dev || stat.nlink !== 1) {
      throw new Error('Object storage lock identity mismatch');
    }
    const waitSeconds = Math.min(
      LOCK_WAIT_SECONDS,
      Math.max(0, Math.floor(waitMs / 1000)),
    );
    const flock = spawnSync(
      'flock',
      ['--exclusive', '--wait', String(waitSeconds), '3'],
      { stdio: ['ignore', 'ignore', 'ignore', opened] },
    );
    if (flock.error?.code === 'ENOENT') {
      throw new Error('flock utility unavailable');
    }
    if (flock.error || flock.status !== 0) {
      throw new Error('Object storage lock unavailable');
    }
    return opened;
  } catch (error) {
    closeSync(opened);
    throw error;
  }
}

/**
 * @param {Record<string, unknown>} identity
 */
function assertAnchoredIdentityKnown(identity) {
  for (const field of ANCHORED_IDENTITY_FIELDS) {
    const value = identity[field];
    if (value == null || value === '') {
      throw new Error('Object storage anchored identity incomplete');
    }
  }
}

/**
 * @param {Record<string, unknown>} captured
 * @param {Record<string, unknown>} next
 */
function identityMatchesBeforeWrite(captured, next) {
  for (const field of IDENTITY_FIELDS) {
    const before = captured[field];
    const after = next[field];
    if (ANCHORED_IDENTITY_FIELDS.includes(field)) {
      if (before !== after) {
        return false;
      }
      continue;
    }
    if (before == null || before === '') {
      if (after != null && after !== '') {
        return false;
      }
      continue;
    }
    if (before !== after) {
      return false;
    }
  }
  return true;
}

/**
 * @param {Record<string, unknown>} captured
 * @param {Record<string, unknown>} next
 */
function identityAdoptAfterWrite(captured, next) {
  for (const field of IDENTITY_FIELDS) {
    const before = captured[field];
    const after = next[field];
    if (ANCHORED_IDENTITY_FIELDS.includes(field)) {
      if (before !== after) {
        return false;
      }
      continue;
    }
    if (before == null || before === '') {
      if (after != null && after !== '') {
        captured[field] = after;
      }
      continue;
    }
    if (before !== after) {
      return false;
    }
  }
  return true;
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} timeoutMs
 */
function awaitBoundedChild(child, timeoutMs, input) {
  return new Promise((resolve) => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const maxOutputBytes = 4 * 1024 * 1024;
    let outputBytes = 0;
    let failed = false;
    let timedOut = false;
    let killTimer;
    let closed = false;

    function terminate() {
      failed = true;
      if (closed || killTimer !== undefined) return;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => {
        if (!closed) child.kill('SIGKILL');
      }, CHILD_KILL_GRACE_MS);
    }

    function collect(chunks, chunk) {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        terminate();
        return;
      }
      chunks.push(chunk);
    }

    child.stdout?.on('data', (chunk) => collect(stdoutChunks, chunk));
    child.stderr?.on('data', (chunk) => collect(stderrChunks, chunk));
    child.stdout?.on('error', terminate);
    child.stderr?.on('error', terminate);
    child.stdin?.on('error', terminate);
    child.on('error', () => { failed = true; });
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);

    // Exit alone does not guarantee that the output has been drained.
    // Spawn errors also lead to close; never release custody on error alone.
    child.once('close', (status, signal) => {
      closed = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      const ok = status === 0 && !signal && !failed;
      resolve({
        ok,
        status: status ?? null,
        signal: signal ?? null,
        timedOut,
        unknown: failed || signal != null,
        stdout: ok ? Buffer.concat(stdoutChunks).toString('utf8') : '',
        stderr: ok ? Buffer.concat(stderrChunks).toString('utf8') : '',
      });
    });

    try {
      child.stdin?.end(input);
    } catch {
      terminate();
    }
  });
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {import('../../../common/commands.mjs').runPlatformCommand} run
 */
async function defaultReadIdentity(profileId, run) {
  try {
    const profile = readPlatformProfile(profileId);
    const target = assertPlatformTarget(profileId, { run });
    const kubeSystem = readPlatformObject(
      { profileId, resource: 'namespace', name: 'kube-system' },
      { run },
    );
    if (kubeSystem.state !== 'present' || !kubeSystem.object?.metadata?.uid) {
      return { state: 'unknown', reason: 'kube-system uid unreadable' };
    }
    const baselineName =
      profileId === 'dev' ? DEV_BASELINE_NAMESPACE : RELEASE_BASELINE_NAMESPACE;
    const baseline = readPlatformObject(
      { profileId, resource: 'namespace', name: baselineName },
      { run },
    );
    if (baseline.state !== 'present' || !baseline.object?.metadata?.uid) {
      return { state: 'unknown', reason: 'baseline namespace uid unreadable' };
    }
    const objectNs = readPlatformObject(
      {
        profileId,
        resource: 'namespace',
        name: profile.namespaces.objectStorage,
      },
      { run },
    );
    const targetUid =
      objectNs.state === 'present'
        ? (objectNs.object?.metadata?.uid ?? null)
        : objectNs.state === 'absent'
          ? null
          : undefined;
    if (targetUid === undefined) {
      return { state: 'unknown', reason: 'target namespace unreadable' };
    }
    const nonce =
      objectNs.state === 'present'
        ? (objectNs.object?.metadata?.labels?.[PROOF_NONCE_LABEL] ?? null)
        : null;

    const pods = run('kubectl', [
      '--context',
      profile.contextName,
      '-n',
      profile.namespaces.objectStorage,
      'get',
      'pods',
      '-l',
      OBJECT_STORE_POD_LABEL,
      '-o',
      'json',
    ]);
    /** @type {{ podName: string|null, podUid: string|null, pvcName: string|null, pvcUid: string|null, pvName: string|null, pvUid: string|null }} */
    let chain = {
      podName: null,
      podUid: null,
      pvcName: null,
      pvcUid: null,
      pvName: null,
      pvUid: null,
    };
    if (pods.ok && pods.stdout.trim()) {
      const body = JSON.parse(pods.stdout);
      const items = Array.isArray(body?.items) ? body.items : [];
      if (items.length > 1) {
        return { state: 'unknown', reason: 'multiple object-store pods' };
      }
      const ready = items.find(
        (pod) =>
          pod?.metadata?.name &&
          pod?.metadata?.uid &&
          Array.isArray(pod?.status?.conditions) &&
          pod.status.conditions.some(
            (cond) => cond.type === 'Ready' && cond.status === 'True',
          ),
      );
      if (ready) {
        chain.podName = ready.metadata.name;
        chain.podUid = ready.metadata.uid;
      } else if (items.length === 1 && items[0]?.metadata?.name) {
        chain.podName = items[0].metadata.name;
        chain.podUid = items[0].metadata.uid ?? null;
      }
    }
    const pvc = readPlatformObject(
      {
        profileId,
        resource: 'pvc',
        name: OBJECT_STORE_PVC,
        namespace: profile.namespaces.objectStorage,
      },
      { run },
    );
    if (pvc.state === 'present') {
      chain.pvcName = OBJECT_STORE_PVC;
      chain.pvcUid = pvc.object?.metadata?.uid ?? null;
      const volumeName = pvc.object?.spec?.volumeName;
      if (typeof volumeName === 'string' && volumeName.length > 0) {
        const pv = readPlatformObject(
          { profileId, resource: 'pv', name: volumeName },
          { run },
        );
        if (pv.state === 'present') {
          chain.pvName = volumeName;
          chain.pvUid = pv.object?.metadata?.uid ?? null;
        }
      }
    } else if (pvc.state === 'absent') {
      chain.pvcName = null;
    } else {
      return { state: 'unknown', reason: 'provider pvc unreadable' };
    }

    return {
      state: 'known',
      identity: {
        contextName: profile.contextName,
        loopbackEndpoint: `127.0.0.1:${target.port}`,
        kubeSystemUid: kubeSystem.object.metadata.uid,
        baselineNamespaceUid: baseline.object.metadata.uid,
        targetNamespaceName: profile.namespaces.objectStorage,
        targetNamespaceUid: targetUid,
        targetNamespaceNonce: nonce,
        ...chain,
      },
    };
  } catch (error) {
    return {
      state: 'unknown',
      reason:
        error instanceof Error ? error.message : 'identity observation failed',
    };
  }
}

/**
 * @param {string} contextName
 * @param {string} namespace
 * @param {string} uid
 */
export function buildDisposableNamespaceDeleteInvocation(
  contextName,
  namespace,
  uid,
) {
  if (
    typeof namespace !== 'string' ||
    namespace.length === 0 ||
    typeof uid !== 'string' ||
    uid.length === 0
  ) {
    throw new Error('invalid disposable namespace cleanup target');
  }
  return {
    argv: [
      'kubectl',
      '--context',
      contextName,
      'delete',
      '--raw',
      `/api/v1/namespaces/${namespace}`,
      '-f',
      '-',
    ],
    body: JSON.stringify({
      apiVersion: 'v1',
      kind: 'DeleteOptions',
      preconditions: { uid },
      propagationPolicy: 'Foreground',
    }),
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {(ctx: {
 *   runWrite: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => Promise<object>,
 *   remaining: () => number,
 *   identity: object,
 *   profileId: 'dev' | 'release',
 * }) => Promise<{ ok: boolean, detail?: string }>} operation
 * @param {{
 *   stateRoot?: string,
 *   now?: () => number,
 *   budgetMs?: number,
 *   readIdentity?: (profileId: 'dev' | 'release') => Promise<{ state: string, identity?: object, reason?: string }>,
 *   run?: import('../../../common/commands.mjs').runPlatformCommand,
 *   mutationCommands?: string[],
 * }} [deps]
 */
export async function withObjectStorageMutation(
  profileId,
  operation,
  deps = {},
) {
  const profile = readPlatformProfile(profileId);
  const contextName = profile.contextName;
  const stateRoot = deps.stateRoot ?? defaultStateRoot();
  const now = deps.now ?? (() => performance.now());
  const budgetMs = deps.budgetMs ?? INSTALL_BUDGET_MS;
  const deadline = now() + budgetMs;
  const remaining = () => Math.max(0, Math.floor(deadline - now()));
  const run = deps.run;
  const mutationCommands = deps.mutationCommands ?? ['kubectl', 'helm'];
  const readIdentity =
    deps.readIdentity ??
    ((id) =>
      defaultReadIdentity(
        id,
        run ??
          (() => {
            throw new Error('kubectl run required for identity observation');
          }),
      ));

  const { lock: lockPath, pending: pendingPath } =
    resolveObjectStorageLockPaths(stateRoot, contextName);
  const pending = readExistingPending(pendingPath);
  if (pending?.present || pending?.malformed) {
    throw new Error(
      'Object storage mutation refused while pending receipt exists',
    );
  }

  const initial = await readIdentity(profileId);
  if (initial.state !== 'known' || !initial.identity) {
    throw new Error(
      initial.reason ?? 'Object storage identity unknown before mutation',
    );
  }
  assertAnchoredIdentityKnown(
    /** @type {Record<string, unknown>} */ (initial.identity),
  );

  const lockWait = Math.min(LOCK_WAIT_SECONDS * 1000, remaining());
  if (lockWait < 1) {
    throw new Error('Object storage install budget exhausted before lock');
  }

  let lockFd;
  try {
    lockFd = openAndAcquireLock(lockPath, lockWait);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Object storage lock failed';
    if (message.includes('unavailable')) {
      throw new Error('Object storage lock wait timed out');
    }
    throw error;
  }

  /** @type {Record<string, unknown>} */
  const captured = structuredClone(/** @type {object} */ (initial.identity));
  let pendingWritten = false;
  let mutationStarted = false;
  let operationOk = false;

  try {
    // Re-check after flock so a waiter cannot pass the unlocked read and then
    // run once the holder has left a pending receipt. Close the descriptor on
    // this path; the receipt itself stays.
    const pendingAfterLock = readExistingPending(pendingPath);
    if (pendingAfterLock?.present || pendingAfterLock?.malformed) {
      throw new Error(
        'Object storage mutation refused while pending receipt exists',
      );
    }

    const underLock = await readIdentity(profileId);
    if (underLock.state !== 'known' || !underLock.identity) {
      throw new Error(
        underLock.reason ?? 'Object storage identity unknown under lock',
      );
    }
    if (
      !identityMatchesBeforeWrite(
        captured,
        /** @type {Record<string, unknown>} */ (underLock.identity),
      )
    ) {
      throw new Error('Object storage identity changed before mutation');
    }

    /**
     * @param {string} command
     * @param {string[]} args
     * @param {{ input?: string, timeoutMs?: number }} [options]
     */
    const executeWrite = async (command, args, options = {}) => {
      if (!mutationCommands.includes(command)) {
        throw new Error('Object storage mutation command refused');
      }
      const timeoutMs = Math.min(
        options.timeoutMs ?? 15_000,
        remaining() - CHILD_KILL_GRACE_MS,
      );
      if (timeoutMs < 1) {
        throw new Error('Object storage install budget exhausted before write');
      }
      if (remaining() < 1000) {
        throw new Error('Object storage install budget exhausted before write');
      }

      const beforeWrite = await readIdentity(profileId);
      if (beforeWrite.state !== 'known' || !beforeWrite.identity) {
        mutationStarted = true;
        throw new Error('Object storage identity unknown before write');
      }
      if (
        !identityMatchesBeforeWrite(
          captured,
          /** @type {Record<string, unknown>} */ (beforeWrite.identity),
        )
      ) {
        throw new Error('Object storage identity changed before write');
      }

      if (!pendingWritten) {
        const receipt = {
          profileId,
          contextName,
          startedAt: new Date().toISOString(),
          identity: captured,
        };
        writePendingDurable(pendingPath, JSON.stringify(receipt));
        pendingWritten = true;
      }

      mutationStarted = true;
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe', lockFd],
        windowsHide: true,
      });
      const result = await awaitBoundedChild(child, timeoutMs, options.input);
      if (!result.ok || result.unknown) {
        throw new Error('Object storage native write incomplete or unknown');
      }

      const afterWrite = await readIdentity(profileId);
      if (afterWrite.state !== 'known' || !afterWrite.identity) {
        throw new Error(`Object storage identity unknown after write: ${afterWrite.reason ?? 'unclassified'}`);
      }
      if (
        !identityAdoptAfterWrite(
          captured,
          /** @type {Record<string, unknown>} */ (afterWrite.identity),
        )
      ) {
        throw new Error('Object storage identity changed after write');
      }
      return result;
    };

    // The callback receives a scoped, sequential capability. Even a caller
    // that catches a failed write cannot turn it into a successful receipt.
    let active = true;
    let inFlight = null;
    let writeFailed = false;
    const runWrite = (command, args, options = {}) => {
      if (!active || inFlight || writeFailed) {
        writeFailed = true;
        throw new Error('Object storage write outside active sequential custody');
      }
      const task = executeWrite(command, args, options);
      inFlight = task;
      task.then(
        () => { inFlight = null; },
        () => { writeFailed = true; inFlight = null; },
      );
      return task;
    };
    let outcome;
    try {
      outcome = await operation({ runWrite, remaining, identity: captured, profileId });
    } finally {
      active = false;
      if (inFlight) {
        writeFailed = true;
        await inFlight.catch(() => {});
      }
    }
    operationOk = outcome?.ok === true && !writeFailed;
    if (!operationOk) {
      throw new Error('Object storage mutation reported incomplete');
    }

    const finalIdentity = await readIdentity(profileId);
    if (finalIdentity.state !== 'known' || !finalIdentity.identity) {
      throw new Error('Object storage identity unknown after operation');
    }
    if (
      !identityAdoptAfterWrite(
        captured,
        /** @type {Record<string, unknown>} */ (finalIdentity.identity),
      )
    ) {
      throw new Error('Object storage identity changed after operation');
    }
    if (pendingWritten) {
      clearPendingDurable(pendingPath);
    }
    return outcome;
  } catch (error) {
    if (mutationStarted && pendingWritten) {
      // pending intentionally retained
    }
    throw error;
  } finally {
    if (lockFd !== undefined) {
      closeSync(lockFd);
    }
  }
}

/**
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand }} [deps]
 */
export function createObjectStorageIdentityReader(deps = {}) {
  const run = deps.run;
  if (!run) {
    throw new Error('identity reader requires injected run');
  }
  return (profileId) => defaultReadIdentity(profileId, run);
}

// --- Pending state classification and the owner metrics transition boundary ---

const PENDING_MAX_BYTES = 16 * 1024;
const LEGACY_PENDING_KEYS = ['contextName', 'identity', 'profileId', 'startedAt'];
const METRICS_INTENT_KEYS = [
  'contextName',
  'details',
  'identity',
  'operation',
  'operationId',
  'profileId',
  'schema',
  'startedAt',
];
const METRICS_STRING_DETAILS = [
  'predecessorManifestSha256',
  'targetManifestSha256',
  'namespaceUid',
  'deploymentUid',
  'serviceUid',
  'serviceClusterIP',
  'secretUid',
  'secretResourceVersion',
  'pvcUid',
  'pvUid',
  'pvHostPath',
  'oldReplicaSetUid',
  'oldPodUid',
  'oldHelmStorageUid',
  'nodeName',
  'dataDirectoryIdentity',
  'markerSha256',
];
const METRICS_DETAIL_KEYS = [
  'predecessorRevision',
  'targetRevision',
  'markerSize',
  ...METRICS_STRING_DETAILS,
].sort();
const SHA256 = /^[0-9a-f]{64}$/;

function sameKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
  );
}

/**
 * Exact typed parser for the upgrade-metrics intent. Returns the parsed
 * record or null; never tolerates extra, missing or mistyped properties.
 * @param {unknown} record
 */
export function parseMetricsIntent(record) {
  if (!sameKeys(record, METRICS_INTENT_KEYS)) return null;
  const r = /** @type {Record<string, any>} */ (record);
  if (
    r.schema !== 2 ||
    r.operation !== 'upgrade-metrics' ||
    r.profileId !== 'dev' ||
    typeof r.contextName !== 'string' ||
    r.contextName.length === 0 ||
    typeof r.startedAt !== 'string' ||
    Number.isNaN(Date.parse(r.startedAt)) ||
    typeof r.operationId !== 'string' ||
    r.operationId.length === 0 ||
    r.identity === null ||
    typeof r.identity !== 'object' ||
    Array.isArray(r.identity)
  ) {
    return null;
  }
  const d = r.details;
  if (!sameKeys(d, METRICS_DETAIL_KEYS)) return null;
  if (
    d.predecessorRevision !== 1 ||
    d.targetRevision !== 2 ||
    !Number.isInteger(d.markerSize) ||
    d.markerSize < 32 ||
    d.markerSize > 4096
  ) {
    return null;
  }
  for (const key of METRICS_STRING_DETAILS) {
    if (typeof d[key] !== 'string' || d[key].length === 0) return null;
  }
  if (
    !SHA256.test(d.predecessorManifestSha256) ||
    !SHA256.test(d.targetManifestSha256) ||
    !SHA256.test(d.markerSha256) ||
    !/^[0-9]+:[0-9]+$/.test(d.dataDirectoryIdentity)
  ) {
    return null;
  }
  return r;
}

/**
 * Bounded private no-follow read of the canonical pending path. Reports only
 * `absent`, `legacy` (the exact old unversioned receipt), `metrics` (exact
 * typed owner intent) or `unknown` (anything else, including partial,
 * oversize, malformed, marker intents and other schemas).
 * @param {string} stateRoot
 * @param {string} contextName
 */
export function readObjectStoragePendingState(stateRoot, contextName) {
  const { pending } = resolveObjectStorageLockPaths(stateRoot, contextName);
  const read = readPendingBytes(pending);
  if (read.kind !== 'bytes') return { kind: read.kind };
  let record;
  try {
    record = JSON.parse(read.text);
  } catch {
    return { kind: 'unknown' };
  }
  if (record !== null && typeof record === 'object' && 'schema' in record) {
    return parseMetricsIntent(record)
      ? { kind: 'metrics' }
      : { kind: 'unknown' };
  }
  if (
    sameKeys(record, LEGACY_PENDING_KEYS) &&
    typeof record.profileId === 'string' &&
    typeof record.contextName === 'string' &&
    typeof record.startedAt === 'string' &&
    record.identity !== null &&
    typeof record.identity === 'object'
  ) {
    return { kind: 'legacy' };
  }
  return { kind: 'unknown' };
}

/**
 * @param {string} path
 * @returns {{ kind: 'absent' | 'unknown' } | { kind: 'bytes', text: string, dev: number, ino: number }}
 */
function readPendingBytes(path) {
  let opened;
  try {
    opened = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    return { kind: error?.code === 'ENOENT' ? 'absent' : 'unknown' };
  }
  try {
    const stat = fstatSync(opened);
    assertPrivate(stat, false);
    const named = lstatSync(path);
    if (
      stat.nlink !== 1 ||
      named.isSymbolicLink() ||
      named.ino !== stat.ino ||
      named.dev !== stat.dev ||
      stat.size > PENDING_MAX_BYTES
    ) {
      return { kind: 'unknown' };
    }
    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const n = readSync(opened, buffer, offset, buffer.length - offset, offset);
      if (n === 0) break;
      offset += n;
    }
    if (offset !== buffer.length) return { kind: 'unknown' };
    return {
      kind: 'bytes',
      text: buffer.toString('utf8'),
      dev: stat.dev,
      ino: stat.ino,
    };
  } catch {
    return { kind: 'unknown' };
  } finally {
    closeSync(opened);
  }
}

/** @type {WeakMap<object, { path: string, text: string, dev: number, ino: number, active: boolean }>} */
const OWNED_METRICS_SESSIONS = new WeakMap();

/**
 * Throws unless the handle is an active session capability whose exact
 * record (bytes, device, inode) is still the one this session wrote.
 * @param {unknown} handle
 */
export function assertOwnedMetricsIntent(handle) {
  const session =
    handle !== null && typeof handle === 'object'
      ? OWNED_METRICS_SESSIONS.get(handle)
      : undefined;
  if (!session?.active) {
    throw new Error('Object storage metrics intent capability is not active');
  }
  const current = readPendingBytes(session.path);
  if (
    current.kind !== 'bytes' ||
    current.text !== session.text ||
    current.dev !== session.dev ||
    current.ino !== session.ino
  ) {
    throw new Error('Object storage metrics intent changed or is not owned');
  }
}

/**
 * Dedicated lock boundary for the owner metrics transition. It reuses the
 * object-store lock path, refuses any existing pending record, and offers no
 * generic write callback: only exact typed intent recording and clearing.
 * The Helm dispatch of the transition is not available here.
 *
 * @param {(session: {
 *   remaining: () => number,
 *   recordIntent: (intent: object) => object,
 *   clearIntent: (handle: object) => void,
 * }) => Promise<unknown>} operation
 * @param {{ stateRoot?: string, now?: () => number, budgetMs?: number, contextName?: string }} [deps]
 */
export async function withObjectStorageMetricsTransition(operation, deps = {}) {
  const profile = readPlatformProfile('dev');
  const contextName = profile.contextName;
  const stateRoot = deps.stateRoot ?? defaultStateRoot();
  const now = deps.now ?? (() => performance.now());
  const deadline = now() + (deps.budgetMs ?? INSTALL_BUDGET_MS);
  const remaining = () => Math.max(0, Math.floor(deadline - now()));
  const { lock: lockPath, pending: pendingPath } =
    resolveObjectStorageLockPaths(stateRoot, contextName);

  const lockWait = Math.min(LOCK_WAIT_SECONDS * 1000, remaining());
  if (lockWait < 1) {
    throw new Error('Object storage install budget exhausted before lock');
  }
  let lockFd;
  try {
    lockFd = openAndAcquireLock(lockPath, lockWait);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Object storage lock failed';
    throw message.includes('unavailable')
      ? new Error('Object storage lock wait timed out')
      : error;
  }

  /** @type {object | undefined} */
  let issued;
  try {
    if (readPendingBytes(pendingPath).kind !== 'absent') {
      throw new Error(
        'Object storage mutation refused while pending receipt exists',
      );
    }
    const recordIntent = (intent) => {
      if (issued) {
        throw new Error('Object storage metrics intent already recorded');
      }
      const parsed = parseMetricsIntent(intent);
      if (!parsed || parsed.contextName !== contextName) {
        throw new Error('Object storage metrics intent is malformed');
      }
      const text = JSON.stringify(parsed);
      writePendingDurable(pendingPath, text);
      const written = readPendingBytes(pendingPath);
      if (written.kind !== 'bytes' || written.text !== text) {
        throw new Error('Object storage metrics intent readback mismatch');
      }
      const handle = Object.freeze({});
      OWNED_METRICS_SESSIONS.set(handle, {
        path: pendingPath,
        text,
        dev: written.dev,
        ino: written.ino,
        active: true,
      });
      issued = handle;
      return handle;
    };
    const clearIntent = (handle) => {
      assertOwnedMetricsIntent(handle);
      clearPendingDurable(pendingPath);
      OWNED_METRICS_SESSIONS.get(handle).active = false;
    };
    return await operation({ remaining, recordIntent, clearIntent });
  } finally {
    // The capability dies with custody; the record itself is retained.
    const session = issued ? OWNED_METRICS_SESSIONS.get(issued) : undefined;
    if (session) session.active = false;
    closeSync(lockFd);
  }
}
