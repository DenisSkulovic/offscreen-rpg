#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  readPlatformObject,
  runPlatformCommand,
} from '../../platform/common/commands.mjs';
import { readPlatformProfile } from '../../platform/common/profile.mjs';

const PROFILE_ID = 'release';
const LAB_LABEL_KEY = 'offscreen.rpg/lab';
const LAB_LABEL_VALUE = 'disposable';
const APP_NAMESPACES = Object.freeze([
  'lab-edge',
  'lab-authority',
  'lab-workers',
]);
const REQUIRED_ENV_KEYS = Object.freeze([
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'BETTER_AUTH_SECRET',
]);
const MIN_AUTH_SECRET_LENGTH = 32;
const TOKEN_KEYS = Object.freeze([
  'game-authority-service-token',
  'game-authority-control-token',
  'game-authority-executor-token',
]);
const RUNTIME_DETERMINISTIC_KEYS = Object.freeze([
  'access-key-id',
  'secret-access-key',
  'better-auth-secret',
  'github-client-id',
  'github-client-secret',
]);
const GAME_DB_NAME = 'game-db';
const GAME_RUNTIME_NAME = 'game-runtime';
const BACKING_PG_SECRET = 'lab-pg-app';
const BACKING_S3_SECRET = 'object-store-s3';
const GATEWAY_NAME = 'lab-edge';
const TOKEN_PATTERN = /^[0-9a-f]{48}$/;

/**
 * @param {string} repoRoot
 */
export function parseRootDotEnv(repoRoot) {
  /** @type {Record<string, string>} */
  const values = {};
  const path = join(repoRoot, '.env');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return values;
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
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
 * @param {Record<string, string>} localEnv
 * @returns {{ GITHUB_CLIENT_ID: string, GITHUB_CLIENT_SECRET: string, BETTER_AUTH_SECRET: string }}
 */
export function assertApprovedLocalEnv(localEnv) {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !localEnv[key]);
  if (missing.length > 0) {
    throw credentialRefusal(
      `root .env is missing ${missing.join(', ')}. Copy .env.example and set the local GitHub OAuth app values. Do not commit .env.`,
    );
  }
  if (localEnv.BETTER_AUTH_SECRET.length < MIN_AUTH_SECRET_LENGTH) {
    throw credentialRefusal(
      'BETTER_AUTH_SECRET in .env must be at least 32 characters.',
    );
  }
  return {
    GITHUB_CLIENT_ID: localEnv.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: localEnv.GITHUB_CLIENT_SECRET,
    BETTER_AUTH_SECRET: localEnv.BETTER_AUTH_SECRET,
  };
}

/**
 * @param {string} message
 */
function credentialRefusal(message) {
  return Object.assign(new Error(message), { credentialRefusal: true });
}

/**
 * @param {object} object
 * @returns {Record<string, string>}
 */
export function decodeSecretStringData(object) {
  /** @type {Record<string, string>} */
  const out = {};
  const data = object?.data ?? {};
  for (const [key, encoded] of Object.entries(data)) {
    if (typeof encoded !== 'string') continue;
    out[key] = Buffer.from(encoded, 'base64').toString('utf8');
  }
  const stringData = object?.stringData ?? {};
  for (const [key, value] of Object.entries(stringData)) {
    if (typeof value !== 'string') continue;
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * @param {object | undefined} metadata
 */
function assertDisposableLabLabel(metadata) {
  const label = metadata?.labels?.[LAB_LABEL_KEY];
  if (label !== LAB_LABEL_VALUE) {
    throw credentialRefusal('foreign or unlabeled release secret');
  }
}

/**
 * @param {string} value
 */
function assertValidRuntimeToken(value) {
  if (!TOKEN_PATTERN.test(value)) {
    throw credentialRefusal('invalid game-runtime token shape');
  }
}

/**
 * @param {Record<string, string>} fields
 * @param {Record<string, string>} expected
 * @param {readonly string[]} keys
 * @returns {string[]}
 */
export function mismatchedFieldNames(fields, expected, keys) {
  /** @type {string[]} */
  const names = [];
  for (const key of keys) {
    if (fields[key] !== expected[key]) names.push(key);
  }
  return names;
}

/**
 * @param {Array<Record<string, string> | null>} snapshots
 * @param {readonly string[]} keys
 * @returns {Record<string, string>}
 */
export function reconcileTokenFields(snapshots, keys) {
  /** @type {Record<string, string>} */
  const chosen = {};
  for (const key of keys) {
    /** @type {Set<string>} */
    const observed = new Set();
    for (const snapshot of snapshots) {
      if (!snapshot?.[key]) continue;
      observed.add(snapshot[key]);
    }
    if (observed.size > 1) {
      throw credentialRefusal(
        `credential field mismatch: ${key}`,
      );
    }
    if (observed.size === 1) {
      const [value] = observed;
      assertValidRuntimeToken(value);
      chosen[key] = value;
    }
  }
  return chosen;
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 * @param {string} namespace
 */
function ensureAppNamespace(run, contextName, namespace) {
  const dry = run('kubectl', [
    '--context',
    contextName,
    'create',
    'namespace',
    namespace,
    '--dry-run=client',
    '-o',
    'yaml',
  ]);
  if (!dry.ok) {
    throw credentialRefusal('could not render release namespace');
  }
  const apply = run(
    'kubectl',
    ['--context', contextName, 'apply', '-f', '-'],
    { input: dry.stdout },
  );
  if (!apply.ok) {
    throw credentialRefusal('could not ensure release namespace');
  }
}

/**
 * @param {typeof runPlatformCommand} run
 * @param {string} contextName
 * @param {string} namespace
 * @param {string} name
 * @param {Record<string, string>} stringData
 */
function createOpaqueSecret(run, contextName, namespace, name, stringData) {
  const manifest = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace,
      labels: { [LAB_LABEL_KEY]: LAB_LABEL_VALUE },
    },
    type: 'Opaque',
    stringData,
  };
  const created = run(
    'kubectl',
    ['--context', contextName, '-n', namespace, 'create', '-f', '-'],
    { input: `${JSON.stringify(manifest)}\n` },
  );
  if (!created.ok) {
    throw credentialRefusal(`could not create secret ${name}`);
  }
  const readBack = readPlatformObject(
    { profileId: PROFILE_ID, resource: 'secret', name, namespace },
    { run },
  );
  if (readBack.state !== 'present') {
    throw credentialRefusal(`secret ${name} unreadable after create`);
  }
  assertDisposableLabLabel(readBack.object?.metadata);
  const uid = readBack.object?.metadata?.uid;
  if (typeof uid !== 'string' || uid.length === 0) {
    throw credentialRefusal(`secret ${name} missing uid after create`);
  }
  return { uid, fields: decodeSecretStringData(readBack.object) };
}

/**
 * @typedef {{
 *   repoRoot: string,
 *   run?: typeof runPlatformCommand,
 *   randomToken?: () => string,
 * }} EnsureReleaseCredentialsInput
 */

/**
 * @param {EnsureReleaseCredentialsInput} input
 */
export function ensureReleaseCredentials(input) {
  const run = input.run ?? runPlatformCommand;
  const rand = input.randomToken ?? (() => randomBytes(24).toString('hex'));
  const profile = readPlatformProfile(PROFILE_ID);
  const approved = assertApprovedLocalEnv(parseRootDotEnv(input.repoRoot));

  const gateway = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'gateway',
      name: GATEWAY_NAME,
      namespace: 'lab-edge',
    },
    { run },
  );
  if (gateway.state !== 'present') {
    throw credentialRefusal('Gateway lab-edge is missing in lab-edge.');
  }
  const gatewayLab = gateway.object?.metadata?.labels?.[LAB_LABEL_KEY];
  if (gatewayLab !== LAB_LABEL_VALUE) {
    throw credentialRefusal('release gateway label mismatch');
  }

  for (const namespace of APP_NAMESPACES) {
    const observed = readPlatformObject(
      { profileId: PROFILE_ID, resource: 'namespace', name: namespace },
      { run },
    );
    if (observed.state === 'unreadable') {
      throw credentialRefusal(`namespace ${namespace} unreadable`);
    }
    if (observed.state === 'present') {
      const lab = observed.object?.metadata?.labels?.[LAB_LABEL_KEY];
      if (lab != null && lab !== LAB_LABEL_VALUE) {
        throw credentialRefusal(`namespace ${namespace} label mismatch`);
      }
    }
    ensureAppNamespace(run, profile.contextName, namespace);
  }

  const pgBacking = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'secret',
      name: BACKING_PG_SECRET,
      namespace: profile.namespaces.postgres,
    },
    { run },
  );
  if (pgBacking.state === 'unreadable') {
    throw credentialRefusal('lab-pg-app unreadable');
  }
  if (pgBacking.state === 'absent') {
    throw credentialRefusal('Secret lab-pg-app is missing in lab-postgres.');
  }
  assertDisposableLabLabel(pgBacking.object?.metadata);
  const backingUri = decodeSecretStringData(pgBacking.object).uri;
  if (!backingUri) {
    throw credentialRefusal('lab-pg-app has no uri.');
  }

  const s3Backing = readPlatformObject(
    {
      profileId: PROFILE_ID,
      resource: 'secret',
      name: BACKING_S3_SECRET,
      namespace: profile.namespaces.objectStorage,
    },
    { run },
  );
  if (s3Backing.state === 'unreadable') {
    throw credentialRefusal('object-store-s3 unreadable');
  }
  if (s3Backing.state === 'absent') {
    throw credentialRefusal('object-store-s3 is missing access keys.');
  }
  assertDisposableLabLabel(s3Backing.object?.metadata);
  const backingS3 = decodeSecretStringData(s3Backing.object);
  if (!backingS3['access-key-id'] || !backingS3['secret-access-key']) {
    throw credentialRefusal('object-store-s3 is missing access keys.');
  }

  /** @type {Map<string, { state: 'absent' } | { state: 'present', uid: string, fields: Record<string, string> } | { state: 'unreadable' }>} */
  const gameDbByNs = new Map();
  /** @type {Map<string, { state: 'absent' } | { state: 'present', uid: string, fields: Record<string, string> } | { state: 'unreadable' }>} */
  const gameRuntimeByNs = new Map();

  for (const namespace of APP_NAMESPACES) {
    for (const [secretName, store] of [
      [GAME_DB_NAME, gameDbByNs],
      [GAME_RUNTIME_NAME, gameRuntimeByNs],
    ]) {
      const read = readPlatformObject(
        {
          profileId: PROFILE_ID,
          resource: 'secret',
          name: secretName,
          namespace,
        },
        { run },
      );
      if (read.state === 'unreadable') {
        store.set(namespace, { state: 'unreadable' });
        continue;
      }
      if (read.state === 'absent') {
        store.set(namespace, { state: 'absent' });
        continue;
      }
      try {
        assertDisposableLabLabel(read.object?.metadata);
      } catch (error) {
        store.set(namespace, { state: 'unreadable' });
        continue;
      }
      const uid = read.object?.metadata?.uid;
      if (typeof uid !== 'string' || uid.length === 0) {
        store.set(namespace, { state: 'unreadable' });
        continue;
      }
      store.set(namespace, {
        state: 'present',
        uid,
        fields: decodeSecretStringData(read.object),
      });
    }
  }

  if (
    [...gameDbByNs.values(), ...gameRuntimeByNs.values()].some(
      (item) => item.state === 'unreadable',
    )
  ) {
    throw credentialRefusal('projected secret unreadable');
  }

  const presentDb = APP_NAMESPACES.map((ns) => {
    const item = gameDbByNs.get(ns);
    return item?.state === 'present' ? item.fields : null;
  });
  for (const fields of presentDb) {
    if (!fields) continue;
    if (fields.uri !== backingUri) {
      throw credentialRefusal('credential field mismatch: uri');
    }
  }

  const presentRuntime = APP_NAMESPACES.map((ns) => {
    const item = gameRuntimeByNs.get(ns);
    return item?.state === 'present' ? item.fields : null;
  });
  const runtimeTokens = reconcileTokenFields(presentRuntime, TOKEN_KEYS);

  /** @type {Record<string, string>} */
  const canonicalRuntime = {
    'access-key-id': backingS3['access-key-id'],
    'secret-access-key': backingS3['secret-access-key'],
    'better-auth-secret': approved.BETTER_AUTH_SECRET,
    'github-client-id': approved.GITHUB_CLIENT_ID,
    'github-client-secret': approved.GITHUB_CLIENT_SECRET,
  };
  for (const key of TOKEN_KEYS) {
    if (runtimeTokens[key]) {
      canonicalRuntime[key] = runtimeTokens[key];
    } else {
      canonicalRuntime[key] = rand();
    }
  }

  for (const fields of presentRuntime) {
    if (!fields) continue;
    const mismatch = mismatchedFieldNames(
      fields,
      canonicalRuntime,
      [...RUNTIME_DETERMINISTIC_KEYS, ...TOKEN_KEYS],
    );
    if (mismatch.length > 0) {
      throw credentialRefusal(
        `credential field mismatch: ${mismatch.join(', ')}`,
      );
    }
  }

  const canonicalDatabase = { uri: backingUri };

  /** @type {Array<'kubectl'>} */
  const mutations = [];

  for (const namespace of APP_NAMESPACES) {
    const db = gameDbByNs.get(namespace);
    const rt = gameRuntimeByNs.get(namespace);

    if (db?.state === 'absent') {
      createOpaqueSecret(
        run,
        profile.contextName,
        namespace,
        GAME_DB_NAME,
        canonicalDatabase,
      );
      mutations.push('kubectl');
    }

    if (rt?.state === 'absent') {
      createOpaqueSecret(
        run,
        profile.contextName,
        namespace,
        GAME_RUNTIME_NAME,
        canonicalRuntime,
      );
      mutations.push('kubectl');
    }
  }

  return {
    ok: true,
    mutations: mutations.length,
    database: canonicalDatabase,
    runtimeFieldNames: Object.keys(canonicalRuntime),
  };
}

function main() {
  const repoRoot =
    process.env.OFFSCREEN_REPO_ROOT ??
    join(fileURLToPath(new URL('.', import.meta.url)), '../../..');
  try {
    const receipt = ensureReleaseCredentials({ repoRoot });
    if (receipt.mutations > 0) {
      process.stderr.write('Release credentials prepared.\n');
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Refusing install: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}