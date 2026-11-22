// Dev-only Temporal plan. The CLI does not install it in this slice.
// The schema Job is created once and is never deleted or replaced.

export const DEV_TEMPORAL_CONTEXT = 'kind-offscreen-dev';
export const DEV_TEMPORAL_CLUSTER_NAME = 'offscreen-dev';
export const DEV_TEMPORAL_NAMESPACE = 'offscreen-dev-temporal';
export const DEV_TEMPORAL_OWNER = 'offscreen-dev';
export const DEV_TEMPORAL_SERVER_IMAGE = 'docker.io/temporalio/server:1.32.2';
export const DEV_TEMPORAL_ADMIN_IMAGE = 'docker.io/temporalio/admin-tools:1.32.2';
export const DEV_TEMPORAL_POSTGRES_IMAGE = 'docker.io/library/postgres:17.11-bookworm';
export const DEV_TEMPORAL_SECRET = 'temporal-db';
export const DEV_TEMPORAL_PVC = 'temporal-postgres';
export const DEV_TEMPORAL_SCHEMA_JOB = 'temporal-schema';
export const DEV_TEMPORAL_STORAGE_CLASS = 'standard';
export const DEV_TEMPORAL_MIN_MEMORY_MIB = 4096;
export const RELEASE_TEMPORAL_NAMESPACE = 'lab-temporal';

const OWNER_LABEL = 'offscreen.dev/owner';

function classify(resource) {
  if (!resource) return 'absent';
  if (resource.owner === DEV_TEMPORAL_OWNER && resource.uid) return 'owned';
  return 'foreign';
}

export function renderDevTemporal() {
  return [
    'apiVersion: v1',
    'kind: Namespace',
    'metadata:',
    `  name: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    '---',
    'apiVersion: v1',
    'kind: PersistentVolumeClaim',
    'metadata:',
    `  name: ${DEV_TEMPORAL_PVC}`,
    `  namespace: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    'spec:',
    '  accessModes: [ReadWriteOnce]',
    `  storageClassName: ${DEV_TEMPORAL_STORAGE_CLASS}`,
    '  resources:',
    '    requests:',
    '      storage: 1Gi',
    '---',
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: temporal-postgres',
    `  namespace: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    'spec:',
    '  replicas: 1',
    '  strategy:',
    '    type: Recreate',
    '  selector:',
    '    matchLabels:',
    '      app: temporal-postgres',
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: temporal-postgres',
    `        ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    '    spec:',
    '      automountServiceAccountToken: false',
    '      enableServiceLinks: false',
    '      securityContext:',
    '        fsGroup: 999',
    '        seccompProfile:',
    '          type: RuntimeDefault',
    '      containers:',
    '        - name: postgres',
    `          image: ${DEV_TEMPORAL_POSTGRES_IMAGE}`,
    '          ports:',
    '            - name: postgres',
    '              containerPort: 5432',
    '          env:',
    '            - name: POSTGRES_USER',
    '              value: temporal',
    '            - name: POSTGRES_PASSWORD',
    '              valueFrom:',
    '                secretKeyRef:',
    `                  name: ${DEV_TEMPORAL_SECRET}`,
    '                  key: password',
    '            - name: POSTGRES_DB',
    '              value: postgres',
    '          resources:',
    '            requests:',
    '              cpu: 50m',
    '              memory: 128Mi',
    '            limits:',
    '              cpu: 500m',
    '              memory: 512Mi',
    '          readinessProbe:',
    '            tcpSocket:',
    '              port: postgres',
    '          volumeMounts:',
    '            - name: data',
    '              mountPath: /var/lib/postgresql/data',
    '      volumes:',
    '        - name: data',
    '          persistentVolumeClaim:',
    `            claimName: ${DEV_TEMPORAL_PVC}`,
    '---',
    'apiVersion: v1',
    'kind: Service',
    'metadata:',
    '  name: temporal-postgres',
    `  namespace: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    'spec:',
    '  type: ClusterIP',
    '  selector:',
    '    app: temporal-postgres',
    '  ports:',
    '    - name: postgres',
    '      port: 5432',
    '      targetPort: postgres',
    '---',
    'apiVersion: batch/v1',
    'kind: Job',
    'metadata:',
    `  name: ${DEV_TEMPORAL_SCHEMA_JOB}`,
    `  namespace: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    'spec:',
    '  backoffLimit: 2',
    '  template:',
    '    spec:',
    '      restartPolicy: Never',
    '      automountServiceAccountToken: false',
    '      enableServiceLinks: false',
    '      containers:',
    '        - name: schema',
    `          image: ${DEV_TEMPORAL_ADMIN_IMAGE}`,
    '          env:',
    '            - name: SQL_PASSWORD',
    '              valueFrom:',
    '                secretKeyRef:',
    `                  name: ${DEV_TEMPORAL_SECRET}`,
    '                  key: password',
    '          command: ["/bin/sh", "-c"]',
    '          args:',
    '            - temporal-sql-tool --plugin postgres12 --ep temporal-postgres -u temporal -p 5432 --db temporal create && temporal-sql-tool --plugin postgres12 --ep temporal-postgres -u temporal -p 5432 --db temporal setup-schema -v 0.0 && temporal-sql-tool --plugin postgres12 --ep temporal-postgres -u temporal -p 5432 --db temporal update-schema -d /etc/temporal/schema/postgresql/v12/temporal/versioned && temporal-sql-tool --plugin postgres12 --ep temporal-postgres -u temporal -p 5432 --db temporal_visibility create && temporal-sql-tool --plugin postgres12 --ep temporal-postgres -u temporal -p 5432 --db temporal_visibility setup-schema -v 0.0 && temporal-sql-tool --plugin postgres12 --ep temporal-postgres -u temporal -p 5432 --db temporal_visibility update-schema -d /etc/temporal/schema/postgresql/v12/visibility/versioned',
    '---',
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: temporal-server',
    `  namespace: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    'spec:',
    '  replicas: 1',
    '  selector:',
    '    matchLabels:',
    '      app: temporal-server',
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: temporal-server',
    `        ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    '    spec:',
    '      automountServiceAccountToken: false',
    '      enableServiceLinks: false',
    '      securityContext:',
    '        runAsNonRoot: true',
    '        runAsUser: 1000',
    '      containers:',
    '        - name: temporal-server',
    `          image: ${DEV_TEMPORAL_SERVER_IMAGE}`,
    '          env:',
    '            - name: POSTGRES_PWD',
    '              valueFrom:',
    '                secretKeyRef:',
    `                  name: ${DEV_TEMPORAL_SECRET}`,
    '                  key: password',
    '          args: ["start", "--allow-no-auth"]',
    '          ports:',
    '            - name: grpc',
    '              containerPort: 7233',
    '          readinessProbe:',
    '            tcpSocket:',
    '              port: grpc',
    '          resources:',
    '            requests:',
    '              cpu: 50m',
    '              memory: 256Mi',
    '            limits:',
    '              cpu: 700m',
    '              memory: 768Mi',
    '---',
    'apiVersion: v1',
    'kind: Service',
    'metadata:',
    '  name: temporal-server',
    `  namespace: ${DEV_TEMPORAL_NAMESPACE}`,
    '  labels:',
    `    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}`,
    'spec:',
    '  type: ClusterIP',
    '  selector:',
    '    app: temporal-server',
    '  ports:',
    '    - name: grpc',
    '      port: 7233',
    '      targetPort: grpc',
    '',
  ].join('\n');
}

export function assessDevTemporal(probe) {
  const refusals = [];
  if (probe.context !== DEV_TEMPORAL_CONTEXT) refusals.push({ id: 'wrong-context', detail: `context is ${probe.context ?? 'unset'}` });
  if (probe.clusterName !== DEV_TEMPORAL_CLUSTER_NAME) refusals.push({ id: 'wrong-cluster', detail: 'cluster is not offscreen-dev' });
  if (probe.baselineOwner !== DEV_TEMPORAL_OWNER) refusals.push({ id: 'baseline-unowned', detail: 'dev baseline owner was not verified' });
  if (!probe.dockerAvailable || !probe.kindAvailable) refusals.push({ id: 'runtime-unavailable', detail: 'docker or kind is unavailable' });
  if ((probe.timedOutCommands ?? []).length > 0) refusals.push({ id: 'command-timeout', detail: probe.timedOutCommands.join(', ') });
  if ((probe.memoryMiB ?? 0) < DEV_TEMPORAL_MIN_MEMORY_MIB) refusals.push({ id: 'insufficient-memory', detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${DEV_TEMPORAL_MIN_MEMORY_MIB}MiB` });
  if (probe.storageClass !== DEV_TEMPORAL_STORAGE_CLASS) refusals.push({ id: 'storage-class-missing', detail: 'storage class standard was not confirmed' });
  const resources = probe.resources ?? [];
  const namespace = resources.find((item) => item.kind === 'Namespace' && item.name === DEV_TEMPORAL_NAMESPACE);
  const secret = resources.find((item) => item.kind === 'Secret' && item.name === DEV_TEMPORAL_SECRET);
  const pvc = resources.find((item) => item.kind === 'PersistentVolumeClaim' && item.name === DEV_TEMPORAL_PVC);
  const job = resources.find((item) => item.kind === 'Job' && item.name === DEV_TEMPORAL_SCHEMA_JOB);
  const server = resources.find((item) => item.kind === 'Deployment' && item.name === 'temporal-server');
  for (const [resource, id] of [[namespace, 'foreign-namespace'], [secret, 'foreign-secret'], [pvc, 'foreign-pvc'], [job, 'foreign-job'], [server, 'foreign-server']]) {
    if (classify(resource) === 'foreign') refusals.push({ id, detail: 'existing resource has no dev ownership' });
  }
  if (classify(job) === 'owned' && job.succeeded !== true && job.failed === true) {
    refusals.push({ id: 'schema-job-failed', detail: 'the existing schema Job failed and will not be deleted' });
  }
  if (classify(server) === 'owned' && server.image !== DEV_TEMPORAL_SERVER_IMAGE) refusals.push({ id: 'image-mismatch', detail: `server image is ${server.image}` });
  if (resources.some((item) => item.namespace === RELEASE_TEMPORAL_NAMESPACE || item.name === RELEASE_TEMPORAL_NAMESPACE)) {
    refusals.push({ id: 'release-resource-in-probe', detail: 'release Temporal resource was included in the dev probe' });
  }
  return {
    refusals,
    namespace: classify(namespace),
    secret: classify(secret),
    pvc: classify(pvc),
    schemaJob: classify(job),
    schemaSucceeded: classify(job) === 'owned' && job.succeeded === true,
    server: classify(server),
  };
}

export function planDevTemporal(probe) {
  const assessment = assessDevTemporal(probe);
  return {
    mode: 'plan',
    readOnly: true,
    context: DEV_TEMPORAL_CONTEXT,
    namespace: DEV_TEMPORAL_NAMESPACE,
    serverImage: DEV_TEMPORAL_SERVER_IMAGE,
    adminImage: DEV_TEMPORAL_ADMIN_IMAGE,
    postgresImage: DEV_TEMPORAL_POSTGRES_IMAGE,
    storageClass: DEV_TEMPORAL_STORAGE_CLASS,
    manifest: renderDevTemporal(),
    refusals: assessment.refusals,
    actions: [],
  };
}

export function statusDevTemporal(probe) {
  return { mode: 'status', readOnly: true, ...assessDevTemporal(probe), actions: [] };
}

export function ensureDevTemporal(probe, options = {}) {
  const plan = planDevTemporal(probe);
  if (!options.authorize) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: false, manifest: undefined, refusals: [...plan.refusals, { id: 'ensure-not-authorized', detail: 'live Temporal ensure was not authorized' }] };
  }
  if (plan.refusals.length > 0) return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: false, manifest: undefined };
  const assessment = assessDevTemporal(probe);
  const actions = [];
  if (assessment.namespace !== 'owned') actions.push({ op: 'ensure-namespace', context: DEV_TEMPORAL_CONTEXT });
  actions.push(assessment.secret === 'owned' ? { op: 'reuse-secret' } : { op: 'create-secret', context: DEV_TEMPORAL_CONTEXT, name: DEV_TEMPORAL_SECRET });
  if (options.failAfterSecret) {
    return { ...plan, mode: 'ensure', readOnly: false, ok: false, mutated: true, manifest: undefined, refusals: [{ id: 'partial-secret', detail: 'postgres and schema were not applied; the secret was not deleted' }], actions };
  }
  actions.push({ op: 'apply-postgres', context: DEV_TEMPORAL_CONTEXT });
  if (!assessment.schemaSucceeded) actions.push({ op: 'create-schema-job', context: DEV_TEMPORAL_CONTEXT, name: DEV_TEMPORAL_SCHEMA_JOB });
  else actions.push({ op: 'reuse-schema-job', name: DEV_TEMPORAL_SCHEMA_JOB });
  actions.push({ op: 'apply-server', context: DEV_TEMPORAL_CONTEXT });
  actions.push({ op: 'verify-readiness', context: DEV_TEMPORAL_CONTEXT });
  return { ...plan, mode: 'ensure', readOnly: false, ok: true, mutated: true, manifest: undefined, actions };
}

function parts() {
  return renderDevTemporal().split('---').map((part) => part.trim()).filter(Boolean);
}

function matching(kind, name) {
  return parts().filter((part) => part.includes(`kind: ${kind}\n`) && part.includes(`name: ${name}`));
}

export function executeAuthorizedDevTemporal(deps) {
  const decision = ensureDevTemporal(deps.collect(), { authorize: true });
  if (!decision.ok && decision.actions.length === 0) return { ...decision, mutated: false };
  const again = ensureDevTemporal(deps.collect(), { authorize: true });
  if (!again.ok && again.actions.length === 0) return { ...again, mutated: false };
  const completed = [];
  const manifests = {
    'ensure-namespace': matching('Namespace', DEV_TEMPORAL_NAMESPACE)[0],
    'apply-postgres': [
      ...matching('PersistentVolumeClaim', DEV_TEMPORAL_PVC),
      ...matching('Deployment', 'temporal-postgres'),
      ...matching('Service', 'temporal-postgres'),
    ].join('\n---\n'),
    'create-schema-job': matching('Job', DEV_TEMPORAL_SCHEMA_JOB)[0],
    'apply-server': [...matching('Deployment', 'temporal-server'), ...matching('Service', 'temporal-server')].join('\n---\n'),
  };
  for (const action of again.actions) {
    if (action.op === 'reuse-secret' || action.op === 'reuse-schema-job') {
      completed.push(action);
      continue;
    }
    if (action.op === 'verify-readiness') {
      const checked = deps.run('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, '-n', DEV_TEMPORAL_NAMESPACE, 'get', 'job', DEV_TEMPORAL_SCHEMA_JOB, '-o', 'jsonpath={.status.succeeded}']);
      completed.push({ op: 'verify-readiness', context: DEV_TEMPORAL_CONTEXT });
      if (!checked.ok || checked.stdout?.trim() !== '1') {
        return { ...again, ok: false, mutated: completed.some((item) => item.op === 'create-secret' || item.op === 'apply-postgres'), refusals: [{ id: 'readiness-failed', detail: 'schema Job has not succeeded; it was not deleted' }], actions: completed };
      }
      continue;
    }
    if (action.op === 'create-secret') {
      const password = deps.generatePassword?.() ?? '';
      if (!password) return { ...again, ok: false, mutated: false, refusals: [{ id: 'credential-generation-failed', detail: 'database password was not generated' }], actions: completed };
      const manifest = `apiVersion: v1\nkind: Secret\nmetadata:\n  name: ${DEV_TEMPORAL_SECRET}\n  namespace: ${DEV_TEMPORAL_NAMESPACE}\n  labels:\n    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}\ntype: Opaque\nstringData:\n  password: ${password}\n`;
      const created = deps.run('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, 'apply', '-f', '-'], { input: manifest });
      completed.push({ op: 'create-secret', name: DEV_TEMPORAL_SECRET });
      if (!created.ok) return { ...again, ok: false, mutated: true, refusals: [{ id: 'create-secret-failed', detail: 'secret apply failed' }], actions: completed };
      continue;
    }
    const verb = action.op === 'create-schema-job' ? 'create' : 'apply';
    const applied = deps.run('kubectl', ['--context', DEV_TEMPORAL_CONTEXT, verb, '-f', '-'], { input: manifests[action.op] });
    completed.push({ op: action.op, context: DEV_TEMPORAL_CONTEXT });
    if (!applied.ok) {
      return { ...again, ok: false, mutated: true, refusals: [{ id: `${action.op}-failed`, detail: 'owned secret and PVC were not deleted' }], actions: completed };
    }
  }
  const mutating = new Set(['ensure-namespace', 'create-secret', 'apply-postgres', 'create-schema-job', 'apply-server']);
  return { ...again, ok: true, mutated: completed.some((action) => mutating.has(action.op)), actions: completed };
}
