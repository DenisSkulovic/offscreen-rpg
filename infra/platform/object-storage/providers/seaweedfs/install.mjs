import process from 'node:process';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readPlatformObject,
  runPlatformCommand,
} from '../../../common/commands.mjs';
import { readPlatformProfile } from '../../../common/profile.mjs';
import {
  resolvePlatformChartPath,
  resolvePlatformProfilePath,
} from '../../../common/render.mjs';
import {
  HELM_WAIT_SECONDS,
  withObjectStorageMetricsTransition,
  withObjectStorageMutation,
} from './mutation-guard.mjs';
import {
  OBJECT_STORE_RELEASE_NAME,
  computeMetricsManifestDigests,
  observeObjectStorageChain,
  observeObjectStorageHistory,
  observeOwnedMetricsTransition,
  observeOwnerPredecessorBeforeIntent,
} from './observe.mjs';
import { MIN_HOST_MEMORY_MIB, parseMeminfoMiB } from '../../../../clusters/kind/manager/host-probe.mjs';
import { readExistingRegistryV2 } from '../../../../../tools/dev-environments/src/domain/dev-worktree-registry.mjs';

export const OBJECT_STORE_ADMIN_SECRET = 'object-store-s3';

/** Generate independent S3-compatible credentials without external commands. */
export function generateObjectStoreAdminCredentials() {
  return {
    accessKeyId: randomBytes(10).toString('hex'),
    secretAccessKey: randomBytes(20).toString('hex'),
  };
}

const LEGACY_OCCUPIED_HISTORY_REASON =
  'object-storage namespace exists without an object-store Helm release';

const MUTATING_PATTERN =
  /\b(apply|create|delete|patch|replace|install|upgrade|rollback|uninstall)\b/i;

/**
 * @param {import('./observe.mjs').observeObjectStorageHistory extends (...args: any) => infer R ? R : never} history
 */
/**
 * After this callback has created the namespace, history is no longer
 * `absent`. Helm install is still allowed only when that is the sole change:
 * no release and no Helm storage. Any other refused history is occupied.
 *
 * @param {ReturnType<typeof observeObjectStorageHistory>} history
 */
function historyAllowsHelmAfterFreshCreate(history) {
  if (history.state === 'absent') {
    return true;
  }
  return (
    history.state === 'refused' &&
    history.reason === LEGACY_OCCUPIED_HISTORY_REASON
  );
}

/**
 * @param {{ artifactId?: string, historyId?: string, metricsEnabled?: boolean }} decision
 */
function matchedFields(decision) {
  return decision.historyId === undefined
    ? {}
    : {
        artifactId: decision.artifactId,
        historyId: decision.historyId,
        metricsEnabled: decision.metricsEnabled === true,
      };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand, stateRoot?: string }} [deps]
 */
function decideObjectStorageInstall(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const profile = readPlatformProfile(profileId);
  const observeDeps = { run, stateRoot: deps.stateRoot };
  const history = observeObjectStorageHistory(profileId, observeDeps);

  /** @type {ReturnType<typeof observeObjectStorageChain> | null} */
  let chain = null;
  if (
    history.state === 'native-compatible' ||
    (history.state === 'refused' &&
      history.reason === LEGACY_OCCUPIED_HISTORY_REASON)
  ) {
    chain = observeObjectStorageChain(profileId, observeDeps);
  }

  /** @type {'absent' | 'native-noop' | 'refused' | 'unknown'} */
  let state;
  /** @type {string} */
  let reason;
  /** Matched native variant (never the desired one); absent unless native-noop. */
  let matched = {};

  if (history.state === 'unknown') {
    state = 'unknown';
    reason = history.reason;
  } else if (history.state === 'absent') {
    state = 'absent';
    reason = history.reason;
  } else if (
    history.state === 'native-compatible' &&
    chain?.state === 'native-compatible'
  ) {
    state = 'native-noop';
    reason = chain.reason ?? history.reason;
    matched = {
      artifactId: chain.artifactId ?? history.artifactId,
      historyId: chain.historyId ?? history.historyId,
      metricsEnabled: (chain.metricsEnabled ?? history.metricsEnabled) === true,
    };
  } else if (chain?.state === 'legacy-structural') {
    state = 'refused';
    reason = chain.reason;
  } else if (chain?.state === 'refused' || history.state === 'refused') {
    state = 'refused';
    reason = chain?.reason ?? history.reason;
  } else {
    state = 'refused';
    reason = chain?.reason ?? history.reason;
  }

  return {
    profileId,
    context: profile.contextName,
    namespace: profile.namespaces.objectStorage,
    state,
    reason,
    ...matched,
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand }} [deps]
 */
export function planObjectStorage(profileId, deps = {}) {
  const decision = decideObjectStorageInstall(profileId, deps);
  return {
    mode: 'plan',
    profileId,
    context: decision.context,
    namespace: decision.namespace,
    state: decision.state,
    reason: decision.reason,
    ...matchedFields(decision),
    actions: [],
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../../../common/commands.mjs').runPlatformCommand }} [deps]
 */
export function statusObjectStorage(profileId, deps = {}) {
  const decision = decideObjectStorageInstall(profileId, deps);
  return {
    mode: 'status',
    profileId,
    context: decision.context,
    namespace: decision.namespace,
    state: decision.state,
    reason: decision.reason,
    ...matchedFields(decision),
    actions: [],
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{
 *   authorize?: boolean,
 *   run?: import('../../../common/commands.mjs').runPlatformCommand,
 *   generateCredentials?: () => { accessKeyId: string, secretAccessKey: string },
 *   stateRoot?: string,
 *   readIdentity?: (profileId: 'dev' | 'release') => Promise<{ state: string, identity?: object, reason?: string }>,
 *   now?: () => number,
 *   budgetMs?: number,
 *   mutationCommands?: string[],
 * }} [deps]
 */
export async function ensureObjectStorage(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const decision = decideObjectStorageInstall(profileId, {
    run,
    stateRoot: deps.stateRoot,
  });
  const base = {
    mode: /** @type {const} */ ('ensure'),
    profileId,
    context: decision.context,
    namespace: decision.namespace,
    state: decision.state,
    reason: decision.reason,
    ...matchedFields(decision),
    actions: /** @type {object[]} */ ([]),
  };

  if (!deps.authorize) {
    return { ...base, ok: false, mutated: false };
  }
  if (decision.state === 'native-noop') {
    return { ...base, ok: true, mutated: false };
  }
  if (decision.state !== 'absent') {
    return { ...base, ok: false, mutated: false };
  }

  const credentials = deps.generateCredentials?.();
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    return {
      ...base,
      ok: false,
      mutated: false,
      reason: 'admin credentials were not generated',
    };
  }

  const chartPath = resolvePlatformChartPath('object-storage');
  const profilePath = resolvePlatformProfilePath('object-storage', profileId);
  const profile = readPlatformProfile(profileId);
  const namespace = profile.namespaces.objectStorage;
  const context = profile.contextName;

  /** @type {object[]} */
  const actions = [];
  let mutated = false;

  try {
    await withObjectStorageMutation(
      profileId,
      async ({ runWrite }) => {
        const historyBefore = observeObjectStorageHistory(profileId, { run });
        if (historyBefore.state !== 'absent') {
          throw new Error('object store history is no longer absent');
        }

        const namespaceRead = readPlatformObject(
          { profileId, resource: 'namespace', name: namespace },
          { run },
        );
        if (namespaceRead.state !== 'absent') {
          throw new Error('object storage namespace is not absent');
        }
        const createdNamespace = await runWrite('kubectl', [
          '--context',
          context,
          'create',
          'namespace',
          namespace,
        ]);
        if (!createdNamespace.ok) {
          throw new Error('object storage namespace create failed');
        }
        actions.push({ op: 'create-namespace', context, name: namespace });
        mutated = true;

        const secretRead = readPlatformObject(
          {
            profileId,
            resource: 'secret',
            name: OBJECT_STORE_ADMIN_SECRET,
            namespace,
          },
          { run },
        );
        if (secretRead.state !== 'absent') {
          throw new Error('object storage admin secret is not absent');
        }
        const secretManifest = {
          apiVersion: 'v1',
          kind: 'Secret',
          type: 'Opaque',
          metadata: {
            name: OBJECT_STORE_ADMIN_SECRET,
            namespace,
            labels: profileId === 'dev'
              ? { 'offscreen.dev/owner': profile.ownerValue }
              : { app: 'object-store', 'offscreen.rpg/lab': profile.ownerValue },
          },
          stringData: {
            'access-key-id': credentials.accessKeyId,
            'secret-access-key': credentials.secretAccessKey,
          },
        };
        let createdSecret;
        try {
          createdSecret = await runWrite(
            'kubectl',
            ['--context', context, 'create', '-f', '-'],
            { input: JSON.stringify(secretManifest) },
          );
        } catch {
          throw new Error('object storage admin secret create failed');
        }
        if (!createdSecret.ok) {
          throw new Error('object storage admin secret create failed');
        }
        actions.push({
          op: 'create-secret',
          context,
          namespace,
          name: OBJECT_STORE_ADMIN_SECRET,
        });
        mutated = true;

        const historyAfter = observeObjectStorageHistory(profileId, { run });
        if (!historyAllowsHelmAfterFreshCreate(historyAfter)) {
          throw new Error(
            'object store history is no longer eligible for Helm install',
          );
        }

        const installed = await runWrite(
          'helm',
          [
            'install',
            OBJECT_STORE_RELEASE_NAME,
            chartPath,
            '--kube-context',
            context,
            '--namespace',
            namespace,
            '--create-namespace=false',
            '-f',
            profilePath,
            '--wait',
            '--timeout',
            `${HELM_WAIT_SECONDS}s`,
          ],
          { timeoutMs: HELM_WAIT_SECONDS * 1000 + 5_000 },
        );
        if (!installed.ok) {
          throw new Error('object storage Helm install failed');
        }
        actions.push({
          op: 'helm-install',
          context,
          release: OBJECT_STORE_RELEASE_NAME,
        });
        mutated = true;
        return { ok: true };
      },
      {
        run,
        stateRoot: deps.stateRoot,
        readIdentity: deps.readIdentity,
        now: deps.now,
        budgetMs: deps.budgetMs,
        mutationCommands: deps.mutationCommands,
      },
    );
    return { ...base, ok: true, mutated, actions };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    /** @type {{ id: string, detail: string }[]} */
    const refusals = [];
    if (reason.includes('admin secret create failed')) {
      refusals.push({
        id: 'create-secret-failed',
        detail: 'secret create failed or conflicted',
      });
    }
    return { ...base, ok: false, mutated, reason, actions, refusals };
  }
}


// --- Explicit occupied owner operation: upgrade-metrics (G4a) ---

const MARKER_BUCKET = /^offscreen-e2-marker-[0-9a-f]{32}$/;
const SLOT_NAMESPACE = /^offscreen-dev-[1-9][0-9]*$/;

class OwnerRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = 'OwnerRefusal';
  }
}

/**
 * Exact marker descriptor `{schema:1,bucket,key,sha256,size}`; no other keys.
 * @param {unknown} value
 */
export function parseMarkerDescriptor(value) {
  const keys = ['bucket', 'key', 'schema', 'sha256', 'size'];
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== keys.join()
  ) {
    throw new OwnerRefusal('marker descriptor is malformed');
  }
  const d = /** @type {Record<string, any>} */ (value);
  if (
    d.schema !== 1 ||
    typeof d.bucket !== 'string' ||
    !MARKER_BUCKET.test(d.bucket) ||
    d.key !== 'retained-marker.bin' ||
    typeof d.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/.test(d.sha256) ||
    !Number.isInteger(d.size) ||
    d.size < 32 ||
    d.size > 4096
  ) {
    throw new OwnerRefusal('marker descriptor is malformed');
  }
  return { schema: 1, bucket: d.bucket, key: d.key, sha256: d.sha256, size: d.size };
}

/**
 * Private regular owner file: 0600, no symlink, nlink 1, <= 4096 bytes,
 * fstat/lstat same device and inode.
 * @param {string} path
 */
export function readMarkerDescriptorFile(path) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new OwnerRefusal('marker file is unreadable');
  }
  try {
    const stat = fstatSync(fd);
    const named = lstatSync(path);
    if (
      !stat.isFile() ||
      named.isSymbolicLink() ||
      stat.dev !== named.dev ||
      stat.ino !== named.ino ||
      stat.nlink !== 1 ||
      (stat.mode & 0o777) !== 0o600 ||
      (typeof process.getuid === 'function' && stat.uid !== process.getuid()) ||
      stat.size > 4096
    ) {
      throw new OwnerRefusal('marker file is not a private regular file');
    }
    const buffer = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < buffer.length) {
      const n = readSync(fd, buffer, offset, buffer.length - offset, offset);
      if (n === 0) break;
      offset += n;
    }
    if (offset !== buffer.length) throw new OwnerRefusal('marker file is unreadable');
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
      throw new OwnerRefusal('marker descriptor is malformed');
    }
    return parseMarkerDescriptor(parsed);
  } finally {
    closeSync(fd);
  }
}

function canonicalRegistryRoot() {
  return join(homedir(), '.local', 'state', 'offscreen-rpg', 'dev-worktree-registry');
}

/**
 * Read-only quiescence proof: v2 registry without lease or process identity,
 * and no active workload in any registered or numbered slot namespace.
 * @param {{ run: import('../../../common/commands.mjs').runPlatformCommand, contextName: string, registryRoot: string, readRegistry: (root: string) => any }} input
 */
export function assertMetricsQuiescence({ run, contextName, registryRoot, readRegistry }) {
  let registry;
  try {
    registry = readRegistry(registryRoot);
  } catch {
    throw new OwnerRefusal('dev registry is unreadable or malformed');
  }
  const environments = Object.values(registry?.environmentsById ?? {});
  if (registry?.version !== 2 || !registry.environmentsById) {
    throw new OwnerRefusal('dev registry is not a valid v2 registry');
  }
  for (const record of environments) {
    if (record.lease !== null || record.processIdentity !== null) {
      throw new OwnerRefusal('dev registry has an active lease or process');
    }
  }
  const registered = new Set(environments.map((record) => record.namespace));
  const read = (args) => {
    const result = run('kubectl', ['--context', contextName, ...args, '-o', 'json'], { timeoutMs: 15_000 });
    if (!result?.ok) throw new OwnerRefusal('cluster inventory is unreadable');
    try {
      const parsed = JSON.parse(result.stdout ?? '');
      if (!Array.isArray(parsed.items)) throw new Error('x');
      return parsed.items;
    } catch {
      throw new OwnerRefusal('cluster inventory is unreadable');
    }
  };
  const namespaces = read(['get', 'namespaces'])
    .map((item) => item?.metadata?.name)
    .filter((name) => registered.has(name) || SLOT_NAMESPACE.test(name ?? ''));
  for (const namespace of namespaces) {
    for (const pod of read(['get', 'pods', '-n', namespace])) {
      const phase = pod?.status?.phase;
      if (pod?.metadata?.deletionTimestamp || (phase !== 'Succeeded' && phase !== 'Failed')) {
        throw new OwnerRefusal('slot namespace has an active Pod');
      }
    }
    for (const job of read(['get', 'jobs', '-n', namespace])) {
      if ((job?.status?.active ?? 0) > 0) throw new OwnerRefusal('slot namespace has an active Job');
    }
    for (const kind of ['deployments', 'statefulsets']) {
      for (const item of read(['get', kind, '-n', namespace])) {
        if ((item?.spec?.replicas ?? 1) !== 0) throw new OwnerRefusal('slot namespace has a running controller');
      }
    }
  }
}

const STABLE_CHAIN_KEYS = [
  'contextName', 'kubeSystemUid', 'namespaceUid', 'deploymentUid', 'serviceUid',
  'serviceClusterIP', 'secretUid', 'secretResourceVersion', 'pvcUid', 'pvUid',
  'pvHostPath', 'nodeName', 'dataDirectoryIdentity',
];

/**
 * The exact G4a transition. Zero writes unless the predecessor matches and
 * every precondition holds; every failure after the intent is recorded
 * retains it and issues no further write.
 * @param {{ markerDescriptor: object, confirmContext: string }} request
 * @param {object} [deps]
 */
export async function upgradeObjectStorageMetrics(request, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const profile = readPlatformProfile('dev');
  const base = {
    mode: /** @type {const} */ ('upgrade-metrics'),
    profileId: /** @type {const} */ ('dev'),
    context: profile.contextName,
    namespace: profile.namespaces.objectStorage,
  };
  const refuse = (reason, extra = {}) => ({ ...base, ok: false, mutated: false, intentRetained: false, reason, ...extra });
  if (request.confirmContext !== profile.contextName) return refuse('confirmed context does not match');
  let marker;
  try {
    marker = parseMarkerDescriptor(request.markerDescriptor);
  } catch (error) {
    return refuse(error.message);
  }
  const env = deps.env ?? process.env;
  if (
    env.OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE !== 'authorized' ||
    env.OFFSCREEN_OBJECT_STORAGE_MAINTENANCE !== 'quiesced'
  ) {
    return refuse('owner metrics upgrade is not authorized');
  }
  const registryRoot = deps.registryRoot ?? canonicalRegistryRoot();
  const override = env.OFFSCREEN_DEV_WORKTREE_REGISTRY?.trim();
  if (deps.registryRoot === undefined && override && resolve(override) !== registryRoot) {
    return refuse('noncanonical dev registry override refused');
  }
  const observeDeps = { run, stateRoot: deps.stateRoot };
  // Injection seams for fixtures; defaults are the real read-only observers.
  const obs = {
    history: observeObjectStorageHistory,
    chain: observeObjectStorageChain,
    before: observeOwnerPredecessorBeforeIntent,
    owned: observeOwnedMetricsTransition,
    ...deps.observers,
  };
  const memory = () => {
    let text;
    try {
      text = (deps.readMeminfo ?? (() => readFileSync('/proc/meminfo', 'utf8')))();
    } catch {
      throw new OwnerRefusal('host memory is unreadable');
    }
    const { memAvailableMiB } = parseMeminfoMiB(text);
    if (memAvailableMiB === null || memAvailableMiB < MIN_HOST_MEMORY_MIB) {
      throw new OwnerRefusal('host memory is insufficient');
    }
  };
  const quiescence = () =>
    (deps.assertQuiescence ?? assertMetricsQuiescence)({
      run,
      contextName: profile.contextName,
      registryRoot,
      readRegistry: deps.readRegistry ?? readExistingRegistryV2,
    });
  const readMarker = deps.readMarker ?? (async (descriptor, secret) => (await import('./live-sdk.mjs')).readMarkerObject(descriptor, secret));
  const scrapeMetrics = deps.scrapeMetrics ?? (async () => (await import('./live-sdk.mjs')).scrapeMetricFamilies());
  const verifyMarker = async (secret) => {
    let read;
    try {
      read = await readMarker({ bucket: marker.bucket, key: marker.key }, secret);
    } catch {
      throw new OwnerRefusal('marker readback failed');
    }
    if (read?.sha256 !== marker.sha256 || read?.size !== marker.size) {
      throw new OwnerRefusal('marker readback does not match descriptor');
    }
  };

  let handle;
  let dispatched = false;
  try {
    return await withObjectStorageMetricsTransition(
      async (session) => {
        // Zero-write repeat: exact target history is verified read-only.
        const history = obs.history('dev', observeDeps);
        if (history.historyId === 'dev-metrics-r1' || history.historyId === 'dev-metrics-r1-r2') {
          const chain = obs.chain('dev', observeDeps);
          if (chain.state !== 'native-compatible' || chain.historyId !== history.historyId) {
            return refuse(chain.reason ?? 'object-store chain refused');
          }
          return { ...base, ok: true, mutated: false, intentRetained: false, state: 'native-noop', historyId: history.historyId };
        }
        if (history.historyId !== 'dev-base-r1') {
          return refuse(history.reason ?? 'object-store history is not the exact predecessor');
        }
        quiescence();
        memory();
        const before = obs.before('dev-base-r1', observeDeps);
        if (!before.ok) return refuse(before.reason);
        await verifyMarker({ uid: before.chain.secretUid, resourceVersion: before.chain.secretResourceVersion });
        const digests = (deps.computeDigests ?? computeMetricsManifestDigests)({ run });
        // Repeat immediately before the write.
        quiescence();
        memory();
        const c = before.chain;
        handle = session.recordIntent({
          schema: 2,
          operation: 'upgrade-metrics',
          profileId: 'dev',
          contextName: profile.contextName,
          startedAt: new Date().toISOString(),
          operationId: (deps.operationId ?? randomUUID)(),
          identity: { ...c },
          details: {
            predecessorRevision: 1,
            targetRevision: 2,
            predecessorManifestSha256: digests.predecessorManifestSha256,
            targetManifestSha256: digests.targetManifestSha256,
            namespaceUid: c.namespaceUid,
            deploymentUid: c.deploymentUid,
            serviceUid: c.serviceUid,
            serviceClusterIP: c.serviceClusterIP,
            secretUid: c.secretUid,
            secretResourceVersion: c.secretResourceVersion,
            pvcUid: c.pvcUid,
            pvUid: c.pvUid,
            pvHostPath: c.pvHostPath,
            oldReplicaSetUid: c.replicaSetUid,
            oldPodUid: c.podUid,
            oldHelmStorageUid: c.helmStorageUids?.[1],
            nodeName: c.nodeName,
            dataDirectoryIdentity: c.dataDirectoryIdentity,
            markerSha256: marker.sha256,
            markerSize: marker.size,
          },
        });
        const recheck = obs.owned(handle, 'dev-base-r1', { run });
        if (!recheck.ok || JSON.stringify(recheck.chain) !== JSON.stringify(c)) {
          throw new OwnerRefusal('predecessor identity changed before dispatch');
        }
        dispatched = true;
        await session.dispatchUpgrade(handle);

        const after = obs.owned(handle, 'dev-metrics-r1-r2', { run });
        if (!after.ok) throw new OwnerRefusal(after.reason);
        const n = after.chain;
        if (
          STABLE_CHAIN_KEYS.some((key) => n[key] !== c[key]) ||
          n.predecessorReplicaSetUid !== c.replicaSetUid ||
          n.replicaSetUid === c.replicaSetUid ||
          n.podUid === c.podUid ||
          n.helmStorageUids?.[1] !== c.helmStorageUids?.[1] ||
          !n.helmStorageUids?.[2] ||
          n.helmStorageUids[2] === n.helmStorageUids[1]
        ) {
          throw new OwnerRefusal('successor chain does not preserve the predecessor identity');
        }
        await verifyMarker({ uid: n.secretUid, resourceVersion: n.secretResourceVersion });
        let families;
        try {
          families = await scrapeMetrics();
        } catch {
          throw new OwnerRefusal('metrics endpoint verification failed');
        }
        if (!Array.isArray(families) || families.length === 0) {
          throw new OwnerRefusal('metrics endpoint verification failed');
        }
        const final = obs.owned(handle, 'dev-metrics-r1-r2', { run });
        if (!final.ok || JSON.stringify(final.chain) !== JSON.stringify(n)) {
          throw new OwnerRefusal('successor chain changed before finalization');
        }
        session.clearIntent(handle);
        return {
          ...base,
          ok: true,
          mutated: true,
          intentRetained: false,
          state: 'transition-proven',
          predecessorHistoryId: 'dev-base-r1',
          historyId: 'dev-metrics-r1-r2',
          manifestDigests: digests,
          replicaSets: { old: c.replicaSetUid, new: n.replicaSetUid },
          pods: { old: c.podUid, new: n.podUid },
          retainedMarker: { sha256: marker.sha256, size: marker.size },
          metricFamilies: families,
        };
      },
      { stateRoot: deps.stateRoot, now: deps.now, budgetMs: deps.budgetMs, spawnChild: deps.spawnChild },
    );
  } catch (error) {
    const safe =
      error instanceof Error &&
      (error.name === 'OwnerRefusal' || error.message.startsWith('Object storage'));
    return {
      ...refuse(safe ? error.message : 'metrics transition failed (details withheld)'),
      mutated: dispatched,
      intentRetained: handle !== undefined,
    };
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 */
export function isObjectStorageMutatingInvocation(command, args) {
  if (command === 'helm') {
    const verb = args[0];
    return (
      verb === 'install' ||
      verb === 'upgrade' ||
      verb === 'uninstall' ||
      verb === 'rollback'
    );
  }
  const joined = args.join(' ');
  return MUTATING_PATTERN.test(joined);
}

/**
 * @param {string[]} args
 */
function objectStorageCliExitCodeForState(state) {
  return state === 'unknown' ? 1 : 0;
}

/**
 * @param {string[]} args
 */
async function objectStorageCliMain(args) {
  if (args[0] === 'upgrade-metrics') {
    if (
      args.length !== 6 ||
      args[1] !== 'dev' ||
      args[2] !== '--confirm-context' ||
      args[4] !== '--marker-file' ||
      !args[3] ||
      !args[5]
    ) {
      process.exitCode = 2;
      return;
    }
    let result;
    try {
      result = await upgradeObjectStorageMetrics({
        confirmContext: args[3],
        markerDescriptor: readMarkerDescriptorFile(args[5]),
      });
    } catch (error) {
      result = { mode: 'upgrade-metrics', ok: false, mutated: false, reason: error.name === 'OwnerRefusal' ? error.message : 'metrics upgrade refused' };
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  const [command, profileId, extra] = args;
  if (
    extra ||
    !['plan', 'ensure', 'status'].includes(command) ||
    (profileId !== 'dev' && profileId !== 'release')
  ) {
    process.exitCode = 2;
    return;
  }

  if (command === 'plan') {
    const result = planObjectStorage(profileId);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = objectStorageCliExitCodeForState(result.state);
    return;
  }
  if (command === 'status') {
    const result = statusObjectStorage(profileId);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = objectStorageCliExitCodeForState(result.state);
    return;
  }

  if (process.env.OFFSCREEN_OBJECT_STORAGE_ENSURE !== 'authorized') {
    process.stderr.write('object storage ensure is not authorized\n');
    process.exitCode = 2;
    return;
  }

  const result = await ensureObjectStorage(profileId, {
    authorize: true,
    generateCredentials: generateObjectStoreAdminCredentials,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  objectStorageCliMain(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
