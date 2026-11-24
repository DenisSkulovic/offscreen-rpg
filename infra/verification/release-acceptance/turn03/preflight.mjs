import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTEXT_NAME = 'kind-offscreen-release';
export const CLUSTER_NAME = 'offscreen-release';

export const WEB_IMAGE = 'offscreen-lab-game-web:turn02';
export const API_IMAGE = 'offscreen-lab-app-release-api:turn02';
export const GA_IMAGE = 'offscreen-lab-app-release-ga:turn02';
export const WORKER_IMAGE = 'offscreen-lab-app-release-worker:turn02';

export const RELEASE_IMAGES = Object.freeze({
  web: WEB_IMAGE,
  api: API_IMAGE,
  ga: GA_IMAGE,
  worker: WORKER_IMAGE,
});

const OAUTH_KEYS = Object.freeze([
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'BETTER_AUTH_SECRET',
]);

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(MODULE_DIR, '../../../../..');

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseEnvFileContent(text) {
  /** @type {Record<string, string>} */
  const values = {};
  if (!text) {
    return values;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

/**
 * @param {Record<string, string>} env
 */
export function isOAuthEnvSatisfied(env) {
  for (const key of OAUTH_KEYS) {
    const value = env[key];
    if (!value || value.length === 0) {
      return false;
    }
  }
  return env.BETTER_AUTH_SECRET.length >= 32;
}

/**
 * @param {string} stdout
 * @param {string} name
 */
function lineListContains(stdout, name) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => line === name);
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function defaultRun(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * @param {string} path
 * @returns {string | null}
 */
function defaultReadEnvFile(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/** @param {string} image */
function defaultDockerInspect(image) {
  const result = spawnSync('docker', ['image', 'inspect', image], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout);
    const first = Array.isArray(parsed) ? parsed[0] : null;
    if (!first) {
      return null;
    }
    const digests = first.RepoDigests;
    if (Array.isArray(digests) && digests.length > 0 && typeof digests[0] === 'string') {
      return digests[0];
    }
    if (typeof first.Id === 'string') {
      return first.Id;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @param {{
 *   run?: (cmd: string, args: string[]) => { status: number | null, stdout: string, stderr: string },
 *   readEnvFile?: (path: string) => string | null,
 *   repoRoot?: string,
 *   dockerInspect?: (image: string) => string | null,
 * }} [options]
 */
export async function runTurn03Preflight(options = {}) {
  const run = options.run ?? defaultRun;
  const readEnvFile = options.readEnvFile ?? defaultReadEnvFile;
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
  const dockerInspect = options.dockerInspect ?? defaultDockerInspect;

  /** @type {string[]} */
  const missing = [];

  const ctxResult = run('kubectl', ['config', 'get-contexts', '-o', 'name']);
  const contextPresent =
    ctxResult.status === 0 && lineListContains(ctxResult.stdout, CONTEXT_NAME);
  if (!contextPresent) {
    missing.push('context');
  }

  const kindResult = run('kind', ['get', 'clusters']);
  const clusterPresent =
    kindResult.status === 0 && lineListContains(kindResult.stdout, CLUSTER_NAME);
  if (!clusterPresent) {
    missing.push('cluster');
  }

  const imageNames = [WEB_IMAGE, API_IMAGE, GA_IMAGE, WORKER_IMAGE];
  let imagesPresent = true;
  for (const image of imageNames) {
    if (dockerInspect(image) == null) {
      const probe = run('docker', ['image', 'inspect', image]);
      if (probe.status !== 0) {
        imagesPresent = false;
      }
    }
  }
  if (!imagesPresent) {
    missing.push('images');
  }

  const kubectl = (args) =>
    run('kubectl', ['--context', CONTEXT_NAME, ...args]);

  const gatewayResult = kubectl(['-n', 'lab-edge', 'get', 'gateway', 'lab-edge']);
  const gatewayPresent = gatewayResult.status === 0;
  if (!gatewayPresent) {
    missing.push('gateway');
  }

  const pgResult = kubectl(['-n', 'lab-postgres', 'get', 'secret', 'lab-pg-app']);
  const postgresSecretPresent = pgResult.status === 0;
  if (!postgresSecretPresent) {
    missing.push('postgresSecret');
  }

  const objResult = kubectl(['-n', 'lab-objects', 'get', 'service', 'object-store']);
  const objectStorePresent = objResult.status === 0;
  if (!objectStorePresent) {
    missing.push('objectStore');
  }

  const temporalResult = kubectl([
    '-n',
    'lab-temporal',
    'get',
    'service',
    'temporal-server',
  ]);
  const temporalPresent = temporalResult.status === 0;
  if (!temporalPresent) {
    missing.push('temporal');
  }

  const envPath = resolve(repoRoot, '.env');
  const envRaw = readEnvFile(envPath);
  const envValues = envRaw == null ? {} : parseEnvFileContent(envRaw);
  const oauthEnvPresent = isOAuthEnvSatisfied(envValues);
  if (!oauthEnvPresent) {
    missing.push('oauthEnv');
  }

  /** @type {string | null} */
  let blockedReason = null;
  if (missing.length > 0) {
    const parts = [];
    if (missing.includes('oauthEnv')) {
      parts.push(
        'GitHub OAuth auth prerequisites missing in root .env (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, BETTER_AUTH_SECRET with length >= 32)',
      );
    }
    const infraMissing = missing.filter((m) => m !== 'oauthEnv');
    if (infraMissing.length > 0) {
      parts.push(`Lab release infrastructure checks failed: ${infraMissing.join(', ')}`);
    }
    blockedReason = parts.join('; ');
  }

  const shaResult = run('git', ['rev-parse', 'HEAD']);
  const sourceSha =
    shaResult.status === 0 ? shaResult.stdout.trim() || null : null;

  /** @type {Record<string, string>} */
  const imageDigests = {};
  for (const image of imageNames) {
    const digest = dockerInspect(image);
    if (digest != null) {
      imageDigests[image] = digest;
    }
  }

  return {
    contextName: CONTEXT_NAME,
    clusterName: CLUSTER_NAME,
    images: { ...RELEASE_IMAGES },
    checks: {
      contextPresent,
      clusterPresent,
      imagesPresent,
      gatewayPresent,
      postgresSecretPresent,
      objectStorePresent,
      temporalPresent,
      oauthEnvPresent,
    },
    missing,
    blockedReason,
    sourceSha,
    imageDigests,
    runAllowed: false,
  };
}