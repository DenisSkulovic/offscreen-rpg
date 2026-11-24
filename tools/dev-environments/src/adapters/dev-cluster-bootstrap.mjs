#!/usr/bin/env node
// Dev-cluster foundation. plan/status are read-only.
// ensureDevCluster decides actions. executeAuthorizedDevCluster is the only mutator.

export const DEV_KIND_CLUSTER_NAME = 'offscreen-dev';
export const DEV_KIND_CONTEXT_NAME = 'kind-offscreen-dev';
export const RELEASE_KIND_CLUSTER_NAME = 'offscreen-lab';
export const RELEASE_KIND_CONTEXT_NAME = 'kind-offscreen-lab';
export const DEV_CLUSTER_OWNER = 'offscreen-dev';
export const DEV_BASELINE_NAMESPACE = 'offscreen-dev-system';
export const DEV_NODE_IMAGE = 'kindest/node:v1.37.0';
export const RELEASE_API_PORT = 6443;
export const DEV_API_PORT_RANGE = Object.freeze({ start: 24443, end: 24543 });
export const MIN_HOST_MEMORY_MIB = 4096;

/**
 * @param {number} port
 */
export function renderDevKindConfig(port) {
  if (!Number.isInteger(port) || port === RELEASE_API_PORT || port < 1 || port > 65535) {
    throw new Error(`dev API port ${port} is not a non-release loopback port`);
  }
  return [
    'kind: Cluster',
    'apiVersion: kind.x-k8s.io/v1alpha4',
    'networking:',
    '  apiServerAddress: "127.0.0.1"',
    `  apiServerPort: ${port}`,
    'nodes:',
    '  - role: control-plane',
    `    image: ${DEV_NODE_IMAGE}`,
    '  - role: worker',
    `    image: ${DEV_NODE_IMAGE}`,
    '',
  ].join('\n');
}

/**
 * @param {object} probe
 * @param {{ start: number, end: number }} [range]
 */
export function selectDevApiPort(probe, range = DEV_API_PORT_RANGE) {
  const taken = new Set(probe.listeningPorts ?? []);
  for (let port = range.start; port <= range.end; port += 1) {
    if (port === RELEASE_API_PORT) continue;
    if (!taken.has(port)) return port;
  }
  return null;
}

/**
 * @param {object} probe
 * @param {{ portRange?: { start: number, end: number } }} [options]
 */
export function assessDevCluster(probe, options = {}) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (!probe.dockerAvailable) {
    refusals.push({ id: 'docker-unavailable', detail: 'docker daemon is not available' });
  }
  if (!probe.kindAvailable) {
    refusals.push({ id: 'kind-unavailable', detail: 'kind binary is not available' });
  }
  if ((probe.memoryMiB ?? 0) < MIN_HOST_MEMORY_MIB) {
    refusals.push({
      id: 'insufficient-memory',
      detail: `host memory ${probe.memoryMiB ?? 0}MiB is below ${MIN_HOST_MEMORY_MIB}MiB`,
    });
  }
  const port = selectDevApiPort(probe, options.portRange ?? DEV_API_PORT_RANGE);
  if (port == null) {
    refusals.push({ id: 'api-port-occupied', detail: 'no free loopback port in the dev API range' });
  }
  const cluster = (probe.clusters ?? []).find((item) => item.name === DEV_KIND_CLUSTER_NAME);
  const context = (probe.contexts ?? []).find((item) => item.name === DEV_KIND_CONTEXT_NAME);
  const clusterOwnership = classifyOwnership(cluster);
  if (clusterOwnership === 'foreign') {
    refusals.push({ id: 'foreign-cluster', detail: `${DEV_KIND_CLUSTER_NAME} exists without dev ownership` });
  }
  if (clusterOwnership === 'unknown') {
    refusals.push({
      id: 'ownership-unknown',
      detail: `${DEV_KIND_CLUSTER_NAME} exists but its owner label was not verified`,
    });
  }
  if (context && (context.cluster !== DEV_KIND_CLUSTER_NAME || !ownsDevResource(context))) {
    refusals.push({
      id: 'foreign-context',
      detail: `${DEV_KIND_CONTEXT_NAME} does not point at the owned dev cluster`,
    });
  }
  if ((probe.timedOutCommands ?? []).length > 0) {
    refusals.push({
      id: 'command-timeout',
      detail: `read-only command timed out: ${probe.timedOutCommands.join(', ')}`,
    });
  }
  if (
    cluster &&
    probe.registryClusterUid &&
    cluster.uid !== probe.registryClusterUid
  ) {
    refusals.push({
      id: 'stale-registry-owner',
      detail: 'registry cluster uid does not match the observed cluster',
    });
  }
  const release = (probe.clusters ?? []).find((item) => item.name === RELEASE_KIND_CLUSTER_NAME);
  return { refusals, port, cluster, context, releasePresent: Boolean(release) };
}

/**
 * @param {{ owner?: string, uid?: string }} resource
 */
function ownsDevResource(resource) {
  return resource.owner === DEV_CLUSTER_OWNER && typeof resource.uid === 'string' && resource.uid.length > 0;
}

/**
 * Missing or unverified owner evidence is unknown. A different owner is foreign.
 * @param {{ owner?: string, uid?: string, ownership?: string } | undefined} resource
 * @returns {'absent' | 'owned' | 'foreign' | 'unknown'}
 */
function classifyOwnership(resource) {
  if (!resource) return 'absent';
  if (resource.ownership === 'unknown' || resource.owner == null || resource.owner === '') {
    return 'unknown';
  }
  return ownsDevResource(resource) ? 'owned' : 'foreign';
}

/**
 * @param {object} probe
 * @param {{ portRange?: { start: number, end: number } }} [options]
 */
export function planDevCluster(probe, options = {}) {
  const assessment = assessDevCluster(probe, options);
  return {
    mode: 'plan',
    readOnly: true,
    clusterName: DEV_KIND_CLUSTER_NAME,
    contextName: DEV_KIND_CONTEXT_NAME,
    apiServerAddress: '127.0.0.1',
    apiServerPort: assessment.port,
    nodeImage: DEV_NODE_IMAGE,
    baselineNamespace: DEV_BASELINE_NAMESPACE,
    currentContext: probe.currentContext ?? null,
    releaseCluster: RELEASE_KIND_CLUSTER_NAME,
    releaseContext: RELEASE_KIND_CONTEXT_NAME,
    releasePresent:
      probe.releaseClusterObserved === undefined
        ? assessment.releasePresent
        : probe.releaseClusterObserved,
    apiServerPortStatus: 'candidate-unreserved',
    portOwnership: 'recheck-and-bind-at-create',
    hostMemoryMiB: probe.memoryMiB ?? null,
    memAvailableMiB: probe.capacity?.memAvailableMiB ?? probe.memoryMiB ?? null,
    memTotalMiB: probe.capacity?.memTotalMiB ?? null,
    timedOutCommands: probe.timedOutCommands ?? [],
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 */
export function statusDevCluster(probe) {
  const cluster = (probe.clusters ?? []).find((item) => item.name === DEV_KIND_CLUSTER_NAME);
  const namespace = (probe.namespaces ?? []).find(
    (item) => item.cluster === DEV_KIND_CLUSTER_NAME && item.name === DEV_BASELINE_NAMESPACE,
  );
  const kindTimedOut = (probe.timedOutCommands ?? []).includes('kind');
  return {
    mode: 'status',
    readOnly: true,
    cluster: classifyOwnership(cluster) === 'absent' && kindTimedOut ? 'unknown' : classifyOwnership(cluster),
    namespace:
      classifyOwnership(namespace) === 'absent' && kindTimedOut
        ? 'unknown'
        : classifyOwnership(namespace),
    currentContext: probe.currentContext ?? null,
    actions: [],
  };
}

/**
 * @param {object} probe
 * @param {{ authorize?: boolean, portRange?: { start: number, end: number }, failAfterClusterCreate?: boolean }} [options]
 */
export function ensureDevCluster(probe, options = {}) {
  const plan = planDevCluster(probe, options);
  if (!options.authorize) {
    return { ...plan, mode: 'ensure', ok: false, refusals: [...plan.refusals, { id: 'ensure-not-authorized', detail: 'live ensure was not authorized' }], actions: [] };
  }
  if (plan.refusals.length > 0 || plan.apiServerPort == null) {
    return { ...plan, mode: 'ensure', ok: false, actions: [] };
  }
  const status = statusDevCluster(probe);
  if (status.cluster === 'owned' && status.namespace === 'owned') {
    return { ...plan, mode: 'ensure', ok: true, actions: [{ op: 'noop', cluster: DEV_KIND_CLUSTER_NAME }] };
  }
  /** @type {{ op: string, [key: string]: unknown }[]} */
  const actions = [];
  const previousContext = probe.currentContext ?? null;
  if (status.cluster !== 'owned') {
    actions.push({
      op: 'create-cluster',
      name: DEV_KIND_CLUSTER_NAME,
      context: DEV_KIND_CONTEXT_NAME,
      apiServerAddress: '127.0.0.1',
      apiServerPort: plan.apiServerPort,
      owner: DEV_CLUSTER_OWNER,
      config: renderDevKindConfig(plan.apiServerPort),
    });
    if (options.failAfterClusterCreate) {
      actions.push({ op: 'restore-context', context: previousContext });
      return {
        ...plan,
        mode: 'ensure',
        ok: false,
        refusals: [{ id: 'partial-create', detail: 'namespace was not created; cluster was not deleted' }],
        actions,
      };
    }
  }
  actions.push({
    op: 'ensure-namespace',
    cluster: DEV_KIND_CLUSTER_NAME,
    name: DEV_BASELINE_NAMESPACE,
    owner: DEV_CLUSTER_OWNER,
  });
  actions.push({ op: 'restore-context', context: previousContext });
  const deleted = actions.some((action) => action.op === 'delete-cluster' || action.op === 'delete-namespace');
  return { ...plan, mode: 'ensure', ok: !deleted, actions };
}

export function renderBaselineNamespace() {
  return [
    'apiVersion: v1',
    'kind: Namespace',
    'metadata:',
    `  name: ${DEV_BASELINE_NAMESPACE}`,
    '  labels:',
    `    offscreen.dev/owner: ${DEV_CLUSTER_OWNER}`,
    '',
  ].join('\n');
}

/**
 * Applies an already authorized ensure plan through an injected command runner.
 * Rechecks the live probe immediately before the first mutation and restores
 * the previous kubectl context. It never deletes a cluster or namespace.
 * @param {{
 *   collect: () => object,
 *   run: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => { ok: boolean, stdout?: string, stderr?: string },
 * }} deps
 */
export function executeAuthorizedDevCluster(deps) {
  const probe = deps.collect();
  const decision = ensureDevCluster(probe, { authorize: true });
  if (!decision.ok) return { ...decision, readOnly: false, mutated: false };
  const previousContext = probe.currentContext ?? null;
  const completed = [];
  for (const action of decision.actions) {
    if (action.op === 'create-cluster') {
      const again = deps.collect();
      const recheck = ensureDevCluster(again, { authorize: true });
      if (!recheck.ok || recheck.apiServerPort !== action.apiServerPort) {
        return {
          ...decision,
          ok: false,
          readOnly: false,
          mutated: false,
          refusals: recheck.refusals.length > 0 ? recheck.refusals : [{ id: 'preflight-changed', detail: 'dev API port changed before create' }],
          actions: completed,
        };
      }
      const created = deps.run(
        'kind',
        ['create', 'cluster', '--name', String(action.name), '--config', '-'],
        { input: String(action.config), timeoutMs: 300000 },
      );
      completed.push(action);
      if (!created.ok) {
        if (previousContext) {
          deps.run('kubectl', ['config', 'use-context', previousContext], { timeoutMs: 15000 });
          completed.push({ op: 'restore-context', context: previousContext });
        }
        return {
          ...decision,
          ok: false,
          readOnly: false,
          mutated: true,
          refusals: [{ id: 'cluster-create-failed', detail: created.stderr || 'kind create cluster failed' }],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'ensure-namespace') {
      const applied = deps.run(
        'kubectl',
        ['--context', DEV_KIND_CONTEXT_NAME, 'apply', '-f', '-'],
        { input: renderBaselineNamespace(), timeoutMs: 30000 },
      );
      completed.push(action);
      if (!applied.ok) {
        if (previousContext) {
          deps.run('kubectl', ['config', 'use-context', previousContext], { timeoutMs: 15000 });
          completed.push({ op: 'restore-context', context: previousContext });
        }
        return {
          ...decision,
          ok: false,
          readOnly: false,
          mutated: true,
          refusals: [{ id: 'namespace-apply-failed', detail: applied.stderr || 'baseline namespace apply failed' }],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'restore-context') {
      if (previousContext) {
        const restored = deps.run('kubectl', ['config', 'use-context', previousContext], { timeoutMs: 15000 });
        completed.push(action);
        if (!restored.ok) {
          return {
            ...decision,
            ok: false,
            readOnly: false,
            mutated: true,
            refusals: [{ id: 'context-restore-failed', detail: restored.stderr || 'kubectl context restore failed' }],
            actions: completed,
          };
        }
      }
    }
  }
  return {
    ...decision,
    readOnly: false,
    ok: true,
    mutated: completed.some((action) => action.op !== 'restore-context' && action.op !== 'noop'),
    actions: completed,
  };
}

function readProbeFromEnv(env) {
  const raw = env.OFFSCREEN_DEV_CLUSTER_PROBE;
  if (!raw) return null;
  return JSON.parse(raw);
}

export function readInjectedDevClusterProbe(env) {
  return readProbeFromEnv(env);
}
