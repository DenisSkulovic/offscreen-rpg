#!/usr/bin/env node
// Dev-cluster foundation. plan/status are read-only.
// ensureDevCluster mutates only the injected adapter. The CLI refuses live ensure.

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
  if (cluster && !ownsDevResource(cluster)) {
    refusals.push({ id: 'foreign-cluster', detail: `${DEV_KIND_CLUSTER_NAME} exists without dev ownership` });
  }
  if (context && (context.cluster !== DEV_KIND_CLUSTER_NAME || !ownsDevResource(context))) {
    refusals.push({
      id: 'foreign-context',
      detail: `${DEV_KIND_CONTEXT_NAME} does not point at the owned dev cluster`,
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
    releasePresent: assessment.releasePresent,
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
  return {
    mode: 'status',
    readOnly: true,
    cluster: !cluster ? 'absent' : ownsDevResource(cluster) ? 'owned' : 'foreign',
    namespace: !namespace ? 'absent' : ownsDevResource(namespace) ? 'owned' : 'foreign',
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

function readProbeFromEnv(env) {
  const raw = env.OFFSCREEN_DEV_CLUSTER_PROBE;
  if (!raw) {
    return {
      dockerAvailable: false,
      kindAvailable: false,
      memoryMiB: 0,
      clusters: [],
      contexts: [],
      namespaces: [],
      listeningPorts: [],
      currentContext: null,
    };
  }
  return JSON.parse(raw);
}

if (process.argv[1] && process.argv[1].endsWith('dev-cluster-bootstrap.mjs')) {
  const command = process.argv[2] ?? 'plan';
  if (command === 'ensure') {
    process.stderr.write('refusing live ensure: T03a does not authorize cluster creation\n');
    process.exitCode = 2;
  } else if (command !== 'plan' && command !== 'status') {
    process.stderr.write('usage: dev-cluster-bootstrap.mjs <plan|status>\n');
    process.exitCode = 2;
  } else {
    const probe = readProbeFromEnv(process.env);
    const result = command === 'plan' ? planDevCluster(probe) : statusDevCluster(probe);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}
