import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import {
  HEADROOM_BYTES,
  MIN_DISK_FREE_BYTES,
  VERIFY_RUN_LABEL,
  assertOwnedContainerIdentity,
  normalizeImageId,
  parseMemAvailableBytes,
  readPathFreeBytes,
  refuseDockerEnvOverrides,
  validateLocalDockerContext,
} from '../postgres/docker-plan.mjs';

export { VERIFY_RUN_LABEL, assertOwnedContainerIdentity, normalizeImageId };

export const REDIS_IMAGE_PIN = 'redis:8.2.1-alpine';
export const REDIS_IMAGE_ALIASES = Object.freeze([
  REDIS_IMAGE_PIN,
  `docker.io/library/${REDIS_IMAGE_PIN}`,
]);

export const VERIFY_ADMIN_USER = 'verify_admin';
export const VERIFY_RUNTIME_USER = 'verify_runtime';

export const TMPFS_DATA_MIB = 32;
export const MAXMEMORY_MIB_SINGLE = 8;

/** Closed Docker profiles for VER06; noeviction is an explicit diagnostic extension. */
export const REDIS_DOCKER_PROFILES = Object.freeze({
  single: Object.freeze({
    memoryMiB: 128,
    cpus: 0.5,
    tmpfsDataMiB: TMPFS_DATA_MIB,
    maxmemoryMiB: MAXMEMORY_MIB_SINGLE,
    maxmemoryPolicy: 'allkeys-lru',
  }),
  'constrained-noeviction': Object.freeze({
    memoryMiB: 128,
    cpus: 0.5,
    tmpfsDataMiB: TMPFS_DATA_MIB,
    maxmemoryMiB: MAXMEMORY_MIB_SINGLE,
    maxmemoryPolicy: 'noeviction',
  }),
});

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function refuseRedisEnvOverrides(env = process.env) {
  const base = refuseDockerEnvOverrides(env);
  if (!base.ok) return base;
  if (typeof env.REDIS_URL === 'string' && env.REDIS_URL.length > 0) {
    return {
      ok: false,
      reason: 'redis-url-reuse',
      message: 'REDIS_URL reuse refused',
    };
  }
  return { ok: true };
}

/**
 * @typedef {{
 *   ok: boolean,
 *   stdout: string,
 *   stderr?: string,
 * }} CommandResult
 */

/**
 * @param {{
 *   image: string,
 *   live: boolean,
 *   run: (command: string, args: string[]) => CommandResult,
 * }} input
 */
export function resolvePinnedRedisImageId({ image, live, run }) {
  for (const candidate of REDIS_IMAGE_ALIASES) {
    const ref = candidate === image ? image : candidate;
    const inspect = run('docker', [
      'image',
      'inspect',
      ref,
      '--format',
      '{{json .Id}}',
    ]);
    if (!inspect.ok) continue;
    try {
      const parsed = JSON.parse(inspect.stdout);
      const imageId = normalizeImageId(
        typeof parsed === 'string' ? parsed : '',
      );
      if (imageId) {
        return { ok: true, image: ref, imageId, pulled: false };
      }
    } catch {
      /* try next alias */
    }
  }
  if (!live) {
    return {
      ok: false,
      reason: 'image-not-local',
      message: `pinned image ${image} is not available locally`,
    };
  }
  const pull = run('docker', ['pull', image]);
  if (!pull.ok) {
    return {
      ok: false,
      reason: 'image-pull-failed',
      message: `failed to pull pinned image ${image}`,
    };
  }
  const afterPull = run('docker', [
    'image',
    'inspect',
    image,
    '--format',
    '{{json .Id}}',
  ]);
  if (!afterPull.ok) {
    return {
      ok: false,
      reason: 'image-inspect-failed',
      message: `pinned image ${image} unreadable after pull`,
    };
  }
  try {
    const parsed = JSON.parse(afterPull.stdout);
    const imageId = normalizeImageId(typeof parsed === 'string' ? parsed : '');
    if (!imageId) {
      return { ok: false, reason: 'image-id-unavailable' };
    }
    return { ok: true, image, imageId, pulled: true };
  } catch {
    return { ok: false, reason: 'image-id-unavailable' };
  }
}

/**
 * @param {string} stdout
 */
function parseDockerRootDir(stdout) {
  const line = String(stdout ?? '')
    .split('\n')
    .map((row) => row.trim())
    .find(Boolean);
  return line && line !== '/' ? line : '/';
}

/**
 * @param {string} runId
 * @param {() => Buffer} [random]
 */
export function generateRedisResourceIdentity(
  runId,
  random = () => randomBytes(32),
) {
  const suffix = randomBytes(8).toString('hex');
  const keyNamespace = `offscreen:verify:${runId}`;
  return {
    runId,
    containerName: `offscreen-verify-redis-${suffix}`,
    labels: { [VERIFY_RUN_LABEL]: runId },
    keyNamespace,
    adminUser: VERIFY_ADMIN_USER,
    runtimeUser: VERIFY_RUNTIME_USER,
    credentials: {
      adminPassword: random().toString('hex'),
      runtimePassword: random().toString('hex'),
    },
  };
}

/**
 * @param {{
 *   profile: string,
 *   runId?: string,
 *   live?: boolean,
 *   env?: NodeJS.ProcessEnv,
 *   run?: (command: string, args: string[]) => CommandResult,
 *   readMeminfo?: () => string,
 *   readDiskFree?: (path: string) => number | null,
 *   random?: () => Buffer,
 *   platform?: string,
 * }} options
 */
export function planRedisDockerResource(options) {
  const {
    profile,
    runId = randomBytes(8).toString('hex'),
    live = false,
    env = process.env,
    run = () => ({ ok: false, stdout: '', stderr: 'run adapter missing' }),
    readMeminfo = () => readFileSync('/proc/meminfo', 'utf8'),
    readDiskFree = readPathFreeBytes,
    random,
    platform = process.platform,
  } = options;

  const envGate = refuseRedisEnvOverrides(env);
  if (!envGate.ok) return envGate;

  const profileSpec = REDIS_DOCKER_PROFILES[profile];
  if (!profileSpec) {
    return {
      ok: false,
      reason: 'unsupported-profile',
      message: `unsupported redis docker profile: ${profile}`,
    };
  }

  const active = run('docker', ['context', 'show']);
  const contextName = active.stdout.trim();
  const endpointResult = run('docker', [
    'context',
    'inspect',
    contextName,
    '--format',
    '{{json .Endpoints.docker.Host}}',
  ]);
  const context = validateLocalDockerContext(active, endpointResult, platform);
  if (!context.ok) return context;

  const info = run('docker', ['info', '--format', '{{.DockerRootDir}}']);
  if (!info.ok) {
    return { ok: false, reason: 'docker-info-unavailable' };
  }

  const memAvailable = parseMemAvailableBytes(readMeminfo());
  const requiredBytes = profileSpec.memoryMiB * 1024 ** 2 + HEADROOM_BYTES;
  if (memAvailable == null || memAvailable < requiredBytes) {
    return {
      ok: false,
      reason: 'insufficient-memory',
      memAvailableBytes: memAvailable,
      requiredBytes,
    };
  }

  const dockerRoot = parseDockerRootDir(info.stdout);
  const diskFree = readDiskFree(dockerRoot);
  if (diskFree == null || diskFree < MIN_DISK_FREE_BYTES) {
    return {
      ok: false,
      reason: 'insufficient-disk',
      diskFreeBytes: diskFree,
      requiredBytes: MIN_DISK_FREE_BYTES,
    };
  }

  const image = resolvePinnedRedisImageId({
    image: REDIS_IMAGE_PIN,
    live,
    run,
  });
  if (!image.ok) return image;

  const identity = generateRedisResourceIdentity(runId, random);

  return {
    ok: true,
    plan: {
      schemaVersion: 1,
      kind: 'redis',
      profile,
      live,
      runId,
      dockerContext: context.contextName,
      image: image.image,
      imageId: image.imageId,
      imagePulled: image.pulled,
      containerName: identity.containerName,
      labels: identity.labels,
      keyNamespace: identity.keyNamespace,
      adminUser: identity.adminUser,
      runtimeUser: identity.runtimeUser,
      limits: {
        memoryMiB: profileSpec.memoryMiB,
        cpus: profileSpec.cpus,
        tmpfsDataMiB: profileSpec.tmpfsDataMiB,
        maxmemoryMiB: profileSpec.maxmemoryMiB,
        maxmemoryPolicy: profileSpec.maxmemoryPolicy,
      },
      preflight: {
        memAvailableBytes: memAvailable,
        requiredMemoryBytes: requiredBytes,
        diskFreeBytes: diskFree,
        dockerRoot,
      },
      credentials: identity.credentials,
    },
  };
}
