import { readPlatformObject, runPlatformCommand } from '../common/commands.mjs';
import { readPlatformProfile } from '../common/profile.mjs';

const REDIS_DEPLOYMENT_NAME = 'redis';
const REDIS_SERVICE_NAME = 'redis';
const REDIS_CONFIGMAP_NAME = 'redis-config';

const CHILD_KEYS = ['deployment', 'service', 'configMap'];

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
 * @param {'dev' | 'release'} profileId
 * @param {object | undefined} object
 */
export function classifyRedisObject(profileId, object) {
  if (!object) return 'absent';
  const profile = readPlatformProfile(profileId);
  const owner = object.metadata?.labels?.[ownerLabelKey(profileId)];
  if (owner !== profile.ownerValue) return 'foreign';
  return 'owned';
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {ReturnType<typeof readPlatformObject>} result
 */
function toKindState(profileId, result) {
  if (result.state === 'unreadable') {
    return { state: 'unreadable', reason: result.reason };
  }
  if (result.state === 'absent') {
    return { state: 'absent' };
  }
  return {
    state: 'present',
    classification: classifyRedisObject(profileId, result.object),
    object: result.object,
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeRedis(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  const namespace = redisNamespaceForProfile(profileId);
  return {
    namespace: toKindState(
      profileId,
      readPlatformObject(
        { profileId, resource: 'namespace', name: namespace },
        { run },
      ),
    ),
    deployment: toKindState(
      profileId,
      readPlatformObject(
        {
          profileId,
          resource: 'deployment',
          name: REDIS_DEPLOYMENT_NAME,
          namespace,
        },
        { run },
      ),
    ),
    service: toKindState(
      profileId,
      readPlatformObject(
        {
          profileId,
          resource: 'service',
          name: REDIS_SERVICE_NAME,
          namespace,
        },
        { run },
      ),
    ),
    configMap: toKindState(
      profileId,
      readPlatformObject(
        {
          profileId,
          resource: 'configmap',
          name: REDIS_CONFIGMAP_NAME,
          namespace,
        },
        { run },
      ),
    ),
  };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {ReturnType<typeof observeRedis>} observations
 */
export function planRedisInstall(profileId, observations) {
  const profile = readPlatformProfile(profileId);
  const namespaceName = redisNamespaceForProfile(profileId);
  /** @type {{ id: string, detail: string }[]} */
  const refusals = [];

  if (!observations || typeof observations !== 'object') {
    refusals.push({
      id: 'missing-observation',
      detail: 'redis observations are missing',
    });
    return {
      mode: 'plan',
      readOnly: true,
      context: profile.contextName,
      namespace: namespaceName,
      refusals,
      actions: [],
      ok: false,
    };
  }

  for (const key of ['namespace', ...CHILD_KEYS]) {
    const item = observations[key];
    if (!item || typeof item !== 'object' || typeof item.state !== 'string') {
      refusals.push({
        id: `${key}-missing-observation`,
        detail: `${key} observation is missing`,
      });
    }
  }

  if (observations.namespace?.state === 'unreadable') {
    refusals.push({
      id: 'namespace-unreadable',
      detail: observations.namespace.reason ?? 'namespace unreadable',
    });
  } else if (
    observations.namespace?.state === 'present' &&
    observations.namespace.classification === 'foreign'
  ) {
    refusals.push({
      id: 'namespace-foreign',
      detail: `namespace ${namespaceName} has a foreign owner label`,
    });
  }

  if (
    observations.namespace?.state === 'absent' &&
    CHILD_KEYS.some((key) => observations[key]?.state === 'present')
  ) {
    refusals.push({
      id: 'inconsistent-observation',
      detail: `namespace ${namespaceName} is absent but child resources are present`,
    });
  }

  for (const key of CHILD_KEYS) {
    const item = observations[key];
    if (!item || typeof item.state !== 'string') {
      continue;
    }
    if (item.state === 'unreadable') {
      refusals.push({
        id: `${key}-unreadable`,
        detail: item.reason ?? `${key} unreadable`,
      });
    } else if (item.state === 'present' && item.classification === 'foreign') {
      refusals.push({
        id: `${key}-foreign`,
        detail: `${key} redis is foreign-owned`,
      });
    }
  }

  /** @type {{ op: string }[]} */
  const actions = [];
  if (refusals.length === 0) {
    if (
      observations.namespace.state === 'absent' ||
      observations.namespace.state === 'present'
    ) {
      actions.push({ op: 'ensure-namespace' });
    }
    actions.push({ op: 'apply-redis' });
    actions.push({ op: 'verify-rollout' });
    actions.push({ op: 'verify-service' });
  }

  return {
    mode: 'plan',
    readOnly: true,
    context: profile.contextName,
    namespace: namespaceName,
    refusals,
    actions,
    ok: refusals.length === 0,
  };
}
