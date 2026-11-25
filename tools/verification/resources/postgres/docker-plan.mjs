import { randomBytes } from 'node:crypto';
import { readFileSync, statfsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  TEMPORAL_IMAGE_PIN_KEYS,
  parsePins,
} from '../../../../infra/platform/common/pins.mjs';

export const VERIFY_RUN_LABEL = 'offscreen.verify.run';
export const VERIFY_DATABASE_NAME = 'offscreen_db_test';
export const VERIFY_ADMIN_ROLE = 'verify_admin';
export const VERIFY_RUNTIME_ROLE = 'verify_runtime';

export const HEADROOM_BYTES = 2 * 1024 ** 3;
export const MIN_DISK_FREE_BYTES = 2 * 1024 ** 3;
export const TMPFS_DATA_MIB = 256;

/** Closed Docker profiles for VER02; replicated/dual-replicated belong to CNPG adapters. */
export const POSTGRES_DOCKER_PROFILES = Object.freeze({
  single: Object.freeze({
    memoryMiB: 768,
    cpus: 1,
    maxConnections: 100,
    tmpfsDataMiB: TMPFS_DATA_MIB,
  }),
  constrained: Object.freeze({
    memoryMiB: 384,
    cpus: 0.5,
    maxConnections: 20,
    tmpfsDataMiB: TMPFS_DATA_MIB,
  }),
});

const moduleDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = join(moduleDir, '../../../..');

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function refuseDockerEnvOverrides(env = process.env) {
  if (env.DOCKER_HOST || env.DOCKER_CONTEXT || env.DOCKER_TLS_VERIFY) {
    return {
      ok: false,
      reason: 'docker-endpoint-override',
      message: 'Docker endpoint override refused',
    };
  }
  if (env.DATABASE_URL) {
    return {
      ok: false,
      reason: 'database-url-reuse',
      message: 'DATABASE_URL reuse refused',
    };
  }
  return { ok: true };
}

/**
 * @param {string} text
 */
export function parseMemAvailableBytes(text) {
  const match = String(text ?? '').match(/^MemAvailable:\s+(\d+)\s+kB/im);
  if (!match) return null;
  return Number.parseInt(match[1], 10) * 1024;
}

/**
 * @param {string} path
 */
export function readPathFreeBytes(path) {
  try {
    const stats = statfsSync(path);
    return Number(stats.bsize) * Number(stats.bavail);
  } catch {
    return null;
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
 * @typedef {{
 *   ok: boolean,
 *   stdout: string,
 *   stderr?: string,
 * }} CommandResult
 */

/**
 * @param {CommandResult} active
 * @param {CommandResult} endpointResult
 * @param {string} [platform]
 */
export function validateLocalDockerContext(
  active,
  endpointResult,
  platform = process.platform,
) {
  const contextName = active.stdout.trim();
  if (!active.ok || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(contextName)) {
    return {
      ok: false,
      reason: 'docker-context-unavailable',
      contextName: null,
    };
  }
  let endpoint;
  try {
    endpoint = endpointResult.ok ? JSON.parse(endpointResult.stdout) : null;
  } catch {
    endpoint = null;
  }
  if (typeof endpoint !== 'string') {
    return { ok: false, reason: 'docker-endpoint-unreadable', contextName };
  }
  const isUnix = endpoint.startsWith('unix:///');
  const isNpipe = endpoint.startsWith('npipe://');
  if (platform === 'linux' || platform === 'android') {
    if (!isUnix) {
      return {
        ok: false,
        reason: 'docker-endpoint-not-local',
        contextName,
        endpoint,
      };
    }
  } else if (!isUnix && !isNpipe) {
    return {
      ok: false,
      reason: 'docker-endpoint-not-local',
      contextName,
      endpoint,
    };
  }
  return { ok: true, contextName, endpoint };
}

/**
 * @param {{
 *   readFile?: (path: string) => string,
 *   repoRoot?: string,
 * }} [deps]
 */
export function loadPinnedPostgresImage(deps = {}) {
  const repoRoot = deps.repoRoot ?? defaultRepoRoot;
  const readFile = deps.readFile ?? ((path) => readFileSync(path, 'utf8'));
  const pinPath = join(repoRoot, 'infra/platform/temporal/images.pin');
  const pins = parsePins(readFile(pinPath), TEMPORAL_IMAGE_PIN_KEYS);
  return {
    image: pins.POSTGRES_IMAGE,
    digest: pins.POSTGRES_DIGEST,
  };
}

/**
 * Normalize docker image inspect Id to bare sha256 hex.
 * @param {string} raw
 */
export function normalizeImageId(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  if (value.startsWith('sha256:'))
    return value.slice('sha256:'.length).toLowerCase();
  return value.toLowerCase();
}

/**
 * @param {{
 *   image: string,
 *   live: boolean,
 *   run: (command: string, args: string[]) => CommandResult,
 * }} input
 */
export function resolvePinnedPostgresImageId({ image, live, run }) {
  const inspect = run('docker', [
    'image',
    'inspect',
    image,
    '--format',
    '{{json .Id}}',
  ]);
  if (inspect.ok) {
    try {
      const parsed = JSON.parse(inspect.stdout);
      const imageId = normalizeImageId(
        typeof parsed === 'string' ? parsed : '',
      );
      if (imageId) {
        return { ok: true, image, imageId, pulled: false };
      }
    } catch {
      /* fall through */
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
 * @param {string} runId
 * @param {() => Buffer} [random]
 */
export function generatePostgresResourceIdentity(
  runId,
  random = () => randomBytes(32),
) {
  const suffix = randomBytes(8).toString('hex');
  return {
    runId,
    containerName: `offscreen-verify-pg-${suffix}`,
    labels: { [VERIFY_RUN_LABEL]: runId },
    database: VERIFY_DATABASE_NAME,
    adminRole: VERIFY_ADMIN_ROLE,
    runtimeRole: VERIFY_RUNTIME_ROLE,
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
export function planPostgresDockerResource(options) {
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

  const envGate = refuseDockerEnvOverrides(env);
  if (!envGate.ok) return envGate;

  const profileSpec = POSTGRES_DOCKER_PROFILES[profile];
  if (!profileSpec) {
    return {
      ok: false,
      reason: 'unsupported-profile',
      message: `unsupported postgres docker profile: ${profile}`,
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

  const pin = loadPinnedPostgresImage();
  const image = resolvePinnedPostgresImageId({
    image: pin.image,
    live,
    run,
  });
  if (!image.ok) return image;

  const identity = generatePostgresResourceIdentity(runId, random);

  return {
    ok: true,
    plan: {
      schemaVersion: 1,
      kind: 'postgres',
      profile,
      live,
      runId,
      dockerContext: context.contextName,
      image: image.image,
      imageId: image.imageId,
      imagePulled: image.pulled,
      containerName: identity.containerName,
      labels: identity.labels,
      database: identity.database,
      adminRole: identity.adminRole,
      runtimeRole: identity.runtimeRole,
      limits: {
        memoryMiB: profileSpec.memoryMiB,
        cpus: profileSpec.cpus,
        maxConnections: profileSpec.maxConnections,
        tmpfsDataMiB: profileSpec.tmpfsDataMiB,
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

/**
 * @param {{
 *   containerId: string,
 *   plan: { runId: string, imageId: string, labels: Record<string, string> },
 *   run: (command: string, args: string[]) => CommandResult,
 * }} input
 */
export function assertOwnedContainerIdentity({ containerId, plan, run }) {
  if (!containerId || !/^[a-f0-9]{12,64}$/i.test(containerId)) {
    return { ok: false, reason: 'foreign-container-id' };
  }
  const inspect = run('docker', [
    'inspect',
    containerId,
    '--format',
    '{{json .}}',
  ]);
  if (!inspect.ok) {
    return { ok: false, reason: 'container-unreadable' };
  }
  let rows;
  try {
    rows = JSON.parse(inspect.stdout);
  } catch {
    return { ok: false, reason: 'container-unreadable' };
  }
  const info = Array.isArray(rows) ? rows[0] : rows;
  if (!info) {
    return { ok: false, reason: 'container-unreadable' };
  }
  const labels = info.Config?.Labels ?? {};
  if (labels[VERIFY_RUN_LABEL] !== plan.runId) {
    return { ok: false, reason: 'foreign-run-label' };
  }
  const observedId = normalizeImageId(info.Image);
  const expectedId = normalizeImageId(plan.imageId);
  if (
    !observedId ||
    !expectedId ||
    (observedId !== expectedId &&
      !observedId.startsWith(expectedId) &&
      !expectedId.startsWith(observedId))
  ) {
    return { ok: false, reason: 'foreign-image-id' };
  }
  return { ok: true, containerId, runId: plan.runId };
}
