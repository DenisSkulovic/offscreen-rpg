// Dev-only CloudNativePG plan. Live ensure is not exposed by the CLI.
// The upstream operator namespace is verified by the pinned image, not relabeled.

export const DEV_CNPG_CONTEXT = 'kind-offscreen-dev';
export const DEV_CNPG_CLUSTER_NAME = 'offscreen-dev';
export const DEV_CNPG_NAMESPACE = 'offscreen-dev-postgres';
export const DEV_CNPG_CLUSTER = 'dev-pg';
export const DEV_CNPG_OWNER = 'offscreen-dev';
export const DEV_CNPG_MAX_CONNECTIONS = 100;
export const DEV_CNPG_POOL_CAP = 2;
export const DEV_CNPG_MIN_MEMORY_MIB = 4096;
export const RELEASE_CNPG_NAMESPACE = 'lab-postgres';
export const RELEASE_CNPG_CLUSTER = 'lab-pg';

const PIN_KEYS = ['CNPG_VERSION', 'CNPG_URL', 'CNPG_SHA256', 'CNPG_IMAGE', 'POSTGRES_IMAGE'];

/**
 * @param {string} text
 */
export function parseCnpgPin(text) {
  /** @type {Record<string, string>} */
  const values = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const split = trimmed.indexOf('=');
    if (split < 1) continue;
    values[trimmed.slice(0, split)] = trimmed.slice(split + 1);
  }
  for (const key of PIN_KEYS) {
    if (!values[key]) throw new Error(`operator.pin is missing ${key}`);
  }
  if (!/^[0-9a-f]{64}$/.test(values.CNPG_SHA256)) {
    throw new Error('operator.pin sha256 is not 64 hex characters');
  }
  return {
    version: values.CNPG_VERSION,
    url: values.CNPG_URL,
    sha256: values.CNPG_SHA256,
    operatorImage: values.CNPG_IMAGE,
    postgresImage: values.POSTGRES_IMAGE,
  };
}

export function renderDevCnpgNamespace() {
  return [
    'apiVersion: v1',
    'kind: Namespace',
    'metadata:',
    `  name: ${DEV_CNPG_NAMESPACE}`,
    '  labels:',
    `    offscreen.dev/owner: ${DEV_CNPG_OWNER}`,
    '',
  ].join('\n');
}

/**
 * @param {{ postgresImage: string }} pin
 */
export function renderDevCnpgCluster(pin) {
  return [
    'apiVersion: postgresql.cnpg.io/v1',
    'kind: Cluster',
    'metadata:',
    `  name: ${DEV_CNPG_CLUSTER}`,
    `  namespace: ${DEV_CNPG_NAMESPACE}`,
    '  labels:',
    `    offscreen.dev/owner: ${DEV_CNPG_OWNER}`,
    'spec:',
    '  instances: 1',
    `  imageName: ${pin.postgresImage}`,
    '  storage:',
    '    size: 2Gi',
    '    storageClass: standard',
    '  resources:',
    '    requests:',
    '      cpu: 100m',
    '      memory: 384Mi',
    '    limits:',
    '      cpu: 500m',
    '      memory: 1Gi',
    '  postgresql:',
    '    parameters:',
    '      shared_buffers: "128MB"',
    `      max_connections: "${DEV_CNPG_MAX_CONNECTIONS}"`,
    '      work_mem: "4MB"',
    '      maintenance_work_mem: "32MB"',
    '  bootstrap:',
    '    initdb:',
    '      database: dev',
    '      owner: dev',
    '      localeCType: C',
    '      localeCollate: C',
    '',
  ].join('\n');
}

/**
 * @param {{ owner?: string, uid?: string } | undefined} resource
 * @returns {'absent' | 'owned' | 'foreign'}
 */
function classify(resource) {
  if (!resource) return 'absent';
  if (resource.owner === DEV_CNPG_OWNER && resource.uid) return 'owned';
  return 'foreign';
}

/**
 * @param {object} probe
 */
export function assessDevCnpg(probe) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (probe.context !== DEV_CNPG_CONTEXT) {
    refusals.push({ id: 'wrong-context', detail: `kubectl context is ${probe.context ?? 'unset'}` });
  }
  if (probe.clusterName !== DEV_CNPG_CLUSTER_NAME) {
    refusals.push({ id: 'wrong-cluster', detail: `cluster is ${probe.clusterName ?? 'unset'}` });
  }
  if (probe.apiServer && !String(probe.apiServer).startsWith('https://127.0.0.1:')) {
    refusals.push({ id: 'api-not-loopback', detail: 'dev API is not a loopback endpoint' });
  }
  if (probe.baselineOwner !== DEV_CNPG_OWNER) {
    refusals.push({ id: 'baseline-unowned', detail: 'dev baseline namespace owner was not verified' });
  }
  if (!probe.dockerAvailable || !probe.kindAvailable) {
    refusals.push({ id: 'runtime-unavailable', detail: 'docker or kind is not available' });
  }
  if ((probe.timedOutCommands ?? []).length > 0) {
    refusals.push({ id: 'command-timeout', detail: probe.timedOutCommands.join(', ') });
  }
  if ((probe.memoryMiB ?? 0) < DEV_CNPG_MIN_MEMORY_MIB) {
    refusals.push({
      id: 'insufficient-memory',
      detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${DEV_CNPG_MIN_MEMORY_MIB}MiB`,
    });
  }
  let pin = probe.pin ?? null;
  if (!pin || !/^[0-9a-f]{64}$/.test(pin.sha256 ?? '') || !pin.operatorImage || !pin.postgresImage) {
    refusals.push({ id: 'unverified-pin', detail: 'CNPG operator pin is missing or invalid' });
    pin = null;
  }
  const resources = probe.resources ?? [];
  const namespace = resources.find((item) => item.kind === 'Namespace' && item.name === DEV_CNPG_NAMESPACE);
  const cluster = resources.find((item) => item.kind === 'Cluster' && item.name === DEV_CNPG_CLUSTER);
  const operator = resources.find((item) => item.kind === 'Deployment' && item.name === 'cnpg-controller-manager');
  if (classify(namespace) === 'foreign') {
    refusals.push({ id: 'foreign-namespace', detail: `${DEV_CNPG_NAMESPACE} exists without dev ownership` });
  }
  if (classify(cluster) === 'foreign') {
    refusals.push({ id: 'foreign-cluster', detail: `${DEV_CNPG_CLUSTER} exists without dev ownership` });
  }
  if (operator && pin && operator.image !== pin.operatorImage) {
    refusals.push({ id: 'operator-image-mismatch', detail: `operator image is ${operator.image}` });
  }
  if (resources.some((item) => item.namespace === RELEASE_CNPG_NAMESPACE || item.name === RELEASE_CNPG_NAMESPACE || item.name === RELEASE_CNPG_CLUSTER)) {
    refusals.push({ id: 'release-resource-in-probe', detail: 'release CNPG resource was included in the dev probe' });
  }
  return { refusals, pin, namespace: classify(namespace), cluster: classify(cluster), operatorPresent: Boolean(operator) };
}

/**
 * @param {object} probe
 */
export function planDevCnpg(probe) {
  const assessment = assessDevCnpg(probe);
  return {
    mode: 'plan',
    readOnly: true,
    context: DEV_CNPG_CONTEXT,
    namespace: DEV_CNPG_NAMESPACE,
    cluster: DEV_CNPG_CLUSTER,
    maxConnections: DEV_CNPG_MAX_CONNECTIONS,
    poolCap: DEV_CNPG_POOL_CAP,
    memoryRequest: '384Mi',
    memoryLimit: '1Gi',
    storage: '2Gi',
    operatorImage: assessment.pin?.operatorImage ?? null,
    postgresImage: assessment.pin?.postgresImage ?? null,
    namespaceManifest: assessment.pin ? renderDevCnpgNamespace() : null,
    clusterManifest: assessment.pin ? renderDevCnpgCluster(assessment.pin) : null,
    namespaceState: assessment.namespace,
    clusterState: assessment.cluster,
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 */
export function statusDevCnpg(probe) {
  const assessment = assessDevCnpg(probe);
  return {
    mode: 'status',
    readOnly: true,
    context: probe.context ?? null,
    namespace: assessment.namespace,
    cluster: assessment.cluster,
    operatorPresent: assessment.operatorPresent,
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 * @param {{ authorize?: boolean, operatorManifestSha256?: string, failAfterOperator?: boolean }} [options]
 */
export function ensureDevCnpg(probe, options = {}) {
  const plan = planDevCnpg(probe);
  if (!options.authorize) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [...plan.refusals, { id: 'ensure-not-authorized', detail: 'live CNPG ensure was not authorized' }],
    };
  }
  if (plan.refusals.length > 0 || !plan.clusterManifest) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: false };
  }
  if (options.operatorManifestSha256 && options.operatorManifestSha256 !== probe.pin.sha256) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      refusals: [{ id: 'operator-manifest-sha-mismatch', detail: 'downloaded operator manifest does not match operator.pin' }],
    };
  }
  const liveCluster = (probe.resources ?? []).find((item) => item.kind === 'Cluster' && item.name === DEV_CNPG_CLUSTER);
  const storageDrift = Boolean(liveCluster?.storageClass && liveCluster.storageClass !== 'standard');
  if (plan.namespaceState === 'owned' && plan.clusterState === 'owned' && !storageDrift) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: true, mutated: false, actions: [{ op: 'noop' }] };
  }
  /** @type {{ op: string, context: string, [key: string]: unknown }[]} */
  const actions = [];
  const context = DEV_CNPG_CONTEXT;
  if (!plan.operatorImage || probe.resources?.some((item) => item.kind === 'Deployment' && item.name === 'cnpg-controller-manager' && item.image === plan.operatorImage)) {
    actions.push({ op: 'verify-operator', context, image: plan.operatorImage });
  } else {
    actions.push({
      op: 'apply-operator',
      context,
      image: plan.operatorImage,
      sha256: probe.pin.sha256,
      args: ['--context', context, 'apply', '--server-side', '--field-manager=offscreen-dev-cnpg', '-f', '-'],
    });
  }
  if (options.failAfterOperator) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: true,
      refusals: [{ id: 'partial-operator', detail: 'cluster was not applied; owned data was not deleted' }],
      actions,
    };
  }
  if (plan.namespaceState !== 'owned') {
    actions.push({
      op: 'apply-namespace',
      context,
      manifest: plan.namespaceManifest,
      args: ['--context', context, 'apply', '-f', '-'],
    });
  }
  if (plan.clusterState !== 'owned' || storageDrift) {
    actions.push({
      op: 'apply-cluster',
      context,
      manifest: plan.clusterManifest,
      args: ['--context', context, 'apply', '-f', '-'],
    });
  }
  const touchesRelease = actions.some((action) => JSON.stringify(action).includes(RELEASE_CNPG_NAMESPACE));
  return {
    ...plan,
    mode: 'ensure',
    readOnly: false,
    ok: !touchesRelease,
    mutated: actions.some((action) => action.op !== 'verify-operator' && action.op !== 'noop'),
    actions,
  };
}

/**
 * Rechecks a host-collected probe, then applies only the decided dev actions.
 * Injected probes never reach this function through the CLI.
 * @param {{
 *   collect: () => object,
 *   run: (command: string, args: string[], options?: { input?: string, timeoutMs?: number }) => { ok: boolean, stdout?: string, stderr?: string },
 *   readOperatorManifest?: () => { body: string, sha256: string },
 * }} deps
 */
export function executeAuthorizedDevCnpg(deps) {
  const first = deps.collect();
  const decision = ensureDevCnpg(first, { authorize: true });
  if (!decision.ok) return { ...decision, mutated: false };
  const manifest = deps.readOperatorManifest ? deps.readOperatorManifest() : { body: '', sha256: first.pin.sha256 };
  if (manifest.sha256 !== first.pin.sha256 || !manifest.body.includes(`image: ${first.pin.operatorImage}`)) {
    return {
      ...decision,
      ok: false,
      mutated: false,
      refusals: [{ id: 'operator-manifest-sha-mismatch', detail: 'downloaded operator manifest does not match operator.pin' }],
      actions: [],
    };
  }
  const again = deps.collect();
  const recheck = ensureDevCnpg(again, { authorize: true, operatorManifestSha256: manifest.sha256 });
  if (!recheck.ok) return { ...recheck, mutated: false };
  const completed = [];
  for (const action of recheck.actions) {
    if (action.op === 'noop' || action.op === 'verify-operator') {
      completed.push(action);
      continue;
    }
    let applied = deps.run('kubectl', action.args, {
      input: action.op === 'apply-operator' ? manifest.body : action.manifest,
      timeoutMs: action.op === 'apply-operator' ? 180000 : 60000,
    });
    if (!applied.ok && action.op === 'apply-cluster') {
      for (let attempt = 0; attempt < 12 && !applied.ok; attempt += 1) {
        if (deps.sleep) deps.sleep(5000);
        applied = deps.run('kubectl', action.args, { input: action.manifest, timeoutMs: 60000 });
      }
    }
    completed.push(action);
    if (!applied.ok) {
      return {
        ...recheck,
        ok: false,
        mutated: true,
        refusals: [{ id: `${action.op}-failed`, detail: applied.stderr || `${action.op} failed` }],
        actions: completed,
      };
    }
  }
  return { ...recheck, ok: true, mutated: completed.some((action) => action.op.startsWith('apply-')), actions: completed };
}
