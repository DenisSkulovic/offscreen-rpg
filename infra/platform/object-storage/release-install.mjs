#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
} from '../common/commands.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  assessObjectStoreProbe,
  DEV_S3_IMAGE,
  DEV_S3_PVC,
  DEV_S3_SECRET,
  renderWorkloadsYaml,
  waitForObjectStoreReadiness,
} from './dev-bootstrap.mjs';

const releaseProfile = readPlatformProfile('release');
export const RELEASE_S3_CONTEXT = releaseProfile.contextName;
export const RELEASE_S3_NAMESPACE = releaseProfile.namespaces.objectStorage;
export const RELEASE_S3_STORAGE_CLASS = releaseProfile.storageClass;
export const RELEASE_S3_OWNER = releaseProfile.ownerValue;
const RELEASE_OWNER_LABEL = `${releaseProfile.ownerLabel}/lab`;

function releaseSecretManifest(credentials) {
  return JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: DEV_S3_SECRET,
      namespace: RELEASE_S3_NAMESPACE,
      labels: { [RELEASE_OWNER_LABEL]: RELEASE_S3_OWNER },
    },
    type: 'Opaque',
    stringData: {
      'access-key-id': credentials.accessKeyId,
      'secret-access-key': credentials.secretAccessKey,
    },
  });
}

function releaseNamespaceManifest(deps = {}) {
  return renderPlatformYaml(
    renderPlatformDocuments(
      { service: 'object-storage', profile: 'release', section: 'namespace' },
      deps,
    ),
  );
}

function parseRenderedDocs(yaml) {
  return yaml
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== '---')
    .map((line) => JSON.parse(line));
}

/**
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function collectReleaseObjectStorageProbe(deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  /** @type {{ kind: string, name: string, reason: string }[]} */
  const unreadables = [];
  /** @type {object[]} */
  const resources = [];

  const reads = [
    {
      profileId: 'release',
      resource: 'namespace',
      name: RELEASE_S3_NAMESPACE,
      kind: 'Namespace',
    },
    {
      profileId: 'release',
      resource: 'secret',
      name: DEV_S3_SECRET,
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'Secret',
    },
    {
      profileId: 'release',
      resource: 'pvc',
      name: DEV_S3_PVC,
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'PersistentVolumeClaim',
    },
    {
      profileId: 'release',
      resource: 'deployment',
      name: 'object-store',
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'Deployment',
    },
    {
      profileId: 'release',
      resource: 'service',
      name: 'object-store',
      namespace: RELEASE_S3_NAMESPACE,
      kind: 'Service',
    },
  ];

  for (const spec of reads) {
    const result = readPlatformObject(spec, { run });
    if (result.state === 'unreadable') {
      unreadables.push({
        kind: spec.kind,
        name: spec.name,
        reason: result.reason,
      });
      continue;
    }
    if (result.state === 'absent') continue;
    const object = result.object;
    resources.push({
      kind: spec.kind,
      name: spec.name,
      namespace: object.metadata?.namespace,
      owner: object.metadata?.labels?.[RELEASE_OWNER_LABEL] ?? null,
      uid: object.metadata?.uid ?? null,
      image: object.spec?.template?.spec?.containers?.[0]?.image,
      serviceType: object.spec?.type,
      storageClass: object.spec?.storageClassName,
    });
  }

  const storage = run('kubectl', [
    '--context',
    RELEASE_S3_CONTEXT,
    'get',
    'storageclass',
    RELEASE_S3_STORAGE_CLASS,
    '-o',
    'jsonpath={.metadata.name}',
  ]);

  return {
    context: RELEASE_S3_CONTEXT,
    clusterName: releaseProfile.clusterName,
    baselineOwner: RELEASE_S3_OWNER,
    storageClass: storage.ok ? (storage.stdout ?? '').trim() : null,
    unreadables,
    resources,
  };
}

/**
 * @param {object} probe
 */
export function planReleaseObjectStorageInstall(probe) {
  const assessment = assessObjectStoreProbe(probe, 'release');
  return {
    mode: 'plan',
    readOnly: true,
    context: RELEASE_S3_CONTEXT,
    namespace: RELEASE_S3_NAMESPACE,
    image: DEV_S3_IMAGE,
    storageClass: RELEASE_S3_STORAGE_CLASS,
    secretState: assessment.secret,
    refusals: assessment.refusals,
    actions: [],
  };
}

/**
 * @param {object} probe
 */
export function ensureReleaseObjectStorageInstall(probe) {
  const plan = planReleaseObjectStorageInstall(probe);
  if (plan.refusals.length > 0) {
    return { ...plan, ok: false, mutated: false, actions: [] };
  }
  const assessment = assessObjectStoreProbe(probe, 'release');
  const complete =
    assessment.namespace === 'owned' &&
    assessment.secret === 'owned' &&
    assessment.pvc === 'owned' &&
    assessment.deployment === 'owned' &&
    assessment.service === 'owned';
  if (complete) {
    return {
      ...plan,
      ok: true,
      mutated: false,
      actions: [
        { op: 'reuse-secret' },
        { op: 'verify-readiness', context: RELEASE_S3_CONTEXT },
      ],
    };
  }
  /** @type {{ op: string, context?: string, [key: string]: unknown }[]} */
  const actions = [];
  if (assessment.namespace !== 'owned') {
    actions.push({
      op: 'ensure-namespace',
      context: RELEASE_S3_CONTEXT,
      name: RELEASE_S3_NAMESPACE,
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
      context: RELEASE_S3_CONTEXT,
      namespace: RELEASE_S3_NAMESPACE,
      name: DEV_S3_SECRET,
    });
  }
  actions.push({
    op: 'apply-workloads',
    context: RELEASE_S3_CONTEXT,
    assessment,
  });
  actions.push({ op: 'verify-readiness', context: RELEASE_S3_CONTEXT });
  return { ...plan, ok: true, mutated: true, actions };
}

/**
 * @param {{
 *   collect?: () => object,
 *   run?: (command: string, args: string[], options?: { input?: string }) => { ok: boolean, stdout?: string, stderr?: string },
 *   generateCredentials?: () => { accessKeyId: string, secretAccessKey: string },
 *   renderDeps?: { run?: typeof runPlatformCommand },
 * }} [deps]
 */
export function executeReleaseObjectStorageInstall(deps = {}) {
  const collect =
    deps.collect ?? (() => collectReleaseObjectStorageProbe(deps));
  const run = deps.run ?? runPlatformCommand;
  const renderDeps = deps.renderDeps ?? { run: runPlatformCommand };
  const decision = ensureReleaseObjectStorageInstall(collect());
  if (!decision.ok && decision.actions.length === 0) {
    return { ...decision, mutated: false };
  }
  const again = ensureReleaseObjectStorageInstall(collect());
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
      const created = run(
        'kubectl',
        ['--context', RELEASE_S3_CONTEXT, 'apply', '-f', '-'],
        { input: releaseNamespaceManifest(renderDeps) },
      );
      completed.push({ op: 'ensure-namespace', context: RELEASE_S3_CONTEXT });
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
    if (action.op === 'create-secret') {
      const credentials = deps.generateCredentials?.() ?? {
        accessKeyId: randomBytes(12).toString('hex'),
        secretAccessKey: randomBytes(24).toString('hex'),
      };
      const created = run(
        'kubectl',
        [
          '--context',
          RELEASE_S3_CONTEXT,
          '-n',
          RELEASE_S3_NAMESPACE,
          'create',
          '-f',
          '-',
        ],
        { input: releaseSecretManifest(credentials) },
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
    if (action.op === 'apply-workloads') {
      const assessment =
        /** @type {{pvc:string, deployment:string, service:string}} */ (
          action.assessment
        );
      const docs = parseRenderedDocs(
        renderWorkloadsYaml('release', renderDeps),
      );
      for (const doc of docs) {
        const kind = doc.kind;
        const state =
          kind === 'PersistentVolumeClaim'
            ? assessment.pvc
            : kind === 'Deployment'
              ? assessment.deployment
              : kind === 'Service'
                ? assessment.service
                : 'absent';
        if (state !== 'absent') continue;
        const applied = run(
          'kubectl',
          ['--context', RELEASE_S3_CONTEXT, 'apply', '-f', '-'],
          { input: `${JSON.stringify(doc)}\n` },
        );
        completed.push({
          op: 'apply-workloads',
          context: RELEASE_S3_CONTEXT,
          kind,
        });
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
      continue;
    }
    if (action.op === 'verify-readiness') {
      const ready = waitForObjectStoreReadiness({
        run,
        context: RELEASE_S3_CONTEXT,
        namespace: RELEASE_S3_NAMESPACE,
        pvcName: DEV_S3_PVC,
        readinessTimeoutMs: deps.readinessTimeoutMs ?? 360000,
        sleep: deps.sleep ?? (() => {}),
        now: deps.now ?? Date.now,
      });
      completed.push({
        op: 'verify-readiness',
        context: RELEASE_S3_CONTEXT,
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

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  assertPlatformTarget('release');
  const result = executeReleaseObjectStorageInstall();
  process.stdout.write(
    `${JSON.stringify({ ...result, actions: result.actions })}\n`,
  );
  process.exitCode = result.ok ? 0 : 1;
}
