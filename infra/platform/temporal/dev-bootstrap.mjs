// Dev-only Temporal plan. The CLI does not install it in this slice.
// The schema Job is created once and is never deleted or replaced.

import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  renderPlatformDocuments,
  renderPlatformManifestText,
  renderPlatformYaml,
} from '../common/render.mjs';
import { decideTemporalBootstrap } from './schema-policy.mjs';

const temporalRoot = dirname(fileURLToPath(import.meta.url));
const chartRoot = join(temporalRoot, 'chart');

export const DEV_TEMPORAL_CONTEXT = 'kind-offscreen-dev';
export const DEV_TEMPORAL_CLUSTER_NAME = 'offscreen-dev';
export const DEV_TEMPORAL_NAMESPACE = 'offscreen-dev-temporal';
export const DEV_TEMPORAL_OWNER = 'offscreen-dev';
export const DEV_TEMPORAL_SERVER_IMAGE = 'docker.io/temporalio/server:1.32.2';
export const DEV_TEMPORAL_ADMIN_IMAGE =
  'docker.io/temporalio/admin-tools:1.32.2';
export const DEV_TEMPORAL_POSTGRES_IMAGE =
  'docker.io/library/postgres:17.11-bookworm';
export const DEV_TEMPORAL_SECRET = 'temporal-db';
export const DEV_TEMPORAL_PVC = 'temporal-postgres';
export const DEV_TEMPORAL_SCHEMA_JOB = 'temporal-schema';
export const DEV_TEMPORAL_SCRIPTS_CONFIGMAP = 'temporal-server-scripts';
export const DEV_TEMPORAL_DYNAMIC_CONFIGMAP = 'temporal-dynamic';
export const DEV_TEMPORAL_STORAGE_CLASS = 'standard';
export const DEV_TEMPORAL_MIN_MEMORY_MIB = 4096;
export const RELEASE_TEMPORAL_NAMESPACE = 'lab-temporal';

const OWNER_LABEL = 'offscreen.dev/owner';
const devProfile = readPlatformProfile('dev');

/**
 * @param {{ kind: string, name: string, owner?: string | null, uid?: string | null, succeeded?: boolean, failed?: boolean } | undefined} resource
 */
function classify(resource) {
  if (!resource) return 'absent';
  if (resource.owner === DEV_TEMPORAL_OWNER && resource.uid) return 'owned';
  if (resource.uid) return 'foreign';
  return 'foreign';
}

/**
 * @param {object} probe
 * @param {string} kind
 * @param {string} name
 */
function findProbeResource(probe, kind, name) {
  return (probe.resources ?? []).find(
    (item) => item.kind === kind && item.name === name,
  );
}

/**
 * @param {{ succeeded?: boolean, failed?: boolean, conditionComplete?: string, uid?: string | null }} resource
 * @returns {'Complete' | 'Failed' | 'Pending' | 'Unknown' | undefined}
 */
function jobConditionFromProbe(resource) {
  if (!resource?.uid) return undefined;
  if (resource.succeeded) return 'Complete';
  if (resource.failed) return 'Failed';
  if (resource.conditionComplete === 'True') return 'Complete';
  if (resource.conditionComplete === 'False') return 'Failed';
  return 'Pending';
}

/**
 * @param {object} probe
 */
function probeToBootstrapInput(probe) {
  const toState = (resource, kind, name) => {
    const item = findProbeResource(probe, kind, name);
    if (!item) return { state: 'absent' };
    return {
      state: 'present',
      foreign: classify(item) === 'foreign',
      owner: item.owner,
      uid: item.uid ?? undefined,
      image: item.image ?? undefined,
      ready: kind === 'Deployment' ? item.succeeded : undefined,
      condition: kind === 'Job' ? jobConditionFromProbe(item) : undefined,
    };
  };

  return {
    profileId: 'dev',
    ownerValue: devProfile.ownerValue,
    namespace: toState(probe, 'Namespace', DEV_TEMPORAL_NAMESPACE),
    secret: toState(probe, 'Secret', DEV_TEMPORAL_SECRET),
    pvc: toState(probe, 'PersistentVolumeClaim', DEV_TEMPORAL_PVC),
    postgres: toState(probe, 'Deployment', 'temporal-postgres'),
    server: toState(probe, 'Deployment', 'temporal-server'),
    schemaJob: toState(probe, 'Job', DEV_TEMPORAL_SCHEMA_JOB),
    verifiedExistingSchema: false,
  };
}

/**
 * @param {object[]} actions
 */
function presentDevEnsureActions(actions) {
  const omit = new Set([
    'wait-postgres-ready',
    'wait-authenticated-sql',
    'wait-schema-job',
  ]);
  return actions
    .filter((action) => !omit.has(action.op))
    .map((action) =>
      action.op === 'verify-schema-tables'
        ? { ...action, op: 'verify-schema' }
        : action,
    );
}

export function renderDevTemporal() {
  return renderPlatformManifestText(
    { service: 'temporal', profile: 'dev', section: 'all' },
    { chartRoot },
  ).replace(/\n$/, '');
}

/**
 * @param {object} probe
 */
export function assessDevTemporal(probe) {
  const refusals = [];
  if ((probe.unreadableResources ?? []).length > 0) {
    refusals.push({
      id: 'resource-unreadable',
      detail: `unreadable resources: ${probe.unreadableResources.join(', ')}`,
    });
  }
  if (probe.context !== DEV_TEMPORAL_CONTEXT) {
    refusals.push({
      id: 'wrong-context',
      detail: `context is ${probe.context ?? 'unset'}`,
    });
  }
  if (probe.clusterName !== DEV_TEMPORAL_CLUSTER_NAME) {
    refusals.push({
      id: 'wrong-cluster',
      detail: 'cluster is not offscreen-dev',
    });
  }
  if (probe.baselineOwner !== DEV_TEMPORAL_OWNER) {
    refusals.push({
      id: 'baseline-unowned',
      detail: 'dev baseline owner was not verified',
    });
  }
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
  if ((probe.memoryMiB ?? 0) < DEV_TEMPORAL_MIN_MEMORY_MIB) {
    refusals.push({
      id: 'insufficient-memory',
      detail: `available memory ${probe.memoryMiB ?? 0}MiB is below ${DEV_TEMPORAL_MIN_MEMORY_MIB}MiB`,
    });
  }
  if (probe.storageClass !== DEV_TEMPORAL_STORAGE_CLASS) {
    refusals.push({
      id: 'storage-class-missing',
      detail: 'storage class standard was not confirmed',
    });
  }
  const resources = probe.resources ?? [];
  const namespace = findProbeResource(
    probe,
    'Namespace',
    DEV_TEMPORAL_NAMESPACE,
  );
  const secret = findProbeResource(probe, 'Secret', DEV_TEMPORAL_SECRET);
  const pvc = findProbeResource(
    probe,
    'PersistentVolumeClaim',
    DEV_TEMPORAL_PVC,
  );
  const job = findProbeResource(probe, 'Job', DEV_TEMPORAL_SCHEMA_JOB);
  const postgres = findProbeResource(probe, 'Deployment', 'temporal-postgres');
  const server = findProbeResource(probe, 'Deployment', 'temporal-server');
  const postgresService = findProbeResource(
    probe,
    'Service',
    'temporal-postgres',
  );
  const serverService = findProbeResource(probe, 'Service', 'temporal-server');
  const scripts = findProbeResource(
    probe,
    'ConfigMap',
    DEV_TEMPORAL_SCRIPTS_CONFIGMAP,
  );
  const dynamic = findProbeResource(
    probe,
    'ConfigMap',
    DEV_TEMPORAL_DYNAMIC_CONFIGMAP,
  );
  for (const [resource, id] of [
    [namespace, 'foreign-namespace'],
    [secret, 'foreign-secret'],
    [pvc, 'foreign-pvc'],
    [job, 'foreign-job'],
    [postgres, 'foreign-postgres'],
    [server, 'foreign-server'],
    [postgresService, 'foreign-postgres-service'],
    [serverService, 'foreign-server-service'],
    [scripts, 'foreign-scripts'],
    [dynamic, 'foreign-dynamic'],
  ]) {
    if (classify(resource) === 'foreign') {
      refusals.push({ id, detail: 'existing resource has no dev ownership' });
    }
  }
  for (const service of [postgresService, serverService]) {
    if (
      classify(service) === 'owned' &&
      service.serviceType &&
      service.serviceType !== 'ClusterIP'
    ) {
      refusals.push({
        id: 'service-type-mismatch',
        detail: `${service.name} type is ${service.serviceType}`,
      });
    }
  }
  if (
    classify(job) === 'owned' &&
    job.succeeded !== true &&
    job.failed === true
  ) {
    refusals.push({
      id: 'schema-job-failed',
      detail: 'the existing schema Job failed and will not be deleted',
    });
  }
  if (
    classify(server) === 'owned' &&
    server.image &&
    server.image !== DEV_TEMPORAL_SERVER_IMAGE
  ) {
    refusals.push({
      id: 'image-mismatch',
      detail: `server image is ${server.image}`,
    });
  }
  if (
    classify(postgres) === 'owned' &&
    postgres.image &&
    postgres.image !== DEV_TEMPORAL_POSTGRES_IMAGE
  ) {
    refusals.push({
      id: 'postgres-image-mismatch',
      detail: `postgres image is ${postgres.image}`,
    });
  }
  if (
    resources.some(
      (item) =>
        item.namespace === RELEASE_TEMPORAL_NAMESPACE ||
        item.name === RELEASE_TEMPORAL_NAMESPACE,
    )
  ) {
    refusals.push({
      id: 'release-resource-in-probe',
      detail: 'release Temporal resource was included in the dev probe',
    });
  }
  return {
    refusals,
    namespace: classify(namespace),
    secret: classify(secret),
    pvc: classify(pvc),
    schemaJob: classify(job),
    schemaSucceeded: classify(job) === 'owned' && job.succeeded === true,
    postgres: classify(postgres),
    server: classify(server),
    scripts: classify(scripts),
    dynamic: classify(dynamic),
  };
}

/**
 * @param {object} probe
 */
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

/**
 * @param {object} probe
 */
export function statusDevTemporal(probe) {
  return {
    mode: 'status',
    readOnly: true,
    ...assessDevTemporal(probe),
    actions: [],
  };
}

/**
 * @param {object} probe
 * @param {{ authorize?: boolean, failAfterSecret?: boolean }} [options]
 */
export function ensureDevTemporal(probe, options = {}) {
  const plan = planDevTemporal(probe);
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
          detail: 'live Temporal ensure was not authorized',
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
  const policy = decideTemporalBootstrap(probeToBootstrapInput(probe));
  if (!policy.ok) {
    return {
      ...plan,
      mode: 'ensure',
      readOnly: false,
      ok: false,
      mutated: false,
      manifest: undefined,
      refusals: policy.refusals,
      actions: presentDevEnsureActions(policy.actions),
    };
  }
  const actions = presentDevEnsureActions(policy.actions);
  if (options.failAfterSecret) {
    const prefix = actions.filter(
      (action) =>
        action.op === 'ensure-namespace' || action.op === 'create-secret',
    );
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
          detail:
            'postgres and schema were not applied; the secret was not deleted',
        },
      ],
      actions: prefix,
    };
  }
  return {
    ...plan,
    mode: 'ensure',
    readOnly: false,
    ok: true,
    mutated: true,
    manifest: undefined,
    actions,
    refusals: policy.refusals,
  };
}

/**
 * @param {import('./schema-policy.mjs').TemporalBootstrapInput} input
 */
export function planDevTemporalPolicy(input) {
  const decision = decideTemporalBootstrap(input);
  return {
    ...decision,
    actions: presentDevEnsureActions(decision.actions),
  };
}

/**
 * @param {{
 *   postgresReady?: string | number,
 *   schemaSucceeded?: string | number,
 *   schemaFailed?: string | number,
 *   serverReady?: string | number,
 *   jobAbsent?: boolean,
 *   legacySchemaReady?: boolean,
 * }} sample
 */
export function temporalReadinessMet(sample) {
  if (Number(sample.schemaFailed ?? 0) > 0) return false;
  if (Number(sample.postgresReady ?? 0) < 1) return false;
  if (Number(sample.serverReady ?? 0) < 1) return false;
  if (
    Number(sample.schemaSucceeded ?? 0) >= 1 ||
    sample.schemaSucceeded === '1'
  ) {
    return true;
  }
  if (sample.jobAbsent === true && sample.legacySchemaReady === true) {
    return true;
  }
  return false;
}

/**
 * @param {object} deps
 */
function kubectlSample(deps, args) {
  return (
    deps
      .run('kubectl', [
        '--context',
        DEV_TEMPORAL_CONTEXT,
        '-n',
        DEV_TEMPORAL_NAMESPACE,
        ...args,
      ])
      .stdout?.trim() ?? ''
  );
}

/**
 * @param {object} deps
 */
export function waitForDevTemporalSchema(deps) {
  const sleep = deps.sleep ?? (() => {});
  const now = deps.now ?? Date.now;
  const deadline = now() + (deps.readinessTimeoutMs ?? 360000);
  let postgresReady = '';
  let schemaSucceeded = '';
  let schemaFailed = '';
  while (now() <= deadline) {
    postgresReady = kubectlSample(deps, [
      'get',
      'deploy',
      'temporal-postgres',
      '-o',
      'jsonpath={.status.availableReplicas}',
    ]);
    schemaSucceeded = kubectlSample(deps, [
      'get',
      'job',
      DEV_TEMPORAL_SCHEMA_JOB,
      '-o',
      'jsonpath={.status.succeeded}',
    ]);
    schemaFailed = kubectlSample(deps, [
      'get',
      'job',
      DEV_TEMPORAL_SCHEMA_JOB,
      '-o',
      'jsonpath={.status.failed}',
    ]);
    if (Number(postgresReady) >= 1 && schemaSucceeded === '1') {
      return { ok: true, postgresReady, schemaSucceeded, schemaFailed };
    }
    if (Number(schemaFailed) > 0) {
      return { ok: false, postgresReady, schemaSucceeded, schemaFailed };
    }
    if (!deps.sleep || now() >= deadline) break;
    sleep(5000);
  }
  return { ok: false, postgresReady, schemaSucceeded, schemaFailed };
}

/**
 * @param {object} deps
 */
export function waitForDevTemporalServer(deps) {
  const sleep = deps.sleep ?? (() => {});
  const now = deps.now ?? Date.now;
  const deadline = now() + (deps.readinessTimeoutMs ?? 360000);
  let availableReplicas = '';
  while (now() <= deadline) {
    availableReplicas = kubectlSample(deps, [
      'get',
      'deploy',
      'temporal-server',
      '-o',
      'jsonpath={.status.availableReplicas}',
    ]);
    if (Number(availableReplicas) >= 1) return { ok: true, availableReplicas };
    if (!deps.sleep || now() >= deadline) break;
    sleep(5000);
  }
  return { ok: false, availableReplicas };
}

/**
 * @param {'namespace' | 'postgres' | 'schema' | 'server'} section
 */
function renderDevSection(section) {
  return renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'temporal', profile: 'dev', section },
      { chartRoot },
    ),
  );
}

/**
 * @param {object} deps
 * @param {object[]} actions
 * @param {object[]} completed
 */
function runDevTemporalActions(deps, actions, completed) {
  const mutating = new Set([
    'ensure-namespace',
    'create-secret',
    'apply-postgres',
    'create-schema-job',
    'apply-server',
  ]);
  for (const action of actions) {
    if (
      action.op === 'reuse-secret' ||
      action.op === 'reuse-schema-job' ||
      action.op === 'reuse-server' ||
      action.op === 'reuse-existing-schema'
    ) {
      completed.push(action);
      continue;
    }
    if (action.op === 'wait-postgres-ready') {
      const replicas = kubectlSample(deps, [
        'get',
        'deploy',
        'temporal-postgres',
        '-o',
        'jsonpath={.status.availableReplicas}',
      ]);
      completed.push({ op: action.op, availableReplicas: replicas });
      if (Number(replicas) < 1) {
        return {
          ok: false,
          mutated: completed.some((item) => mutating.has(item.op)),
          refusals: [
            {
              id: 'postgres-not-ready',
              detail: 'PostgreSQL did not become ready',
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'wait-authenticated-sql') {
      completed.push(action);
      continue;
    }
    if (
      action.op === 'wait-schema-job' ||
      action.op === 'verify-schema' ||
      action.op === 'verify-schema-tables'
    ) {
      const checked = waitForDevTemporalSchema(deps);
      const receiptOp =
        action.op === 'wait-schema-job' ? 'wait-schema-job' : 'verify-schema';
      completed.push({
        op: receiptOp,
        context: DEV_TEMPORAL_CONTEXT,
        postgresReady: checked.postgresReady,
        schemaSucceeded: checked.schemaSucceeded,
      });
      if (!checked.ok) {
        return {
          ok: false,
          mutated: completed.some((item) => mutating.has(item.op)),
          refusals: [
            {
              id: 'schema-not-ready',
              detail:
                'PostgreSQL or the schema Job is not ready; the server was not applied and the Job was not deleted',
            },
          ],
          actions: completed,
        };
      }
      continue;
    }
    if (action.op === 'create-secret') {
      const password =
        deps.generatePassword?.() ?? randomBytes(24).toString('hex');
      if (!password) {
        return {
          ok: false,
          mutated: false,
          refusals: [
            {
              id: 'credential-generation-failed',
              detail: 'database password was not generated',
            },
          ],
          actions: completed,
        };
      }
      const manifest = `apiVersion: v1\nkind: Secret\nmetadata:\n  name: ${DEV_TEMPORAL_SECRET}\n  namespace: ${DEV_TEMPORAL_NAMESPACE}\n  labels:\n    ${OWNER_LABEL}: ${DEV_TEMPORAL_OWNER}\ntype: Opaque\nstringData:\n  password: ${password}\n`;
      const created = deps.run(
        'kubectl',
        ['--context', DEV_TEMPORAL_CONTEXT, 'create', '-f', '-'],
        { input: manifest },
      );
      completed.push({ op: 'create-secret', name: DEV_TEMPORAL_SECRET });
      if (!created.ok) {
        if (created.stderr?.includes('AlreadyExists')) {
          const retry = ensureDevTemporal(deps.collect(), { authorize: true });
          if (!retry.ok) return { ...retry, mutated: true, actions: completed };
          return runDevTemporalActions(
            deps,
            retry.actions.filter(
              (item) => !completed.some((done) => done.op === item.op),
            ),
            completed,
          );
        }
        return {
          ok: false,
          mutated: true,
          refusals: [
            { id: 'create-secret-failed', detail: 'secret create failed' },
          ],
          actions: completed,
        };
      }
      continue;
    }
    const sectionByOp = {
      'ensure-namespace': 'namespace',
      'apply-postgres': 'postgres',
      'create-schema-job': 'schema',
      'apply-server': 'server',
    };
    const section = sectionByOp[action.op];
    if (!section) {
      completed.push(action);
      continue;
    }
    const verb = action.op === 'create-schema-job' ? 'create' : 'apply';
    const manifest = renderDevSection(section);
    const applied = deps.run(
      'kubectl',
      ['--context', DEV_TEMPORAL_CONTEXT, verb, '-f', '-'],
      { input: manifest },
    );
    completed.push({ op: action.op, context: DEV_TEMPORAL_CONTEXT });
    if (!applied.ok) {
      return {
        ok: false,
        mutated: true,
        refusals: [
          {
            id: `${action.op}-failed`,
            detail: 'owned secret and PVC were not deleted',
          },
        ],
        actions: completed,
      };
    }
    if (action.op === 'apply-server') {
      const server = waitForDevTemporalServer(deps);
      completed.push({
        op: 'verify-server',
        context: DEV_TEMPORAL_CONTEXT,
        availableReplicas: server.availableReplicas,
      });
      if (!server.ok) {
        return {
          ok: false,
          mutated: true,
          refusals: [
            {
              id: 'server-not-ready',
              detail:
                'Temporal server did not become available; owned data was not deleted',
            },
          ],
          actions: completed,
        };
      }
    }
  }
  return { ok: true, actions: completed };
}

/**
 * @param {object} deps
 */
export function executeAuthorizedDevTemporal(deps) {
  const decision = ensureDevTemporal(deps.collect(), { authorize: true });
  if (!decision.ok && decision.actions.length === 0)
    return { ...decision, mutated: false };
  const again = ensureDevTemporal(deps.collect(), { authorize: true });
  if (!again.ok && again.actions.length === 0)
    return { ...again, mutated: false };
  /** @type {object[]} */
  const completed = [];
  const outcome = runDevTemporalActions(
    deps,
    decideTemporalBootstrap(probeToBootstrapInput(deps.collect())).actions,
    completed,
  );
  const mutating = new Set([
    'ensure-namespace',
    'create-secret',
    'apply-postgres',
    'create-schema-job',
    'apply-server',
  ]);
  return {
    ...again,
    ok: outcome.ok === true,
    mutated: completed.some((item) => mutating.has(item.op)),
    actions: presentDevEnsureActions(outcome.actions ?? completed),
    refusals: outcome.refusals ?? again.refusals,
  };
}

/** Platform successor mapping for removed flat manifests. */
export const TEMPORAL_LEGACY_YAML_SUCCESSORS = {
  'namespace.yaml': 'chart templates namespace section',
  'postgres.yaml': 'chart templates postgres section',
  'schema-job.yaml': 'chart templates schema section',
  'server.yaml': 'chart templates server section',
  'admin.yaml': 'chart templates admin section (release only)',
  'namespace-job.yaml': 'chart templates namespace-job section (release only)',
};
