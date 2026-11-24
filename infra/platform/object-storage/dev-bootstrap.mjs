// Dev-only SeaweedFS plan. The CLI does not run a live install in this slice.
// Admin credentials are created once and are never copied into an app namespace.

import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

const devProfile = readPlatformProfile('dev');
const releaseProfile = readPlatformProfile('release');

export const DEV_S3_CONTEXT = devProfile.contextName;
export const DEV_S3_CLUSTER_NAME = devProfile.clusterName;
export const DEV_S3_NAMESPACE = devProfile.namespaces.objectStorage;
export const DEV_S3_OWNER = devProfile.ownerValue;
export const DEV_S3_IMAGE = 'docker.io/chrislusf/seaweedfs:4.54';
export const DEV_S3_SECRET = 'object-store-s3';
export const DEV_S3_PVC = 'object-store-data';
export const DEV_S3_STORAGE_CLASS = devProfile.storageClass;
export const DEV_S3_MIN_MEMORY_MIB = 4096;
export const RELEASE_S3_NAMESPACE = releaseProfile.namespaces.objectStorage;

const DEV_OWNER_LABEL = `${devProfile.ownerLabel}/owner`;

/**
 * @param {{ run?: import('../common/commands.mjs').runPlatformCommand }} [deps]
 */
export function renderDevObjectStore(deps = {}) {
  return renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'object-storage', profile: 'dev', section: 'all' },
      deps,
    ),
  );
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: import('../common/commands.mjs').runPlatformCommand }} [deps]
 */
function renderWorkloadsYaml(profileId, deps = {}) {
  return renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'object-storage', profile: profileId, section: 'workloads' },
      deps,
    ),
  );
}

/**
 * @param {{ run?: import('../common/commands.mjs').runPlatformCommand }} [deps]
 */
function namespaceManifest(deps = {}) {
  return renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'object-storage', profile: 'dev', section: 'namespace' },
      deps,
    ),
  );
}

/**
 * @param {{ run?: import('../common/commands.mjs').runPlatformCommand }} [deps]
 */
function workloadManifest(deps = {}) {
  return renderWorkloadsYaml('dev', deps);
}

/**
 * @param {{ accessKeyId: string, secretAccessKey: string }} credentials
 */
function devSecretManifest(credentials) {
  return JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: DEV_S3_SECRET,
      namespace: DEV_S3_NAMESPACE,
      labels: { [DEV_OWNER_LABEL]: DEV_S3_OWNER },
    },
    type: 'Opaque',
    stringData: {
      'access-key-id': credentials.accessKeyId,
      'secret-access-key': credentials.secretAccessKey,
    },
  });
}

/**
 * @param {{ owner?: string, uid?: string } | undefined} resource
 * @param {string} expectedOwner
 * @returns {'absent' | 'owned' | 'foreign'}
 */
function classify(resource, expectedOwner) {
  if (!resource) return 'absent';
  if (resource.owner === expectedOwner && resource.uid) return 'owned';
  return 'foreign';
}

/**
 * @param {object} probe
 */
export function assessDevObjectStore(probe) {
  return assessObjectStoreProbe(probe, 'dev');
}

/**
 * @param {object} probe
 * @param {'dev' | 'release'} profileId
 */
export function assessObjectStoreProbe(probe, profileId) {
  const profile = readPlatformProfile(profileId);
  const context = profile.contextName;
  const clusterName = profile.clusterName;
  const namespace = profile.namespaces.objectStorage;
  const storageClass = profile.storageClass;
  const ownerValue = profile.ownerValue;
  const image = DEV_S3_IMAGE;
  const foreignNamespace =
    profileId === 'dev' ? RELEASE_S3_NAMESPACE : DEV_S3_NAMESPACE;

  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if ((probe.unreadables ?? []).length > 0) {
    refusals.push({
      id: 'unreadable-state',
      detail: probe.unreadables
        .map((item) => `${item.kind}/${item.name}`)
        .join(', '),
    });
  }
  if (probe.context !== context) {
    refusals.push({
      id: 'wrong-context',
      detail: `context is ${probe.context ?? 'unset'}`,
    });
  }
  if (probe.clusterName !== clusterName) {
    refusals.push({
      id: 'wrong-cluster',
      detail: `cluster is not ${clusterName}`,
    });
  }
  if (profileId === 'dev' && probe.baselineOwner !== DEV_S3_OWNER) {
    refusals.push({
      id: 'baseline-unowned',
      detail: 'dev baseline owner was not verified',
    });
  }
  if (profileId === 'dev') {
    if (!probe.dockerAvailable || !probe.kindAvailable) {
      refusals.push({
        id: 'runtime-unavailable',
        detail: 'docker or kind is unavailable',
      });
    }
    if ((probe.timedOutCommands ?? []).length > 0) {
      refusals.push({
        id: 'command-timeout',
        detail: probe.timedOutCommands.join(', '),
      });
    }
    if ((probe.memoryMiB ?? 0) < DEV_S3_MIN_MEMORY_MIB) {
      refusals.push({
        id: 'insufficient-memory',
        detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${DEV_S3_MIN_MEMORY_MIB}MiB`,
      });
    }
  }
  if (probe.storageClass !== storageClass) {
    refusals.push({
      id: 'storage-class-missing',
      detail: `storage class ${storageClass} was not confirmed`,
    });
  }

  const resources = probe.resources ?? [];
  const namespaceRes = resources.find(
    (item) => item.kind === 'Namespace' && item.name === namespace,
  );
  const secret = resources.find(
    (item) => item.kind === 'Secret' && item.name === DEV_S3_SECRET,
  );
  const pvc = resources.find(
    (item) => item.kind === 'PersistentVolumeClaim' && item.name === DEV_S3_PVC,
  );
  const deployment = resources.find(
    (item) => item.kind === 'Deployment' && item.name === 'object-store',
  );
  const service = resources.find(
    (item) => item.kind === 'Service' && item.name === 'object-store',
  );

  if (classify(namespaceRes, ownerValue) === 'foreign') {
    refusals.push({
      id: 'foreign-namespace',
      detail: `${namespace} exists without ownership`,
    });
  }
  if (classify(secret, ownerValue) === 'foreign') {
    refusals.push({
      id: 'foreign-secret',
      detail: `${DEV_S3_SECRET} exists without ownership`,
    });
  }
  if (classify(pvc, ownerValue) === 'foreign') {
    refusals.push({
      id: 'foreign-pvc',
      detail: `${DEV_S3_PVC} exists without ownership`,
    });
  }
  if (classify(deployment, ownerValue) === 'foreign') {
    refusals.push({
      id: 'foreign-deployment',
      detail: 'object-store Deployment exists without ownership',
    });
  }
  if (classify(service, ownerValue) === 'foreign') {
    refusals.push({
      id: 'foreign-service',
      detail: 'object-store Service exists without ownership',
    });
  }
  if (
    pvc &&
    classify(pvc, ownerValue) !== 'absent' &&
    pvc.storageClass &&
    pvc.storageClass !== storageClass
  ) {
    refusals.push({
      id: 'storage-class-mismatch',
      detail: `PVC storage class is ${pvc.storageClass}, expected ${storageClass}`,
    });
  }
  const secretClass = classify(secret, ownerValue);
  const pvcClass = classify(pvc, ownerValue);
  const deploymentClass = classify(deployment, ownerValue);
  if (
    (pvcClass !== 'absent' || deploymentClass !== 'absent') &&
    secretClass === 'absent'
  ) {
    refusals.push({
      id: 'admin-secret-missing',
      detail: 'PVC or Deployment exists without admin Secret',
    });
  }
  if (
    classify(deployment, ownerValue) === 'owned' &&
    deployment.image !== image
  ) {
    refusals.push({
      id: 'image-mismatch',
      detail: `image is ${deployment.image}`,
    });
  }
  if (
    classify(service, ownerValue) === 'owned' &&
    service.serviceType !== 'ClusterIP'
  ) {
    refusals.push({
      id: 'service-not-private',
      detail: `service type is ${service.serviceType}`,
    });
  }
  if (
    resources.some(
      (item) =>
        item.namespace === foreignNamespace || item.name === foreignNamespace,
    )
  ) {
    refusals.push({
      id: 'foreign-profile-resource-in-probe',
      detail: 'a resource from the other profile was included in the probe',
    });
  }
  if (
    resources.some(
      (item) =>
        item.kind === 'Secret' &&
        item.namespace &&
        item.namespace !== namespace &&
        item.name === DEV_S3_SECRET,
    )
  ) {
    refusals.push({
      id: 'admin-secret-copied',
      detail: 'admin secret is present outside the backing namespace',
    });
  }

  return {
    refusals,
    namespace: classify(namespaceRes, ownerValue),
    secret: secretClass,
    pvc: pvcClass,
    deployment: deploymentClass,
    service: classify(service, ownerValue),
  };
}

/**
 * @param {{ pvcPhase?: string, availableReplicas?: string, s3Status?: string }} sample
 */
export function objectStoreReadinessMet(sample) {
  const replicas = Number(sample.availableReplicas);
  return (
    sample.pvcPhase === 'Bound' &&
    replicas >= 1 &&
    (sample.s3Status === '200' || sample.s3Status === '403')
  );
}

/**
 * @param {{ run: Function, sleep?: (ms: number) => void, now?: () => number, readinessTimeoutMs?: number, context?: string, namespace?: string, pvcName?: string }} deps
 */
export function waitForObjectStoreReadiness(deps) {
  const context = deps.context ?? DEV_S3_CONTEXT;
  const namespace = deps.namespace ?? DEV_S3_NAMESPACE;
  const pvcName = deps.pvcName ?? DEV_S3_PVC;
  const sleep = deps.sleep ?? (() => {});
  const now = deps.now ?? Date.now;
  const deadline = now() + (deps.readinessTimeoutMs ?? 360000);
  let pvcPhase = '';
  let availableReplicas = '';
  let s3Status = '';
  while (now() <= deadline) {
    pvcPhase =
      deps
        .run('kubectl', [
          '--context',
          context,
          '-n',
          namespace,
          'get',
          'pvc',
          pvcName,
          '-o',
          'jsonpath={.status.phase}',
        ])
        .stdout?.trim() ?? '';
    availableReplicas =
      deps
        .run('kubectl', [
          '--context',
          context,
          '-n',
          namespace,
          'get',
          'deploy',
          'object-store',
          '-o',
          'jsonpath={.status.availableReplicas}',
        ])
        .stdout?.trim() ?? '';
    s3Status =
      deps
        .run('kubectl', [
          '--context',
          context,
          '-n',
          namespace,
          'exec',
          'deploy/object-store',
          '--',
          'curl',
          '-s',
          '-o',
          '/dev/null',
          '-w',
          '%{http_code}',
          'http://127.0.0.1:8333/',
        ])
        .stdout?.trim() ?? '';
    if (objectStoreReadinessMet({ pvcPhase, availableReplicas, s3Status })) {
      return { ok: true, pvcPhase, availableReplicas, s3Status };
    }
    if (now() >= deadline) break;
    sleep(5000);
  }
  return { ok: false, pvcPhase, availableReplicas, s3Status };
}

/** @param {Parameters<typeof waitForObjectStoreReadiness>[0]} deps */
export function waitForDevObjectStoreReadiness(deps) {
  return waitForObjectStoreReadiness(deps);
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
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      manifest: undefined,
      refusals: [
        ...plan.refusals,
        {
          id: 'ensure-not-authorized',
          detail: 'live object-store ensure was not authorized',
        },
      ],
    };
  }
  if (plan.refusals.length > 0) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      manifest: undefined,
    };
  }
  const assessment = assessDevObjectStore(probe);
  const complete =
    assessment.namespace === 'owned' &&
    assessment.secret === 'owned' &&
    assessment.pvc === 'owned' &&
    assessment.deployment === 'owned' &&
    assessment.service === 'owned';
  if (complete) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: true,
      mutated: false,
      manifest: undefined,
      actions: [
        { op: 'reuse-secret' },
        { op: 'verify-readiness', context: DEV_S3_CONTEXT },
      ],
    };
  }
  /** @type {{ op: string, context?: string, [key: string]: unknown }[]} */
  const actions = [];
  if (assessment.namespace !== 'owned') {
    actions.push({
      op: 'ensure-namespace',
      context: DEV_S3_CONTEXT,
      name: DEV_S3_NAMESPACE,
    });
  }
  if (assessment.secret === 'owned') {
    actions.push({ op: 'reuse-secret', name: DEV_S3_SECRET });
  } else if (
    assessment.secret === 'absent' &&
    assessment.pvc === 'absent' &&
    assessment.deployment === 'absent'
  ) {
    actions.push({
      op: 'create-secret',
      context: DEV_S3_CONTEXT,
      namespace: DEV_S3_NAMESPACE,
      name: DEV_S3_SECRET,
    });
  }
  if (options.failAfterSecret) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: true,
      manifest: undefined,
      refusals: [
        {
          id: 'partial-secret',
          detail: 'workloads were not applied; the secret was not deleted',
        },
      ],
      actions,
    };
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
 *   renderDeps?: { run?: import('../common/commands.mjs').runPlatformCommand },
 * }} deps
 */
export function executeAuthorizedDevObjectStore(deps) {
  const renderDeps = deps.renderDeps ?? {};
  const decision = ensureDevObjectStore(deps.collect(), { authorize: true });
  if (!decision.ok && decision.actions.length === 0) {
    return { ...decision, mutated: false };
  }
  const again = ensureDevObjectStore(deps.collect(), { authorize: true });
  if (!again.ok && again.actions.length === 0) {
    return { ...again, mutated: false };
  }
  const completed = [];
  for (const action of again.actions) {
    if (action.op === 'reuse-secret') {
      completed.push(action);
      continue;
    }
    if (action.op === 'ensure-namespace') {
      const created = deps.run(
        'kubectl',
        ['--context', DEV_S3_CONTEXT, 'apply', '-f', '-'],
        { input: namespaceManifest(renderDeps) },
      );
      completed.push({ op: 'ensure-namespace', context: DEV_S3_CONTEXT });
      if (!created.ok) {
        return {
          ...again,
          ok: false,
          mutated: true,
          refusals: [
            { id: 'ensure-namespace-failed', detail: 'namespace apply failed' },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'verify-readiness') {
      const ready = waitForDevObjectStoreReadiness(deps);
      completed.push({
        op: 'verify-readiness',
        context: DEV_S3_CONTEXT,
        pvcPhase: ready.pvcPhase,
        availableReplicas: ready.availableReplicas,
        s3Status: ready.s3Status,
      });
      if (!ready.ok) {
        return {
          ...again,
          ok: false,
          mutated: completed.some(
            (item) =>
              item.op !== 'reuse-secret' && item.op !== 'verify-readiness',
          ),
          refusals: [
            {
              id: 'readiness-failed',
              detail: 'PVC, Deployment, or S3 endpoint did not become ready',
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'create-secret') {
      const credentials = deps.generateCredentials?.() ?? {
        accessKeyId: '',
        secretAccessKey: '',
      };
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        return {
          ...again,
          ok: false,
          mutated: false,
          refusals: [
            {
              id: 'credential-generation-failed',
              detail: 'admin credentials were not generated',
            },
          ],
          actions: completed,
        };
      }
      const created = deps.run(
        'kubectl',
        ['--context', DEV_S3_CONTEXT, 'create', '-f', '-'],
        { input: devSecretManifest(credentials) },
      );
      completed.push({ op: 'create-secret', name: DEV_S3_SECRET });
      if (!created.ok) {
        return {
          ...again,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: 'create-secret-failed',
              detail: 'secret create failed or conflicted',
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    const applied = deps.run(
      'kubectl',
      ['--context', DEV_S3_CONTEXT, 'apply', '-f', '-'],
      { input: workloadManifest(renderDeps) },
    );
    completed.push({ op: action.op, context: action.context });
    if (!applied.ok) {
      return {
        ...again,
        ok: false,
        mutated: true,
        refusals: [
          {
            id: 'apply-workloads-failed',
            detail: 'workload apply failed; owned secret was not deleted',
          },
        ],
        actions: completed,
      };
    }
  }
  const mutating = new Set([
    'ensure-namespace',
    'create-secret',
    'apply-workloads',
  ]);
  return {
    ...again,
    ok: true,
    mutated: completed.some((action) => mutating.has(action.op)),
    actions: completed,
  };
}

export {
  namespaceManifest,
  workloadManifest,
  devSecretManifest,
  renderWorkloadsYaml,
};
