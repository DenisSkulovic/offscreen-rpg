/**
 * Read-only chaos preflight and plan builder (T02).
 * Never mutates the cluster; kubectl adapter always uses an explicit lab context.
 */

import fs from 'node:fs';

import { normalizeImageDigest, selectTarget } from './selector.mjs';

export const LAB_CLUSTER_NAME = 'offscreen-lab';
export const LAB_CONTEXT_NAME = 'kind-offscreen-lab';
export const CLUSTER_LOCK_PATH = '/tmp/offscreen-k8s-cluster.lock';
export const MIN_MEM_AVAILABLE_KIB = 4 * 1024 * 1024;

const MUTATING_KUBECTL_VERBS = new Set([
  'delete',
  'exec',
  'apply',
  'scale',
  'replace',
  'patch',
  'rollout',
  'cp',
  'debug',
]);

const RUN_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** @typedef {{ argv: string[], stdout: string, stderr: string, status: number | null }} ExecResult */

/**
 * @param {string[]} argv
 */
export function isMutatingKubectlInvocation(argv) {
  const args = argv ?? [];
  const kubectlAt = args.indexOf('kubectl');
  const from = kubectlAt >= 0 ? kubectlAt + 1 : 0;
  for (let i = from; i < args.length; i += 1) {
    if (MUTATING_KUBECTL_VERBS.has(args[i])) {
      return true;
    }
  }
  return false;
}

/**
 * @param {{
 *   execFile: (file: string, args: string[], opts?: object) => ExecResult,
 *   context?: string,
 * }} deps
 */
export function createKubectlAdapter({ execFile, context = LAB_CONTEXT_NAME }) {
  /** @type {Array<{ argv: string[], mutating: boolean }>} */
  const invocations = [];

  /**
   * @param {string[]} args kubectl args after the binary name (no context flag required)
   */
  function runKubectl(args) {
    const argv = ['kubectl', '--context', context, ...args];
    if (isMutatingKubectlInvocation(argv)) {
      throw new Error(
        `Refusing mutating kubectl in plan mode: ${argv.join(' ')}`,
      );
    }
    const result = execFile('kubectl', argv, { encoding: 'utf8' });
    invocations.push({ argv, mutating: false });
    return result;
  }

  return { runKubectl, invocations };
}

/**
 * @param {{
 *   runKind: (args: string[]) => ExecResult,
 * }} deps
 */
export function readKindClusters({ runKind }) {
  const result = runKind(['get', 'clusters']);
  if (result.status !== 0) {
    return { ok: false, reason: 'kind-unavailable', stderr: result.stderr };
  }
  const names = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return { ok: true, names };
}

/**
 * @param {{ runKubectl: (args: string[]) => ExecResult }} kubectl
 */
export function readCurrentKubeContext({ runKubectl }) {
  const result = runKubectl([
    'config',
    'current-context',
    '--minify',
    '--output',
    'name',
  ]);
  if (result.status !== 0) {
    return { ok: false, reason: 'context-unreadable', stderr: result.stderr };
  }
  const name = result.stdout.trim();
  return { ok: true, name };
}

/**
 * @param {{ runKubectl: (args: string[]) => ExecResult }} kubectl
 */
export function readClusterUid({ runKubectl }) {
  const result = runKubectl([
    'get',
    'namespace',
    'kube-system',
    '-o',
    'jsonpath={.metadata.uid}',
  ]);
  if (result.status !== 0) {
    return { ok: false, reason: 'cluster-uid-unreadable', stderr: result.stderr };
  }
  const uid = result.stdout.trim();
  if (!uid) {
    return { ok: false, reason: 'cluster-uid-unavailable' };
  }
  return { ok: true, uid };
}

/**
 * @param {{ readMeminfo?: () => number | null }} [deps]
 */
export function readMemAvailableKib(deps = {}) {
  if (deps.readMeminfo) {
    return deps.readMeminfo();
  }
  try {
    const text = fs.readFileSync('/proc/meminfo', 'utf8');
    const match = text.match(/^MemAvailable:\s+(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ clusterLockExists?: () => boolean }} [deps]
 */
export function isConflictingClusterRun(deps = {}) {
  const exists =
    typeof deps.clusterLockExists === 'function'
      ? deps.clusterLockExists()
      : fs.existsSync(CLUSTER_LOCK_PATH);
  return exists;
}

/**
 * @param {unknown} raw
 */
export function parseReleaseRef(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'unknown-release', detail: 'not-an-object' };
  }
  const obj = /** @type {{ schema?: string, releaseOwners?: unknown }} */ (raw);
  const owners = obj.releaseOwners;
  if (!Array.isArray(owners) || owners.length === 0) {
    return { ok: false, reason: 'unknown-release', detail: 'missing-releaseOwners' };
  }
  /** @type {import('./selector.mjs').ReleaseOwner[]} */
  const releaseOwners = [];
  for (const entry of owners) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, reason: 'unknown-release', detail: 'invalid-owner' };
    }
    const o = /** @type {Record<string, unknown>} */ (entry);
    const namespace = typeof o.namespace === 'string' ? o.namespace : '';
    const name = typeof o.name === 'string' ? o.name : '';
    const uid = typeof o.uid === 'string' ? o.uid : '';
    const kind = typeof o.kind === 'string' ? o.kind : 'Deployment';
    const imageDigest =
      typeof o.imageDigest === 'string' ? o.imageDigest : '';
    const labels =
      o.labels && typeof o.labels === 'object' && !Array.isArray(o.labels)
        ? /** @type {Record<string, string>} */ (o.labels)
        : {};
    if (!namespace || !name || !uid || !imageDigest) {
      return { ok: false, reason: 'unknown-release', detail: 'incomplete-owner' };
    }
    releaseOwners.push({ namespace, name, uid, kind, imageDigest, labels });
  }
  return { ok: true, releaseOwners, schema: obj.schema ?? null };
}

/**
 * @param {object} deployment k8s Deployment
 */
export function deploymentImageDigestsFromManifest(deployment) {
  const images = [];
  const containers = deployment?.spec?.template?.spec?.containers ?? [];
  for (const c of containers) {
    if (typeof c?.image === 'string' && c.image) {
      images.push(c.image);
    }
  }
  const statusImages =
    deployment?.status?.containerImages ??
    deployment?.status?.containerStatuses?.map((s) => s.imageID) ??
    [];
  for (const id of statusImages) {
    if (typeof id === 'string' && id) {
      images.push(id);
    }
  }
  return images
    .map(normalizeImageDigest)
    .filter((d) => /^sha256:[a-f0-9]{64}$/.test(d));
}

/**
 * @param {object} pod k8s Pod
 */
export function podRecordFromK8s(pod) {
  const labels = pod?.metadata?.labels ?? {};
  const ownerRefs = (pod?.metadata?.ownerReferences ?? []).map((ref) => ({
    kind: ref.kind,
    name: ref.name,
    uid: ref.uid,
  }));
  const deploymentRef = ownerRefs.find((r) => r.kind === 'Deployment');
  const containerStatuses = pod?.status?.containerStatuses ?? [];
  const ready =
    containerStatuses.length > 0 &&
    containerStatuses.every((s) => s.ready === true);
  const containerImageIds = containerStatuses
    .map((s) => s.imageID || s.image)
    .filter(Boolean);
  return {
    uid: pod?.metadata?.uid ?? '',
    name: pod?.metadata?.name ?? '',
    namespace: pod?.metadata?.namespace ?? '',
    labels,
    deletionTimestamp: pod?.metadata?.deletionTimestamp ?? null,
    owner: deploymentRef ?? undefined,
    ownerReferences: ownerRefs,
    containerImageIds,
    ready,
  };
}

/**
 * @param {{
 *   kubectl: ReturnType<typeof createKubectlAdapter>,
 *   releaseOwners: import('./selector.mjs').ReleaseOwner[],
 * }} input
 */
export function verifyReleaseOwnersAgainstCluster({ kubectl, releaseOwners }) {
  for (const owner of releaseOwners) {
    const result = kubectl.runKubectl([
      'get',
      'deployment',
      owner.name,
      '-n',
      owner.namespace,
      '-o',
      'json',
    ]);
    if (result.status !== 0) {
      return {
        ok: false,
        reason: 'unknown-release',
        detail: `deployment-missing:${owner.namespace}/${owner.name}`,
      };
    }
    let deployment;
    try {
      deployment = JSON.parse(result.stdout);
    } catch {
      return {
        ok: false,
        reason: 'unknown-release',
        detail: 'deployment-json-invalid',
      };
    }
    const liveUid = deployment?.metadata?.uid ?? '';
    if (liveUid !== owner.uid) {
      return {
        ok: false,
        reason: 'release-provenance-drift',
        detail: `deployment-uid:${owner.namespace}/${owner.name}`,
      };
    }
    const digests = deploymentImageDigestsFromManifest(deployment);
    const pinned = normalizeImageDigest(owner.imageDigest);
    if (!/^sha256:[a-f0-9]{64}$/.test(pinned)) {
      return {
        ok: false,
        reason: 'image-digest-unavailable',
        detail: 'release-ref-digest-invalid',
      };
    }
    if (digests.length === 0 || !digests.includes(pinned)) {
      return {
        ok: false,
        reason: 'image-digest-unavailable',
        detail: `deployment-digest-not-in-manifest:${owner.namespace}/${owner.name}`,
      };
    }
  }
  return { ok: true };
}

/**
 * @param {{
 *   kubectl: ReturnType<typeof createKubectlAdapter>,
 *   namespaces: string[],
 * }} input
 */
export function snapshotPods({ kubectl, namespaces }) {
  /** @type {import('./selector.mjs').PodRecord[]} */
  const pods = [];
  const uniqueNamespaces = [...new Set(namespaces)].sort();
  for (const ns of uniqueNamespaces) {
    const result = kubectl.runKubectl(['get', 'pods', '-n', ns, '-o', 'json']);
    if (result.status !== 0) {
      return {
        ok: false,
        reason: 'snapshot-failed',
        detail: `pods:${ns}`,
        stderr: result.stderr,
      };
    }
    let body;
    try {
      body = JSON.parse(result.stdout);
    } catch {
      return { ok: false, reason: 'snapshot-failed', detail: `pods-json:${ns}` };
    }
    for (const item of body?.items ?? []) {
      pods.push(podRecordFromK8s(item));
    }
  }
  return { ok: true, pods, namespaces: uniqueNamespaces };
}

/**
 * @param {string} runId
 */
export function assertSafeRunId(runId) {
  if (typeof runId !== 'string' || !RUN_ID_PATTERN.test(runId)) {
    return { ok: false, reason: 'invalid-run-id' };
  }
  return { ok: true };
}

/**
 * @param {object} input
 */
export function buildChaosPlan(input) {
  const {
    runId,
    seed,
    maxEvents,
    releaseRefPath,
    releaseRef,
    kubectl,
    kindClusters,
    currentContext,
    clusterUid,
    memAvailableKib,
    conflictingRun,
    dryRun = true,
    mode = 'plan',
  } = input;

  const mutatingCount = kubectl.invocations.filter((i) => i.mutating).length;

  /** @param {string} reason @param {string} [detail] */
  function refused(reason, detail) {
    return {
      schema: 'offscreen.chaos-plan.v1',
      status: 'refused',
      mode,
      dryRun,
      runId: runId ?? null,
      seed: seed != null ? String(seed) : null,
      maxEvents: maxEvents ?? null,
      reason,
      detail: detail ?? null,
      cluster: {
        name: LAB_CLUSTER_NAME,
        context: LAB_CONTEXT_NAME,
        uid: clusterUid ?? null,
      },
      releaseRef: releaseRefPath ? { path: releaseRefPath } : null,
      preflight: {
        memAvailableKib: memAvailableKib ?? null,
        mutatingInvocations: mutatingCount,
      },
    };
  }

  const runIdCheck = assertSafeRunId(runId);
  if (!runIdCheck.ok) {
    return refused(runIdCheck.reason);
  }
  if (seed === undefined || seed === null || String(seed).length === 0) {
    return refused('missing-seed');
  }
  const max = Number(maxEvents);
  if (!Number.isFinite(max) || max < 1) {
    return refused('invalid-max-events');
  }

  if (conflictingRun) {
    return refused('conflicting-run', CLUSTER_LOCK_PATH);
  }

  if (
    memAvailableKib == null ||
    memAvailableKib < MIN_MEM_AVAILABLE_KIB
  ) {
    return refused('low-memory', String(memAvailableKib ?? 'unknown'));
  }

  if (!currentContext || currentContext !== LAB_CONTEXT_NAME) {
    return refused('wrong-context', currentContext ?? 'unknown');
  }

  if (!kindClusters?.includes(LAB_CLUSTER_NAME)) {
    return refused('cluster-absent', LAB_CLUSTER_NAME);
  }

  if (!clusterUid) {
    return refused('cluster-uid-unavailable');
  }

  const release = parseReleaseRef(releaseRef);
  if (!release.ok) {
    return refused(release.reason, release.detail);
  }

  const provenance = verifyReleaseOwnersAgainstCluster({
    kubectl,
    releaseOwners: release.releaseOwners,
  });
  if (!provenance.ok) {
    return refused(provenance.reason, provenance.detail);
  }

  const namespaces = release.releaseOwners.map((o) => o.namespace);
  const snap = snapshotPods({ kubectl, namespaces });
  if (!snap.ok) {
    return refused(snap.reason, snap.detail);
  }

  const selection = selectTarget({
    pods: snap.pods,
    releaseOwners: release.releaseOwners,
    seed,
  });

  if (selection.status !== 'selected') {
    return refused(selection.reason ?? 'no-eligible-targets', JSON.stringify(selection));
  }

  return {
    schema: 'offscreen.chaos-plan.v1',
    status: 'planned',
    mode,
    dryRun,
    runId,
    seed: String(seed),
    maxEvents: max,
    cluster: {
      name: LAB_CLUSTER_NAME,
      context: LAB_CONTEXT_NAME,
      uid: clusterUid,
    },
    releaseRef: {
      path: releaseRefPath ?? null,
      schema: release.schema,
      ownerCount: release.releaseOwners.length,
    },
    snapshot: {
      namespaces: snap.namespaces,
      podCount: snap.pods.length,
      deploymentUids: release.releaseOwners.map((o) => o.uid).sort(),
    },
    target: {
      podUid: selection.podUid,
      podName: selection.podName,
      namespace: selection.namespace,
      ownerKind: selection.ownerKind,
      ownerName: selection.ownerName,
      ownerUid: selection.ownerUid,
      imageDigest: selection.imageDigest,
      seed: selection.seed,
      index: selection.index,
      candidateCount: selection.candidateCount,
    },
    preflight: {
      memAvailableKib,
      mutatingInvocations: mutatingCount,
    },
  };
}

/**
 * Full read-only preflight pipeline with injected subprocess boundary.
 *
 * @param {{
 *   runId: string,
 *   seed: string | number,
 *   maxEvents: number,
 *   releaseRefPath: string,
 *   dryRun?: boolean,
 *   mode?: string,
 *   execFile: (file: string, args: string[], opts?: object) => ExecResult,
 *   readMeminfo?: () => number | null,
 *   clusterLockExists?: () => boolean,
 *   readReleaseRef?: () => unknown,
 * }} options
 */
export function runPreflightPlan(options) {
  const kubectl = createKubectlAdapter({ execFile: options.execFile });
  const kind = readKindClusters({
    runKind: (args) => options.execFile('kind', args, { encoding: 'utf8' }),
  });
  const ctx = readCurrentKubeContext({ runKubectl: kubectl.runKubectl.bind(kubectl) });
  const clusterUid = readClusterUid({ runKubectl: kubectl.runKubectl.bind(kubectl) });

  let releaseRef;
  if (options.readReleaseRef) {
    releaseRef = options.readReleaseRef();
  } else {
    try {
      releaseRef = JSON.parse(fs.readFileSync(options.releaseRefPath, 'utf8'));
    } catch {
      releaseRef = null;
    }
  }

  return buildChaosPlan({
    runId: options.runId,
    seed: options.seed,
    maxEvents: options.maxEvents,
    releaseRefPath: options.releaseRefPath,
    releaseRef,
    kubectl,
    kindClusters: kind.ok ? kind.names : [],
    currentContext: ctx.ok ? ctx.name : null,
    clusterUid: clusterUid.ok ? clusterUid.uid : null,
    memAvailableKib: readMemAvailableKib({
      readMeminfo: options.readMeminfo,
    }),
    conflictingRun: isConflictingClusterRun({
      clusterLockExists: options.clusterLockExists,
    }),
    dryRun: options.dryRun !== false,
    mode: options.mode ?? 'plan',
  });
}