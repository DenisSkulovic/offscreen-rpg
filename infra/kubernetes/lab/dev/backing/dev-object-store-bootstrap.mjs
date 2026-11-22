// Dev-only SeaweedFS plan. The CLI does not run a live install in this slice.
// Admin credentials are created once and are never copied into an app namespace.

export const DEV_S3_CONTEXT = 'kind-offscreen-dev';
export const DEV_S3_CLUSTER_NAME = 'offscreen-dev';
export const DEV_S3_NAMESPACE = 'offscreen-dev-objects';
export const DEV_S3_OWNER = 'offscreen-dev';
export const DEV_S3_IMAGE = 'docker.io/chrislusf/seaweedfs:4.54';
export const DEV_S3_SECRET = 'object-store-s3';
export const DEV_S3_PVC = 'object-store-data';
export const DEV_S3_STORAGE_CLASS = 'standard';
export const DEV_S3_MIN_MEMORY_MIB = 4096;
export const RELEASE_S3_NAMESPACE = 'lab-objects';

const OWNER_LABEL = 'offscreen.dev/owner';

/**
 * @param {{ owner?: string, uid?: string } | undefined} resource
 * @returns {'absent' | 'owned' | 'foreign'}
 */
function classify(resource) {
  if (!resource) return 'absent';
  if (resource.owner === DEV_S3_OWNER && resource.uid) return 'owned';
  return 'foreign';
}

export function renderDevObjectStore() {
  return [
    'apiVersion: v1',
    'kind: Namespace',
    'metadata:',
    `  name: ${DEV_S3_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_S3_OWNER}`,
    '---',
    'apiVersion: v1',
    'kind: PersistentVolumeClaim',
    'metadata:',
    `  name: ${DEV_S3_PVC}`,
    `  namespace: ${DEV_S3_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_S3_OWNER}`,
    'spec:',
    '  accessModes: [ReadWriteOnce]',
    `  storageClassName: ${DEV_S3_STORAGE_CLASS}`,
    '  resources:',
    '    requests:',
    '      storage: 2Gi',
    '---',
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: object-store',
    `  namespace: ${DEV_S3_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_S3_OWNER}`,
    'spec:',
    '  replicas: 1',
    '  strategy:',
    '    type: Recreate',
    '  selector:',
    '    matchLabels:',
    '      app: object-store',
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: object-store',
    `        ${OWNER_LABEL}: ${DEV_S3_OWNER}`,
    '    spec:',
    '      automountServiceAccountToken: false',
    '      enableServiceLinks: false',
    '      securityContext:',
    '        runAsNonRoot: true',
    '        runAsUser: 1000',
    '        runAsGroup: 1000',
    '        fsGroup: 1000',
    '        seccompProfile:',
    '          type: RuntimeDefault',
    '      containers:',
    '        - name: seaweedfs',
    `          image: ${DEV_S3_IMAGE}`,
    '          imagePullPolicy: IfNotPresent',
    '          args: ["mini", "-dir=/data"]',
    '          securityContext:',
    '            allowPrivilegeEscalation: false',
    '            capabilities:',
    '              drop: ["ALL"]',
    '          ports:',
    '            - name: s3',
    '              containerPort: 8333',
    '          env:',
    '            - name: AWS_ACCESS_KEY_ID',
    '              valueFrom:',
    '                secretKeyRef:',
    `                  name: ${DEV_S3_SECRET}`,
    '                  key: access-key-id',
    '            - name: AWS_SECRET_ACCESS_KEY',
    '              valueFrom:',
    '                secretKeyRef:',
    `                  name: ${DEV_S3_SECRET}`,
    '                  key: secret-access-key',
    '          resources:',
    '            requests:',
    '              cpu: 50m',
    '              memory: 128Mi',
    '            limits:',
    '              cpu: 500m',
    '              memory: 768Mi',
    '          volumeMounts:',
    '            - name: data',
    '              mountPath: /data',
    '      volumes:',
    '        - name: data',
    '          persistentVolumeClaim:',
    `            claimName: ${DEV_S3_PVC}`,
    '---',
    'apiVersion: v1',
    'kind: Service',
    'metadata:',
    '  name: object-store',
    `  namespace: ${DEV_S3_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_S3_OWNER}`,
    'spec:',
    '  type: ClusterIP',
    '  selector:',
    '    app: object-store',
    '  ports:',
    '    - name: s3',
    '      port: 8333',
    '      targetPort: s3',
    '',
  ].join('\n');
}

/**
 * @param {object} probe
 */
export function assessDevObjectStore(probe) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (probe.context !== DEV_S3_CONTEXT) refusals.push({ id: 'wrong-context', detail: `context is ${probe.context ?? 'unset'}` });
  if (probe.clusterName !== DEV_S3_CLUSTER_NAME) refusals.push({ id: 'wrong-cluster', detail: 'cluster is not offscreen-dev' });
  if (probe.baselineOwner !== DEV_S3_OWNER) refusals.push({ id: 'baseline-unowned', detail: 'dev baseline owner was not verified' });
  if (!probe.dockerAvailable || !probe.kindAvailable) refusals.push({ id: 'runtime-unavailable', detail: 'docker or kind is unavailable' });
  if ((probe.timedOutCommands ?? []).length > 0) refusals.push({ id: 'command-timeout', detail: probe.timedOutCommands.join(', ') });
  if ((probe.memoryMiB ?? 0) < DEV_S3_MIN_MEMORY_MIB) {
    refusals.push({ id: 'insufficient-memory', detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${DEV_S3_MIN_MEMORY_MIB}MiB` });
  }
  const resources = probe.resources ?? [];
  const namespace = resources.find((item) => item.kind === 'Namespace' && item.name === DEV_S3_NAMESPACE);
  const secret = resources.find((item) => item.kind === 'Secret' && item.name === DEV_S3_SECRET);
  const pvc = resources.find((item) => item.kind === 'PersistentVolumeClaim' && item.name === DEV_S3_PVC);
  const deployment = resources.find((item) => item.kind === 'Deployment' && item.name === 'object-store');
  const service = resources.find((item) => item.kind === 'Service' && item.name === 'object-store');
  if (classify(namespace) === 'foreign') refusals.push({ id: 'foreign-namespace', detail: `${DEV_S3_NAMESPACE} exists without dev ownership` });
  if (classify(secret) === 'foreign') refusals.push({ id: 'foreign-secret', detail: `${DEV_S3_SECRET} exists without dev ownership` });
  if (classify(pvc) === 'foreign') refusals.push({ id: 'foreign-pvc', detail: `${DEV_S3_PVC} exists without dev ownership` });
  if (classify(deployment) === 'foreign') refusals.push({ id: 'foreign-deployment', detail: 'object-store Deployment exists without dev ownership' });
  if (classify(service) === 'foreign') refusals.push({ id: 'foreign-service', detail: 'object-store Service exists without dev ownership' });
  if (classify(deployment) === 'owned' && deployment.image !== DEV_S3_IMAGE) refusals.push({ id: 'image-mismatch', detail: `image is ${deployment.image}` });
  if (classify(service) === 'owned' && service.serviceType !== 'ClusterIP') {
    refusals.push({ id: 'service-not-private', detail: `service type is ${service.serviceType}` });
  }
  if (resources.some((item) => item.namespace === RELEASE_S3_NAMESPACE || item.name === RELEASE_S3_NAMESPACE)) {
    refusals.push({ id: 'release-resource-in-probe', detail: 'release object-store resource was included in the dev probe' });
  }
  if (resources.some((item) => item.kind === 'Secret' && item.namespace && item.namespace !== DEV_S3_NAMESPACE && item.name === DEV_S3_SECRET)) {
    refusals.push({ id: 'admin-secret-copied', detail: 'admin secret is present outside the backing namespace' });
  }
  return {
    refusals,
    namespace: classify(namespace),
    secret: classify(secret),
    pvc: classify(pvc),
    deployment: classify(deployment),
    service: classify(service),
  };
}

function namespaceManifest() {
  return renderDevObjectStore().split('---')[0];
}

function workloadManifest() {
  return renderDevObjectStore().split('---').slice(1).join('---');
}

/**
 * @param {object} probe
 */
export function planDevObjectStore(probe) {
  const assessment = assessDevObjectStore(probe);
  return {
    mode: 'plan',
    readOnly: true,
    context: DEV_S3_CONTEXT,
    namespace: DEV_S3_NAMESPACE,
    image: DEV_S3_IMAGE,
    storageClass: DEV_S3_STORAGE_CLASS,
    serviceType: 'ClusterIP',
    secretName: DEV_S3_SECRET,
    secretState: assessment.secret,
    manifest: renderDevObjectStore(),
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 */
export function statusDevObjectStore(probe) {
  const assessment = assessDevObjectStore(probe);
  return { mode: 'status', readOnly: true, ...assessment, actions: [] };
}

/**
 * @param {object} probe
 * @param {{ authorize?: boolean, failAfterSecret?: boolean }} [options]
 */
export function ensureDevObjectStore(probe, options = {}) {
  const plan = planDevObjectStore(probe);
  if (!options.authorize) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: false, manifest: undefined, refusals: [...plan.refusals, { id: 'ensure-not-authorized', detail: 'live object-store ensure was not authorized' }] };
  }
  if (plan.refusals.length > 0) return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: false, manifest: undefined };
  const assessment = assessDevObjectStore(probe);
  const complete = assessment.namespace === 'owned' && assessment.secret === 'owned' && assessment.pvc === 'owned' && assessment.deployment === 'owned' && assessment.service === 'owned';
  if (complete) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: true, mutated: false, manifest: undefined, actions: [{ op: 'reuse-secret' }, { op: 'verify-readiness', context: DEV_S3_CONTEXT }] };
  }
  /** @type {{ op: string, context?: string, [key: string]: unknown }[]} */
  const actions = [];
  if (assessment.namespace !== 'owned') {
    actions.push({ op: 'ensure-namespace', context: DEV_S3_CONTEXT, name: DEV_S3_NAMESPACE });
  }
  if (assessment.secret !== 'owned') {
    actions.push({ op: 'create-secret', context: DEV_S3_CONTEXT, namespace: DEV_S3_NAMESPACE, name: DEV_S3_SECRET });
  } else {
    actions.push({ op: 'reuse-secret', name: DEV_S3_SECRET });
  }
  if (options.failAfterSecret) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: true, manifest: undefined, refusals: [{ id: 'partial-secret', detail: 'workloads were not applied; the secret was not deleted' }], actions };
  }
  actions.push({ op: 'apply-workloads', context: DEV_S3_CONTEXT });
  actions.push({ op: 'verify-readiness', context: DEV_S3_CONTEXT });
  return {
    ...plan,
    mode: 'ensure',
    readOnly: false,
    ok: true,
    mutated: true,
    manifest: undefined,
    actions,
  };
}

/**
 * @param {{
 *   collect: () => object,
 *   run: (command: string, args: string[], options?: { input?: string }) => { ok: boolean, stderr?: string },
 *   generateCredentials?: () => { accessKeyId: string, secretAccessKey: string },
 * }} deps
 */
export function executeAuthorizedDevObjectStore(deps) {
  const decision = ensureDevObjectStore(deps.collect(), { authorize: true });
  if (!decision.ok && decision.actions.length === 0) return { ...decision, mutated: false };
  const again = ensureDevObjectStore(deps.collect(), { authorize: true });
  if (!again.ok && again.actions.length === 0) return { ...again, mutated: false };
  const completed = [];
  for (const action of again.actions) {
    if (action.op === 'reuse-secret') {
      completed.push(action);
      continue;
    }
    if (action.op === 'ensure-namespace') {
      const created = deps.run('kubectl', ['--context', DEV_S3_CONTEXT, 'apply', '-f', '-'], { input: namespaceManifest() });
      completed.push({ op: 'ensure-namespace', context: DEV_S3_CONTEXT });
      if (!created.ok) {
        return { ...again, ok: false, mutated: true, refusals: [{ id: 'ensure-namespace-failed', detail: 'namespace apply failed' }], actions: completed };
      }
      continue;
    }
    if (action.op === 'verify-readiness') {
      const checked = deps.run('kubectl', ['--context', DEV_S3_CONTEXT, '-n', DEV_S3_NAMESPACE, 'get', `pvc/${DEV_S3_PVC}`, 'deploy/object-store', 'svc/object-store']);
      completed.push({ op: 'verify-readiness', context: DEV_S3_CONTEXT });
      if (!checked.ok) {
        return { ...again, ok: false, mutated: completed.some((item) => item.op !== 'reuse-secret' && item.op !== 'verify-readiness'), refusals: [{ id: 'readiness-failed', detail: 'owned workloads were not ready' }], actions: completed };
      }
      continue;
    }
    if (action.op === 'create-secret') {
      const credentials = deps.generateCredentials?.() ?? { accessKeyId: '', secretAccessKey: '' };
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        return { ...again, ok: false, mutated: false, refusals: [{ id: 'credential-generation-failed', detail: 'admin credentials were not generated' }], actions: completed };
      }
      const manifest = [
        'apiVersion: v1',
        'kind: Secret',
        'metadata:',
        `  name: ${DEV_S3_SECRET}`,
        `  namespace: ${DEV_S3_NAMESPACE}`,
        '  labels:',
        `    ${OWNER_LABEL}: ${DEV_S3_OWNER}`,
        'type: Opaque',
        'stringData:',
        `  access-key-id: ${credentials.accessKeyId}`,
        `  secret-access-key: ${credentials.secretAccessKey}`,
        '',
      ].join('\n');
      const created = deps.run('kubectl', ['--context', DEV_S3_CONTEXT, 'apply', '-f', '-'], { input: manifest });
      completed.push({ op: 'create-secret', name: DEV_S3_SECRET });
      if (!created.ok) {
        return { ...again, ok: false, mutated: true, refusals: [{ id: 'create-secret-failed', detail: 'secret apply failed' }], actions: completed };
      }
      continue;
    }
    const applied = deps.run('kubectl', ['--context', DEV_S3_CONTEXT, 'apply', '-f', '-'], { input: workloadManifest() });
    completed.push({ op: action.op, context: action.context });
    if (!applied.ok) {
      return { ...again, ok: false, mutated: true, refusals: [{ id: 'apply-workloads-failed', detail: 'workload apply failed; owned secret was not deleted' }], actions: completed };
    }
  }
  return { ...again, ok: true, mutated: completed.some((action) => action.op !== 'reuse-secret' && action.op !== 'noop'), actions: completed };
}
