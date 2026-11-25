import {
  assertPlatformTarget,
  readPlatformObject,
  runPlatformCommand,
  PLATFORM_COMMAND_TIMEOUT_MS,
} from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';
import {
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../common/render.mjs';
import {
  classifyRedisObject,
  observeRedis,
  planRedisInstall,
} from './observations.mjs';
import { assessRedisReadyState, serviceShapeCompatible } from './readiness.mjs';

export const REDIS_CONFIGMAP_NAME = 'redis-config';
export const REDIS_DEPLOYMENT_NAME = 'redis';
export const REDIS_SERVICE_NAME = 'redis';
export { REDIS_CONFIG_HASH_ANNOTATION } from './readiness.mjs';
const ROLLOUT_TIMEOUT_MS = 180_000;
const CHILD_ORDER = [
  { key: 'configMap', kind: 'configmap', plural: 'ConfigMap' },
  { key: 'deployment', kind: 'deployment', plural: 'Deployment' },
  { key: 'service', kind: 'service', plural: 'Service' },
];

const AUTH_MATERIAL_PATTERN =
  /requirepass|REDIS_PASSWORD|password:|aclfile|^\s*user\s|tls-|tls-port/i;

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @param {'dev' | 'release'} profileId
 */
function redisNamespaceForProfile(profileId) {
  const profile = readPlatformProfile(profileId);
  if (profileId === 'release') {
    return 'lab-a';
  }
  const namespace = profile.namespaces.redis;
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new Error(
      `redis namespace is not configured for profile ${profileId}`,
    );
  }
  return namespace;
}

/**
 * @param {'dev' | 'release'} profileId
 */
function ownerLabelKey(profileId) {
  const profile = readPlatformProfile(profileId);
  return profileId === 'dev'
    ? `${profile.ownerLabel}/owner`
    : `${profile.ownerLabel}/lab`;
}

/**
 * @param {string} text
 */
export function manifestHasAuthMaterial(text) {
  return AUTH_MATERIAL_PATTERN.test(text);
}

/**
 * @param {object[]} docs
 * @param {'dev' | 'release'} profileId
 */
export function validateRenderedRedisDocs(docs, profileId) {
  const profile = readPlatformProfile(profileId);
  const namespace = redisNamespaceForProfile(profileId);
  const ownerKey = ownerLabelKey(profileId);
  if (!Array.isArray(docs) || docs.length !== 3) {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'redis render must produce exactly three documents',
      },
    };
  }
  const byKind = Object.fromEntries(docs.map((doc) => [doc.kind, doc]));
  const configMap = byKind.ConfigMap;
  const deployment = byKind.Deployment;
  const service = byKind.Service;
  if (!configMap || !deployment || !service) {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'redis render must include ConfigMap, Deployment, and Service',
      },
    };
  }
  if (configMap.metadata?.name !== REDIS_CONFIGMAP_NAME) {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'unexpected redis ConfigMap name',
      },
    };
  }
  if (deployment.metadata?.name !== REDIS_DEPLOYMENT_NAME) {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'unexpected redis Deployment name',
      },
    };
  }
  if (service.metadata?.name !== REDIS_SERVICE_NAME) {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'unexpected redis Service name',
      },
    };
  }
  for (const doc of docs) {
    if (doc.metadata?.namespace !== namespace) {
      return {
        ok: false,
        refusal: {
          id: 'render-invalid',
          detail: `rendered namespace ${doc.metadata?.namespace ?? 'missing'} does not match ${namespace}`,
        },
      };
    }
    const owner = doc.metadata?.labels?.[ownerKey];
    if (owner !== profile.ownerValue) {
      return {
        ok: false,
        refusal: {
          id: 'render-foreign',
          detail: `rendered ${doc.kind} has foreign owner label`,
        },
      };
    }
  }
  if (service.spec?.type !== 'ClusterIP') {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'rendered redis Service must be ClusterIP',
      },
    };
  }
  if (deployment.spec?.replicas !== 1) {
    return {
      ok: false,
      refusal: {
        id: 'render-invalid',
        detail: 'rendered redis Deployment must be a singleton',
      },
    };
  }
  return { ok: true, configMap, deployment, service };
}

/**
 * @param {ReturnType<typeof observeRedis>} before
 * @param {ReturnType<typeof observeRedis>} after
 */
export function observationsUnchanged(before, after) {
  for (const key of ['namespace', 'configMap', 'deployment', 'service']) {
    const left = before[key];
    const right = after[key];
    if (!left || !right || left.state !== right.state) {
      return false;
    }
    if (left.state === 'present') {
      const lobj = left.object;
      const robj = right.object;
      if (lobj?.metadata?.uid !== robj?.metadata?.uid) {
        return false;
      }
      if (lobj?.metadata?.resourceVersion !== robj?.metadata?.resourceVersion) {
        return false;
      }
      if (left.classification !== right.classification) {
        return false;
      }
    }
  }
  return true;
}

/**
 * @param {import('../common/commands.mjs').runPlatformCommand extends (...args: infer A) => infer R ? (...args: A) => R : never} result
 */
export function parseCreatedUid(result) {
  if (!result.stdout?.trim()) {
    return null;
  }
  try {
    const object = JSON.parse(result.stdout);
    const uid = object?.metadata?.uid;
    return typeof uid === 'string' && uid.length > 0 ? uid : null;
  } catch {
    return null;
  }
}

export {
  assessRedisReadyState,
  deploymentRolloutReady,
  observeRedisReady,
  redisConfigSha256,
  serviceShapeCompatible,
} from './readiness.mjs';

/**
 * @param {ReturnType<typeof observeRedis>} observations
 * @param {object} desiredDeployment
 * @param {object} desiredService
 */
function validatePresentChildren(
  observations,
  desiredDeployment,
  desiredService,
) {
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];
  if (
    observations.configMap?.state === 'present' &&
    observations.configMap.object?.immutable === true
  ) {
    refusals.push({
      id: 'configmap-immutable',
      detail: 'existing redis ConfigMap is immutable',
    });
  }
  if (observations.deployment?.state === 'present') {
    const liveSelector = observations.deployment.object?.spec?.selector;
    const desiredSelector = desiredDeployment.spec?.selector;
    if (!deepEqual(liveSelector, desiredSelector)) {
      refusals.push({
        id: 'incompatible-selector',
        detail:
          'existing redis Deployment selector does not match rendered selector',
      });
    }
  }
  if (observations.service?.state === 'present') {
    if (!serviceShapeCompatible(observations.service.object?.spec)) {
      refusals.push({
        id: 'incompatible-service',
        detail: 'existing redis Service shape is not compatible',
      });
    }
  }
  for (const key of ['configMap', 'deployment', 'service']) {
    const item = observations[key];
    if (item?.state !== 'present') {
      continue;
    }
    const uid = item.object?.metadata?.uid;
    const rv = item.object?.metadata?.resourceVersion;
    if (typeof uid !== 'string' || uid.length === 0) {
      refusals.push({
        id: `${key}-missing-uid`,
        detail: `${key} is present but metadata.uid is missing`,
      });
    }
    if (typeof rv !== 'string' || rv.length === 0) {
      refusals.push({
        id: `${key}-missing-resource-version`,
        detail: `${key} is present but metadata.resourceVersion is missing`,
      });
    }
  }
  return refusals;
}

/**
 * @param {string} uid
 * @param {string} resourceVersion
 * @param {import('json-patch').Operation[]} ops
 */
function buildCasPatch(uid, resourceVersion, ops) {
  return [
    { op: 'test', path: '/metadata/uid', value: uid },
    { op: 'test', path: '/metadata/resourceVersion', value: resourceVersion },
    ...ops,
  ];
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {string} context
 * @param {string} namespace
 * @param {string} kind
 * @param {string} name
 * @param {unknown[]} patch
 * @param {typeof runPlatformCommand} run
 */
function kubectlJsonPatch(
  profileId,
  context,
  namespace,
  kind,
  name,
  patch,
  run,
) {
  return run(
    'kubectl',
    [
      '--context',
      context,
      '-n',
      namespace,
      'patch',
      kind,
      name,
      '--type=json',
      '-p',
      JSON.stringify(patch),
    ],
    { timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS },
  );
}

/**
 * @param {import('../common/commands.mjs').runPlatformCommand extends (...args: infer A) => infer R ? (...args: A) => R : never} result
 */
function isAlreadyExists(result) {
  const text = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
  return text.includes('AlreadyExists');
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {ReturnType<typeof observeRedis>} observations
 * @param {{ run?: typeof runPlatformCommand, renderDeps?: { run?: typeof runPlatformCommand, chartRoot?: string }, observe?: typeof observeRedis }} deps
 */
export function reconcileRedis(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const renderDeps = deps.renderDeps ?? { run };
  const observe =
    deps.observe ?? ((options) => observeRedis(profileId, options));

  assertPlatformTarget(profileId, { run });
  const observations = observe({ run });
  const plan = planRedisInstall(profileId, observations);
  if (!plan.ok) {
    return { ...plan, mutated: false, actions: [] };
  }

  let docs;
  try {
    docs = renderPlatformDocuments(
      { service: 'redis', profile: profileId, section: 'all' },
      renderDeps,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...plan,
      ok: false,
      mutated: false,
      actions: [],
      refusals: [{ id: 'render-failed', detail: message }],
    };
  }

  const validation = validateRenderedRedisDocs(docs, profileId);
  if (!validation.ok) {
    return {
      ...plan,
      ok: false,
      mutated: false,
      actions: [],
      refusals: [validation.refusal],
    };
  }

  const manifest = renderPlatformYaml(docs);
  if (manifestHasAuthMaterial(manifest)) {
    return {
      ...plan,
      ok: false,
      mutated: false,
      refusals: [
        {
          id: 'auth-material',
          detail: 'refusing redis manifest with authentication material',
        },
      ],
      actions: [],
    };
  }

  const freshObservations = observe({ run });
  if (!observationsUnchanged(observations, freshObservations)) {
    return {
      ...plan,
      ok: false,
      mutated: false,
      actions: [],
      refusals: [
        {
          id: 'stale-observation',
          detail: 'redis observations changed before write',
        },
      ],
    };
  }

  const profile = readPlatformProfile(profileId);
  const namespaceName = redisNamespaceForProfile(profileId);
  const ownerKey = ownerLabelKey(profileId);
  const desired = {
    configMap: validation.configMap,
    deployment: validation.deployment,
    service: validation.service,
  };

  const presentRefusals = validatePresentChildren(
    freshObservations,
    desired.deployment,
    desired.service,
  );
  if (presentRefusals.length > 0) {
    return {
      ...plan,
      ok: false,
      mutated: false,
      actions: [],
      refusals: presentRefusals,
    };
  }

  /** @type {{ op: string, detail?: string, patch?: unknown[] }[]} */
  const actions = [];

  let namespaceUid =
    freshObservations.namespace.state === 'present'
      ? (freshObservations.namespace.object?.metadata?.uid ?? null)
      : null;

  if (plan.actions.some((action) => action.op === 'ensure-namespace')) {
    if (freshObservations.namespace.state === 'absent') {
      const namespaceDoc = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: namespaceName,
          labels: { [ownerKey]: profile.ownerValue },
        },
      };
      const created = run(
        'kubectl',
        ['--context', profile.contextName, 'create', '-f', '-', '-o', 'json'],
        {
          input: `${JSON.stringify(namespaceDoc)}\n`,
          timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS,
        },
      );
      actions.push({ op: 'ensure-namespace' });
      if (!created.ok) {
        return {
          ...plan,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: 'ensure-namespace-failed',
              detail: isAlreadyExists(created)
                ? 'namespace already exists'
                : 'namespace create failed',
            },
          ],
          actions,
        };
      }
      namespaceUid = parseCreatedUid(created);
      if (!namespaceUid) {
        return {
          ...plan,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: 'ensure-namespace-failed',
              detail: 'namespace create did not return uid',
            },
          ],
          actions,
        };
      }
    } else {
      actions.push({ op: 'reuse-namespace' });
      namespaceUid =
        freshObservations.namespace.object?.metadata?.uid ?? namespaceUid;
    }
  }

  /**
   * @param {string | null} expectedUid
   */
  function verifyNamespaceFence(expectedUid) {
    const current = readPlatformObject(
      { profileId, resource: 'namespace', name: namespaceName },
      { run },
    );
    if (current.state !== 'present' || !current.object) {
      return {
        ok: false,
        refusal: {
          id: 'namespace-identity-changed',
          detail: 'redis namespace disappeared before child write',
        },
      };
    }
    if (classifyRedisObject(profileId, current.object) !== 'owned') {
      return {
        ok: false,
        refusal: {
          id: 'namespace-identity-changed',
          detail: 'redis namespace ownership changed before child write',
        },
      };
    }
    const uid = current.object.metadata?.uid;
    if (expectedUid != null && uid !== expectedUid) {
      return {
        ok: false,
        refusal: {
          id: 'namespace-identity-changed',
          detail: 'redis namespace uid changed before child write',
        },
      };
    }
    return { ok: true, uid };
  }

  const fences = {
    configMap:
      freshObservations.configMap.state === 'present'
        ? {
            uid: freshObservations.configMap.object.metadata.uid,
            rv: freshObservations.configMap.object.metadata.resourceVersion,
          }
        : null,
    deployment:
      freshObservations.deployment.state === 'present'
        ? {
            uid: freshObservations.deployment.object.metadata.uid,
            rv: freshObservations.deployment.object.metadata.resourceVersion,
          }
        : null,
    service:
      freshObservations.service.state === 'present'
        ? {
            uid: freshObservations.service.object.metadata.uid,
            rv: freshObservations.service.object.metadata.resourceVersion,
          }
        : null,
  };

  for (const step of CHILD_ORDER) {
    const namespaceFence = verifyNamespaceFence(namespaceUid);
    if (!namespaceFence.ok) {
      return {
        ...plan,
        ok: false,
        mutated: true,
        refusals: [namespaceFence.refusal],
        actions,
      };
    }

    const childState = freshObservations[step.key];
    const renderedDoc = desired[step.key];
    const opName = `ensure-${step.key}`;

    if (childState.state === 'absent') {
      const created = run(
        'kubectl',
        [
          '--context',
          profile.contextName,
          '-n',
          namespaceName,
          'create',
          '-f',
          '-',
        ],
        {
          input: `${JSON.stringify(renderedDoc)}\n`,
          timeoutMs: PLATFORM_COMMAND_TIMEOUT_MS,
        },
      );
      actions.push({ op: opName });
      if (!created.ok) {
        return {
          ...plan,
          ok: false,
          mutated: true,
          refusals: [
            {
              id: isAlreadyExists(created)
                ? 'child-already-exists'
                : `${step.key}-create-failed`,
              detail: isAlreadyExists(created)
                ? `${step.key} already exists`
                : `${step.key} create failed`,
            },
          ],
          actions,
        };
      }
      continue;
    }

    if (step.key === 'service') {
      actions.push({ op: 'reuse-service' });
      continue;
    }

    const fence = fences[step.key];
    if (!fence) {
      return {
        ...plan,
        ok: false,
        mutated: true,
        refusals: [
          {
            id: `${step.key}-missing-fence`,
            detail: `${step.key} fence is missing`,
          },
        ],
        actions,
      };
    }

    /** @type {unknown[]} */
    let patchOps;
    if (step.key === 'configMap') {
      patchOps = [{ op: 'add', path: '/data', value: renderedDoc.data }];
    } else {
      patchOps = [{ op: 'add', path: '/spec', value: renderedDoc.spec }];
    }
    const patch = buildCasPatch(fence.uid, fence.rv, patchOps);
    const patched = kubectlJsonPatch(
      profileId,
      profile.contextName,
      namespaceName,
      step.kind,
      renderedDoc.metadata.name,
      patch,
      run,
    );
    actions.push({ op: opName, patch });
    if (!patched.ok) {
      return {
        ...plan,
        ok: false,
        mutated: true,
        refusals: [
          {
            id: 'patch-conflict',
            detail: `${step.key} patch failed`,
          },
        ],
        actions,
      };
    }
  }

  const rollout = run(
    'kubectl',
    [
      '--context',
      profile.contextName,
      '-n',
      namespaceName,
      'rollout',
      'status',
      'deployment/redis',
      `--timeout=${Math.ceil(ROLLOUT_TIMEOUT_MS / 1000)}s`,
    ],
    { timeoutMs: ROLLOUT_TIMEOUT_MS + 5_000 },
  );
  actions.push({ op: 'verify-rollout' });
  if (!rollout.ok) {
    return {
      ...plan,
      ok: false,
      mutated: true,
      refusals: [
        { id: 'rollout-failed', detail: 'redis deployment rollout failed' },
      ],
      actions,
    };
  }

  const finalObservations = observe({ run });
  const ready = assessRedisReadyState(profileId, finalObservations, desired);
  actions.push({ op: 'verify-readiness' });
  if (!ready.ok) {
    return {
      ...plan,
      ok: false,
      mutated: true,
      refusals: [
        { id: 'readiness-failed', detail: ready.detail ?? 'redis not ready' },
      ],
      actions,
    };
  }

  return { ...plan, ok: true, mutated: true, actions };
}
