import { createHash } from 'node:crypto';
import {
  assertPlatformTarget,
  runPlatformCommand,
} from '../common/commands.mjs';
import { observeRedis } from './observations.mjs';

export const REDIS_CONFIG_HASH_ANNOTATION = 'offscreen.rpg/redis-config-sha256';
const REDIS_CONFIG_KEY = 'redis.conf';

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @param {object | undefined} spec
 */
export function serviceShapeCompatible(spec) {
  if (spec?.type !== 'ClusterIP') {
    return false;
  }
  if (!deepEqual(spec?.selector, { app: 'redis' })) {
    return false;
  }
  const ports = Array.isArray(spec?.ports) ? spec.ports : [];
  if (ports.length !== 1) {
    return false;
  }
  const port = ports[0];
  return (
    port?.name === 'redis' &&
    port?.protocol === 'TCP' &&
    port?.port === 6379 &&
    port?.targetPort === 'redis'
  );
}

/**
 * @param {object | undefined} data
 */
export function redisConfigSha256(data) {
  const conf = data?.[REDIS_CONFIG_KEY] ?? '';
  return createHash('sha256').update(String(conf)).digest('hex');
}

/**
 * @param {object | undefined} deployment
 * @param {string | null | undefined} configSha256
 */
function deploymentConfigHashMatches(deployment, configSha256) {
  const annotations = deployment?.spec?.template?.metadata?.annotations ?? {};
  const annotation = annotations[REDIS_CONFIG_HASH_ANNOTATION];
  if (annotation == null || annotation === '') {
    return { required: false, ok: true };
  }
  if (typeof configSha256 !== 'string' || configSha256.length === 0) {
    return { required: true, ok: false };
  }
  return { required: true, ok: annotation === configSha256 };
}

/**
 * @param {object | undefined} deployment
 */
export function deploymentRolloutReady(deployment) {
  if (deployment?.spec?.replicas !== 1) {
    return false;
  }
  const generation = deployment?.metadata?.generation;
  const observed = deployment?.status?.observedGeneration;
  if (
    generation == null ||
    observed == null ||
    Number(observed) < Number(generation)
  ) {
    return false;
  }
  const status = deployment?.status ?? {};
  return (
    status.updatedReplicas === 1 &&
    status.readyReplicas === 1 &&
    status.availableReplicas === 1
  );
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {ReturnType<typeof observeRedis>} observations
 * @param {{ configMap?: object, deployment?: object }} [rendered]
 */
export function assessRedisReadyState(profileId, observations, rendered = {}) {
  if (observations.deployment?.state === 'unreadable') {
    return {
      ok: false,
      detail: `redis deployment unreadable: ${observations.deployment.reason}`,
    };
  }
  if (observations.service?.state === 'unreadable') {
    return {
      ok: false,
      detail: `redis service unreadable: ${observations.service.reason}`,
    };
  }
  if (observations.configMap?.state === 'unreadable') {
    return {
      ok: false,
      detail: `redis config unreadable: ${observations.configMap.reason}`,
    };
  }
  if (
    observations.deployment.state === 'absent' &&
    observations.service.state === 'absent' &&
    observations.configMap.state === 'absent'
  ) {
    return { ok: false, detail: 'redis deployment and service are absent' };
  }
  if (observations.namespace?.state !== 'present') {
    return { ok: false, detail: 'redis namespace is not installed' };
  }
  if (observations.namespace.classification !== 'owned') {
    return { ok: false, detail: 'redis resources are foreign-owned' };
  }
  const required = ['deployment', 'service', 'configMap'];
  for (const key of required) {
    const item = observations[key];
    if (item.state !== 'present') {
      return {
        ok: false,
        detail: 'redis deployment or service is not installed',
      };
    }
    if (item.classification !== 'owned') {
      return { ok: false, detail: 'redis resources are foreign-owned' };
    }
  }
  const deployment = observations.deployment.object;
  const service = observations.service.object;
  const configMap = observations.configMap.object;
  if (!deploymentRolloutReady(deployment)) {
    return { ok: false, detail: 'redis deployment is not ready' };
  }
  if (!serviceShapeCompatible(service?.spec)) {
    return { ok: false, detail: 'redis service is not ClusterIP' };
  }
  if (!configMap?.data?.[REDIS_CONFIG_KEY]) {
    return { ok: false, detail: 'redis configuration is missing' };
  }
  const liveHash = redisConfigSha256(configMap.data);
  const renderedHash = rendered.configMap
    ? redisConfigSha256(rendered.configMap.data)
    : null;
  const renderedDeployment = rendered.deployment ?? null;
  if (renderedDeployment) {
    const expectedAnnotation =
      renderedDeployment.spec?.template?.metadata?.annotations?.[
        REDIS_CONFIG_HASH_ANNOTATION
      ];
    if (
      expectedAnnotation != null &&
      expectedAnnotation !== '' &&
      expectedAnnotation !== renderedHash
    ) {
      return {
        ok: false,
        detail: 'rendered redis config hash does not match config data',
      };
    }
  }
  const hashCheck = deploymentConfigHashMatches(deployment, liveHash);
  if (hashCheck.required && !hashCheck.ok) {
    return { ok: false, detail: 'redis deployment config hash is stale' };
  }
  return { ok: true };
}

/**
 * @param {'dev' | 'release'} profileId
 * @param {{ run?: typeof runPlatformCommand }} [deps]
 */
export function observeRedisReady(profileId, deps = {}) {
  const run = deps.run ?? runPlatformCommand;
  try {
    assertPlatformTarget(profileId, { run });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: message };
  }
  const observations = observeRedis(profileId, { run });
  return assessRedisReadyState(profileId, observations);
}
